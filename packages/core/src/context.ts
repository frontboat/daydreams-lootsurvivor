import { z, type ZodRawShape } from "zod/v4";
import type {
  AnyAction,
  AnyAgent,
  AnyContext,
  AnyRef,
  Context,
  ContextConfig,
  ContextSettings,
  ContextState,
  InferSchemaArguments,
  Log,
  WorkingMemory,
  IMemoryManager,
  AgentContext,
  ThoughtRef,
} from "./types";
import { formatContextLog } from "./formatters";
import { memory } from "./utils";
import { LogEventType, StructuredLogger } from "./logging-events";

/**
 * Creates a context configuration
 * @template Memory - Type of working memory
 * @template Args - Zod schema type for context arguments
 * @template Ctx - Type of context data
 * @template Exports - Type of exported data
 * @param ctx - Context configuration object
 * @returns Typed context configuration
 */

export function context<
  TMemory = any,
  Args extends z.ZodTypeAny | ZodRawShape = any,
  Ctx = any,
  Actions extends AnyAction[] = AnyAction[],
  Events extends Record<string, z.ZodTypeAny | z.ZodRawShape> = Record<
    string,
    z.ZodTypeAny | z.ZodRawShape
  >
>(
  config: ContextConfig<TMemory, Args, Ctx, Actions, Events>
): Context<TMemory, Args, Ctx, Actions, Events> {
  const ctx: Context<TMemory, Args, Ctx, Actions, Events> = {
    ...config,
    setActions(actions) {
      Object.assign(ctx, { actions });
      return ctx as any;
    },
    setInputs(inputs) {
      ctx.inputs = inputs;
      return ctx;
    },
    setOutputs(outputs) {
      ctx.outputs = outputs;
      return ctx;
    },
    use(composer) {
      ctx.__composers = ctx.__composers?.concat(composer) ?? [composer];
      return ctx;
    },
  };

  return ctx;
}

/**
 * Retrieves and sorts working memory logs
 * @param memory - Working memory object
 * @param includeThoughts - Whether to include thought logs (default: true)
 * @returns Sorted array of memory logs
 */
export function getWorkingMemoryLogs(
  memory: Partial<WorkingMemory>,
  includeThoughts = true
): Log[] {
  return [
    ...(memory.inputs ?? []),
    ...(memory.outputs ?? []),
    ...(memory.calls ?? []),
    ...((includeThoughts ? memory.thoughts : undefined) ?? []),
    ...(memory.results ?? []),
    ...(memory.events ?? []),
  ].sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));
}

export function getWorkingMemoryAllLogs(
  memory: Partial<WorkingMemory>,
  includeThoughts = true
): AnyRef[] {
  return [
    ...(memory.inputs ?? []),
    ...(memory.outputs ?? []),
    ...(memory.calls ?? []),
    ...((includeThoughts ? memory.thoughts : undefined) ?? []),
    ...(memory.results ?? []),
    ...(memory.events ?? []),
    ...(memory.steps ?? []),
    ...(memory.runs ?? []),
  ].sort((a, b) => (a.timestamp >= b.timestamp ? 1 : -1));
}

export function formatWorkingMemory({
  memory,
  processed,
  size,
}: {
  memory: Partial<WorkingMemory>;
  processed: boolean;
  size?: number;
}) {
  let logs = getWorkingMemoryLogs(memory, false).filter(
    (i) => i.processed === processed
  );

  if (size) {
    logs = logs.slice(-size);
  }

  return logs.map((i) => formatContextLog(i)).flat();
}

/**
 * Creates a default working memory object
 * @returns Empty working memory with initialized arrays
 */
export function createWorkingMemory(): WorkingMemory {
  return {
    inputs: [],
    outputs: [],
    thoughts: [],
    calls: [],
    results: [],
    runs: [],
    steps: [],
    events: [],
  };
}

export function pushToWorkingMemory(workingMemory: WorkingMemory, ref: AnyRef) {
  if (!workingMemory || !ref) {
    throw new Error("workingMemory and ref must not be null or undefined");
  }

  switch (ref.ref) {
    case "action_call":
      workingMemory.calls.push(ref);
      break;
    case "action_result":
      workingMemory.results.push(ref);
      break;
    case "input":
      workingMemory.inputs.push(ref);
      break;
    case "output":
      workingMemory.outputs.push(ref);
      break;
    case "thought":
      workingMemory.thoughts.push(ref);
      break;
    case "event":
      workingMemory.events.push(ref);
      break;
    case "step":
      workingMemory.steps.push(ref);
      break;
    case "run":
      workingMemory.runs.push(ref);
      break;
    default:
      throw new Error("invalid ref");
  }
}

/**
 * Pushes entry to working memory and applies memory management if configured
 */
export async function pushToWorkingMemoryWithManagement<
  TContext extends AnyContext
>(
  workingMemory: WorkingMemory,
  ref: AnyRef,
  contextState: ContextState<TContext>,
  agent: AnyAgent
): Promise<WorkingMemory> {
  pushToWorkingMemory(workingMemory, ref);
  return await applyMemoryManagement(contextState, workingMemory, ref, agent);
}

/**
 * Counts total entries in working memory
 */
export function getWorkingMemorySize(workingMemory: WorkingMemory): number {
  return (
    workingMemory.inputs.length +
    workingMemory.outputs.length +
    workingMemory.thoughts.length +
    workingMemory.calls.length +
    workingMemory.results.length +
    workingMemory.runs.length +
    workingMemory.steps.length +
    workingMemory.events.length
  );
}

/**
 * Applies memory management based on context configuration
 */
export async function applyMemoryManagement<TContext extends AnyContext>(
  contextState: ContextState<TContext>,
  workingMemory: WorkingMemory,
  newEntry: AnyRef,
  agent: AnyAgent
): Promise<WorkingMemory> {
  const memoryManager = contextState.context.memoryManager;

  if (!memoryManager) {
    return workingMemory;
  }

  const agentContext: AgentContext<TContext> = {
    id: contextState.id,
    context: contextState.context,
    args: contextState.args,
    options: contextState.options,
    settings: contextState.settings,
    memory: contextState.memory,
    workingMemory,
  };

  if (memoryManager.shouldPrune) {
    const shouldPrune = await memoryManager.shouldPrune(
      agentContext,
      workingMemory,
      newEntry,
      agent
    );
    if (shouldPrune) {
      if (memoryManager.onMemoryPressure) {
        return await memoryManager.onMemoryPressure(
          agentContext,
          workingMemory,
          agent
        );
      } else {
        return await applyDefaultMemoryStrategy(
          memoryManager,
          workingMemory,
          agentContext,
          agent
        );
      }
    }
  }

  if (memoryManager.maxSize) {
    const currentSize = getWorkingMemorySize(workingMemory);
    if (currentSize >= memoryManager.maxSize) {
      if (memoryManager.onMemoryPressure) {
        return await memoryManager.onMemoryPressure(
          agentContext,
          workingMemory,
          agent
        );
      } else {
        return await applyDefaultMemoryStrategy(
          memoryManager,
          workingMemory,
          agentContext,
          agent
        );
      }
    }
  }

  return workingMemory;
}

/**
 * Applies default memory management strategies
 */
async function applyDefaultMemoryStrategy<TContext extends AnyContext>(
  memoryManager: IMemoryManager<TContext>,
  workingMemory: WorkingMemory,
  agentContext: AgentContext<TContext>,
  agent: AnyAgent
): Promise<WorkingMemory> {
  const strategy = memoryManager.strategy || "fifo";
  const maxSize = memoryManager.maxSize || 100;
  const currentSize = getWorkingMemorySize(workingMemory);

  if (currentSize <= maxSize) {
    return workingMemory;
  }

  const excessCount = currentSize - maxSize;

  switch (strategy) {
    case "fifo":
      return applyFifoStrategy(workingMemory, excessCount, memoryManager);

    case "lru":
      return applyLruStrategy(workingMemory, excessCount, memoryManager);

    case "smart":
      return await applySmartStrategy(
        workingMemory,
        excessCount,
        memoryManager,
        agentContext,
        agent
      );

    case "custom":
      return workingMemory;

    default:
      return applyFifoStrategy(workingMemory, excessCount, memoryManager);
  }
}

/**
 * First-in-first-out memory pruning
 */
function applyFifoStrategy<TContext extends AnyContext>(
  workingMemory: WorkingMemory,
  excessCount: number,
  memoryManager: IMemoryManager<TContext>
): WorkingMemory {
  const allEntries = getWorkingMemoryLogs(workingMemory, true);
  const entriesToRemove = allEntries.slice(0, excessCount);

  const filteredEntries = memoryManager.preserve
    ? applyPreservationRules(
        entriesToRemove,
        workingMemory,
        memoryManager.preserve
      )
    : entriesToRemove;

  return removeEntriesFromMemory(workingMemory, filteredEntries);
}

/**
 * Least-recently-used memory pruning
 */
function applyLruStrategy<TContext extends AnyContext>(
  workingMemory: WorkingMemory,
  excessCount: number,
  memoryManager: IMemoryManager<TContext>
): WorkingMemory {
  const allEntries = getWorkingMemoryLogs(workingMemory, true);

  const sortedEntries = allEntries.sort((a, b) => a.timestamp - b.timestamp);
  const entriesToRemove = sortedEntries.slice(0, excessCount);

  const filteredEntries = memoryManager.preserve
    ? applyPreservationRules(
        entriesToRemove,
        workingMemory,
        memoryManager.preserve
      )
    : entriesToRemove;

  return removeEntriesFromMemory(workingMemory, filteredEntries);
}

/**
 * Smart memory pruning with compression
 */
async function applySmartStrategy<TContext extends AnyContext>(
  workingMemory: WorkingMemory,
  excessCount: number,
  memoryManager: IMemoryManager<TContext>,
  agentContext: AgentContext<TContext>,
  agent: AnyAgent
): Promise<WorkingMemory> {
  const allEntries = getWorkingMemoryLogs(workingMemory, true);
  const entriesToRemove = allEntries.slice(0, excessCount);

  const filteredEntries = memoryManager.preserve
    ? applyPreservationRules(
        entriesToRemove,
        workingMemory,
        memoryManager.preserve
      )
    : entriesToRemove;

  if (memoryManager.compress && filteredEntries.length > 0) {
    const summary = await memoryManager.compress(
      agentContext,
      filteredEntries,
      agent
    );

    const summaryThought: ThoughtRef = {
      id: `memory-summary-${Date.now()}`, // todo: remove id
      ref: "thought",
      content: `[Memory Summary] ${summary}`,
      timestamp: Date.now(),
      processed: true,
    };

    const prunedMemory = removeEntriesFromMemory(
      workingMemory,
      filteredEntries
    );
    prunedMemory.thoughts.unshift(summaryThought);
    return prunedMemory;
  }

  return removeEntriesFromMemory(workingMemory, filteredEntries);
}

/**
 * Applies preservation rules to protect important entries
 */
function applyPreservationRules<TContext extends AnyContext>(
  entriesToRemove: AnyRef[],
  workingMemory: WorkingMemory,
  preserve: NonNullable<IMemoryManager<TContext>["preserve"]>
): AnyRef[] {
  return entriesToRemove.filter((entry) => {
    if (preserve.recentInputs && entry.ref === "input") {
      const recentInputs = workingMemory.inputs.slice(-preserve.recentInputs);
      if (recentInputs.some((input) => input.id === entry.id)) {
        return false;
      }
    }

    if (preserve.recentOutputs && entry.ref === "output") {
      const recentOutputs = workingMemory.outputs.slice(
        -preserve.recentOutputs
      );
      if (recentOutputs.some((output) => output.id === entry.id)) {
        return false;
      }
    }

    if (preserve.actionNames && entry.ref === "action_call") {
      const actionCall = entry as any;
      if (preserve.actionNames.includes(actionCall.name)) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Removes specified entries from working memory
 */
function removeEntriesFromMemory(
  workingMemory: WorkingMemory,
  entriesToRemove: AnyRef[]
): WorkingMemory {
  const idsToRemove = new Set(entriesToRemove.map((entry) => entry.id));

  return {
    ...workingMemory,
    inputs: workingMemory.inputs.filter((entry) => !idsToRemove.has(entry.id)),
    outputs: workingMemory.outputs.filter(
      (entry) => !idsToRemove.has(entry.id)
    ),
    thoughts: workingMemory.thoughts.filter(
      (entry) => !idsToRemove.has(entry.id)
    ),
    calls: workingMemory.calls.filter((entry) => !idsToRemove.has(entry.id)),
    results: workingMemory.results.filter(
      (entry) => !idsToRemove.has(entry.id)
    ),
    runs: workingMemory.runs.filter((entry) => !idsToRemove.has(entry.id)),
    steps: workingMemory.steps.filter((entry) => !idsToRemove.has(entry.id)),
    events: workingMemory.events.filter((entry) => !idsToRemove.has(entry.id)),
  };
}

/**
 * Default working memory config
 * Provides a memory container with standard working memory structure
 */
export const defaultWorkingMemory = memory<WorkingMemory>({
  key: "working-memory",
  create: createWorkingMemory,
});

export function getContextId<TContext extends AnyContext>(
  context: TContext,
  args: z.infer<TContext["schema"]>
) {
  const key = context.key ? context.key(args) : undefined;
  return key ? [context.type, key].join(":") : context.type;
}

export async function createContextState<TContext extends AnyContext>({
  agent,
  context,
  args,
  contexts = [],
  settings: initialSettings = {},
}: {
  agent: AnyAgent;
  context: TContext;
  args: InferSchemaArguments<TContext["schema"]>;
  contexts?: string[];
  settings?: ContextSettings;
}): Promise<ContextState<TContext>> {
  const key = context.key ? context.key(args) : undefined;
  const id = key ? [context.type, key].join(":") : context.type;

  // Log structured context create event if structured logger is available
  const structuredLogger =
    agent.container?.resolve<StructuredLogger>("structuredLogger");
  if (structuredLogger) {
    structuredLogger.logEvent({
      eventType: LogEventType.CONTEXT_CREATE,
      timestamp: Date.now(),
      requestContext: {
        requestId: "context-create", // Default since we may not have request context
        trackingEnabled: false,
      },
      contextType: context.type,
      contextId: id,
      argsHash: key,
    });
  }

  const settings: ContextSettings = {
    model: context.model,
    maxSteps: context.maxSteps,
    maxWorkingMemorySize: context.maxWorkingMemorySize,
    modelSettings: {
      ...(agent.modelSettings || {}),
      ...(context.modelSettings || {}),
      ...(initialSettings.modelSettings || {}),
    },
    ...initialSettings,
  };

  const options = context.setup
    ? await context.setup(args, settings, agent)
    : {};

  const memory =
    (context.load
      ? await context.load(id, { options, settings })
      : await agent.memory.kv.get(`memory:${id}`)) ??
    (context.create
      ? await Promise.try(
          context.create,
          { key, args, id, options, settings },
          agent
        )
      : {});

  return {
    id,
    key,
    args,
    options,
    context,
    memory,
    settings,
    contexts,
  };
}

export async function getContextWorkingMemory(
  agent: AnyAgent,
  contextId: string
) {
  let workingMemory = await agent.memory.kv.get<WorkingMemory>(
    ["working-memory", contextId].join(":")
  );

  if (!workingMemory) {
    workingMemory = await defaultWorkingMemory.create();
    await agent.memory.kv.set(
      ["working-memory", contextId].join(":"),
      workingMemory
    );
  }

  return workingMemory;
}

export async function saveContextWorkingMemory(
  agent: AnyAgent,
  contextId: string,
  workingMemory: WorkingMemory
) {
  return await agent.memory.kv.set(
    ["working-memory", contextId].join(":"),
    workingMemory
  );
}

type ContextStateSnapshot = {
  id: string;
  type: string;
  args: any;
  key?: string;
  settings: Omit<ContextSettings, "model"> & { model?: string };
  contexts: string[];
};

export async function saveContextState(agent: AnyAgent, state: ContextState) {
  const { id, context, key, args, settings, contexts } = state;

  // Log structured context update event
  const structuredLogger =
    agent.container?.resolve<StructuredLogger>("structuredLogger");
  if (structuredLogger) {
    structuredLogger.logEvent({
      eventType: LogEventType.CONTEXT_UPDATE,
      timestamp: Date.now(),
      requestContext: {
        requestId: "context-save", // Default since we may not have request context
        trackingEnabled: false,
      },
      contextType: context.type,
      contextId: id,
      updateType: "state",
      details: {
        hasMemory: !!state.memory,
        contextCount: contexts.length,
        hasCustomSave: !!state.context.save,
      },
    });
  }

  await agent.memory.kv.set<ContextStateSnapshot>(`context:${id}`, {
    id,
    type: context.type,
    key,
    args,
    settings: {
      ...settings,
      model: settings.model?.modelId,
    },
    contexts,
  });

  if (state.context.save) {
    await state.context.save(state);
  } else {
    await agent.memory.kv.set<any>(`memory:${id}`, state.memory);
  }
}
export async function loadContextState(
  agent: AnyAgent,
  context: AnyContext,
  contextId: string
): Promise<Omit<ContextState, "options" | "memory"> | null> {
  const state = await agent.memory.kv.get<ContextStateSnapshot>(
    `context:${contextId}`
  );

  if (!state) return null;

  return {
    ...state,
    context,
    settings: {
      ...state?.settings,
      // todo: agent resolve model?
      model: undefined,
    },
  };
}

export async function saveContextsIndex(
  agent: AnyAgent,
  contextIds: Set<string>
) {
  await agent.memory.kv.set<string[]>(
    "contexts",
    Array.from(contextIds.values())
  );
}

function getContextData(
  contexts: Map<string, ContextState>,
  contextId: string
) {
  // todo: verify type?
  if (contexts.has(contextId)) {
    const state = contexts.get(contextId)!;
    return {
      id: contextId,
      type: state.context.type,
      key: state.key,
      args: state.args,
      settings: state.settings,
    };
  }

  const [type, key] = contextId.split(":");

  return {
    id: contextId,
    type,
    key,
  };
}

export function getContexts(
  contextIds: Set<string>,
  contexts: Map<string, ContextState>
) {
  return Array.from(contextIds.values())
    .filter((t) => !!t)
    .map((id) => getContextData(contexts, id));
}

export async function deleteContext(agent: AnyAgent, contextId: string) {
  await agent.memory.kv.delete(`context:${contextId}`);
  await agent.memory.kv.delete(`memory:${contextId}`);
  await agent.memory.kv.delete(`working-memory:${contextId}`);
}
