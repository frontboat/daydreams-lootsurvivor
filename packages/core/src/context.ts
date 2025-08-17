import { z, type ZodRawShape } from "zod";
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
} from "./types";
import { formatContextLog } from "./formatters";
import type { Logger } from "./logger";

// =============================================================================
// CONTEXT CREATION AND CONFIGURATION
// =============================================================================

/**
 * Creates a typed context configuration with builder methods
 *
 * This is the main factory function for creating context definitions in Dreams.
 * Contexts define reusable conversation patterns, memory structures, and behaviors
 * that can be executed by agents.
 *
 * @template TMemory - Type of memory data stored by this context
 * @template Args - Zod schema type for validating context arguments
 * @template Ctx - Type of context options/configuration data
 * @template Actions - Array type of actions available to this context
 * @template Events - Record type of events this context can emit
 *
 * @param config - Context configuration object defining behavior and structure
 * @returns A typed context configuration with fluent builder methods
 *
 * @example
 * ```typescript
 * const chatContext = context({
 *   type: "chat",
 *   schema: z.object({
 *     userId: z.string(),
 *     sessionId: z.string()
 *   }),
 *   setup: async (args) => ({
 *     startTime: Date.now(),
 *     userId: args.userId
 *   }),
 *   create: () => ({ messages: [], metadata: {} })
 * });
 * ```
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

// =============================================================================
// WORKING MEMORY UTILITIES
// =============================================================================

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

/**
 * Retrieves all working memory logs including system logs
 * @param memory - Working memory object
 * @param includeThoughts - Whether to include thought logs (default: true)
 * @returns Sorted array of all memory logs including steps and runs
 */
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

/**
 * Formats working memory logs for display or processing
 * @param params - Configuration for formatting
 * @param params.memory - Working memory to format
 * @param params.processed - Whether to include processed or unprocessed logs
 * @param params.size - Optional limit on number of logs to include
 * @returns Array of formatted log strings
 */
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
 * Adds a log reference to the appropriate working memory collection
 * @param workingMemory - The working memory object to update
 * @param ref - The log reference to add
 * @throws Error if workingMemory or ref is null/undefined, or if ref type is invalid
 */
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

// =============================================================================
// CONTEXT STATE MANAGEMENT
// =============================================================================

/**
 * Generates a unique context identifier from context definition and arguments
 * @template TContext - The context type
 * @param context - Context definition
 * @param args - Context arguments conforming to the context's schema
 * @returns Unique context identifier string (type:key or just type)
 */
export function getContextId<TContext extends AnyContext>(
  context: TContext,
  args: z.infer<TContext["schema"]>
) {
  const key = context.key ? context.key(args) : undefined;
  return key ? [context.type, key].join(":") : context.type;
}

/**
 * Creates a new context state instance with initialized memory and configuration
 *
 * This function handles the complete setup of a context state including:
 * - ID generation and key resolution
 * - Settings configuration and merging
 * - Memory initialization (loading existing or creating new)
 * - Options setup through context.setup function
 * - Structured logging of context creation
 *
 * @template TContext - The context type
 * @param params - Configuration object for context state creation
 * @param params.agent - Agent instance
 * @param params.context - Context definition
 * @param params.args - Context arguments
 * @param params.contexts - Array of related context IDs (default: [])
 * @param params.settings - Initial context settings (default: {})
 * @returns Promise resolving to the new context state
 */
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

  // Log context create event
  const logger = agent.container?.resolve<Logger>("logger");
  if (logger) {
    logger.event("CONTEXT_CREATE", {
      contextType: context.type,
      contextId: id,
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

// =============================================================================
// PERSISTENCE AND STORAGE
// =============================================================================

/**
 * Retrieves working memory for a context, creating it if it doesn't exist
 * @param agent - Agent instance for memory access
 * @param contextId - Unique identifier for the context
 * @returns Promise resolving to the working memory object
 */
export async function getContextWorkingMemory(
  agent: AnyAgent,
  contextId: string
) {
  // Use WorkingMemoryImpl directly with just contextId - it handles the key internally
  let workingMemory = await agent.memory.working.get(contextId);

  if (!workingMemory) {
    workingMemory = await agent.memory.working.create(contextId);
  }

  return workingMemory;
}

/**
 * Persists working memory for a context to storage
 * @param agent - Agent instance for memory access
 * @param contextId - Unique identifier for the context
 * @param workingMemory - Working memory object to save
 * @returns Promise resolving when save is complete
 */
export async function saveContextWorkingMemory(
  agent: AnyAgent,
  contextId: string,
  workingMemory: WorkingMemory
) {
  // Use WorkingMemoryImpl directly with just contextId - it handles the key internally
  return await agent.memory.working.set(contextId, workingMemory);
}

/**
 * Snapshot format for persisting context state to storage
 * Models are stored as string IDs rather than object references
 */
type ContextStateSnapshot = {
  /** Unique context identifier */
  id: string;
  /** Context type name */
  type: string;
  /** Context arguments */
  args: any;
  /** Optional context key */
  key?: string;
  /** Context settings with model stored as string ID */
  settings: Omit<ContextSettings, "model"> & { model?: string };
  /** Array of related context IDs */
  contexts: string[];
};

/**
 * Persists context state and memory to storage
 *
 * Saves both the context metadata (settings, args, etc.) and the context's
 * memory data. Uses custom save function if provided by the context, otherwise
 * saves memory to default key-value storage.
 *
 * @param agent - Agent instance for storage access
 * @param state - Context state to save
 * @returns Promise resolving when save is complete
 */
export async function saveContextState(agent: AnyAgent, state: ContextState) {
  const { id, context, key, args, settings, contexts } = state;

  agent.logger.event("CONTEXT_UPDATE", {
    contextType: context.type,
    contextId: id,
    updateType: "state",
    context: context,
  });

  await agent.memory.kv.set<ContextStateSnapshot>(`context:${id}`, {
    id,
    type: context.type,
    key,
    args,
    settings: {
      ...settings,
      model:
        typeof settings.model === "string"
          ? settings.model
          : settings.model?.modelId,
    },
    contexts,
  });

  if (state.context.save) {
    await state.context.save(state);
  } else {
    await agent.memory.kv.set<any>(`memory:${id}`, state.memory);
  }
}

/**
 * Loads context state metadata from storage
 * @param agent - Agent instance for storage access
 * @param context - Context definition
 * @param contextId - Unique identifier for the context
 * @returns Promise resolving to context state metadata or null if not found
 * @todo Implement agent model resolution for loaded contexts
 */
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
      // TODO: Implement agent model resolution
      model: undefined,
    },
  };
}

// =============================================================================
// CONTEXT UTILITIES AND HELPERS
// =============================================================================

/**
 * Saves the index of all active context IDs to storage
 * @param agent - Agent instance for storage access
 * @param contextIds - Set of active context IDs
 * @returns Promise resolving when index is saved
 */
export async function saveContextsIndex(
  agent: AnyAgent,
  contextIds: Set<string>
) {
  await agent.memory.kv.set<string[]>(
    "contexts",
    Array.from(contextIds.values())
  );
}

/**
 * Retrieves context metadata for a given context ID
 * @param contexts - Map of loaded context states
 * @param contextId - Context ID to retrieve data for
 * @returns Context metadata object
 */
function getContextData(
  contexts: Map<string, ContextState>,
  contextId: string
) {
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

/**
 * Retrieves metadata for all active contexts
 * @param contextIds - Set of context IDs to retrieve
 * @param contexts - Map of loaded context states
 * @returns Array of context metadata objects
 */
export function getContexts(
  contextIds: Set<string>,
  contexts: Map<string, ContextState>
) {
  return Array.from(contextIds.values())
    .filter((t) => !!t)
    .map((id) => getContextData(contexts, id));
}

/**
 * Deletes all data associated with a context from storage
 * @param agent - Agent instance for storage access
 * @param contextId - Unique identifier for the context to delete
 * @returns Promise resolving when deletion is complete
 */
export async function deleteContext(agent: AnyAgent, contextId: string) {
  await agent.memory.kv.delete(`context:${contextId}`);
  await agent.memory.kv.delete(`memory:${contextId}`);
  await agent.memory.working.clear(contextId);
}

/**
 * Creates an empty working memory structure for testing
 * @returns Empty working memory with all arrays initialized
 */
export function createWorkingMemory(): WorkingMemory {
  return {
    inputs: [],
    outputs: [],
    thoughts: [],
    calls: [],
    results: [],
    events: [],
    steps: [],
    runs: [],
  };
}
