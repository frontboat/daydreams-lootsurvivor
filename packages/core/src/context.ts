import { z, type ZodRawShape } from "zod";
import type {
  AnyAction,
  AnyAgent,
  AnyContext,
  Context,
  ContextSettings,
  ContextState,
  InferSchemaArguments,
  Log,
  Optional,
  WorkingMemory,
} from "./types";
import { formatContextLog } from "./formatters";
import { memory } from "./utils";

type ContextConfig<
  TMemory = any,
  Args extends z.ZodTypeAny | ZodRawShape = any,
  Ctx = any,
  T extends AnyAction[] = AnyAction[],
> = Optional<Omit<Context<TMemory, Args, Ctx, T>, "setActions">, "actions">;

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
  T extends AnyAction[] = AnyAction[],
>(ctx: ContextConfig<TMemory, Args, Ctx, T>): Context<TMemory, Args, Ctx, T> {
  return {
    ...ctx,
    actions: (ctx.actions ?? []) as T,
    setActions(actions) {
      return context<TMemory, Args, Ctx, any>({
        ...ctx,
        actions,
      });
    },
  };
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
  ].sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));
}

export function renderWorkingMemory({
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
  const key = context.key ? context.key(args) : context.type;
  return context.key ? [context.type, key].join(":") : context.type;
}

export async function createContextState<TContext extends AnyContext>(
  agent: AnyAgent,
  context: TContext,
  args: InferSchemaArguments<TContext["schema"]>,
  initialSettings: ContextSettings = {}
): Promise<ContextState<TContext>> {
  const key = context.key ? context.key(args) : context.type;
  const id = context.key ? [context.type, key].join(":") : context.type;

  const settings: ContextSettings = {
    model: context.model,
    maxSteps: context.maxSteps,
    maxWorkingMemorySize: context.maxWorkingMemorySize,
    ...initialSettings,
  };

  const options = context.setup
    ? await context.setup(args, settings, agent)
    : {};

  const memory =
    (await agent.memory.store.get(`memory:${id}`)) ??
    (context.create
      ? await Promise.resolve(
          context.create({ key, args, context, id, options, settings })
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
    contexts: [],
  };
}

export async function getContextWorkingMemory(
  agent: AnyAgent,
  contextId: string
) {
  return (
    (await agent.memory.store.get<WorkingMemory>(
      ["working-memory", contextId].join(":")
    )) ?? (await defaultWorkingMemory.create())
  );
}

export async function saveContextWorkingMemory(
  agent: AnyAgent,
  contextId: string,
  workingMemory: WorkingMemory
) {
  return await agent.memory.store.set(
    ["working-memory", contextId].join(":"),
    workingMemory
  );
}

type ContextStateSnapshot = {
  id: string;
  type: string;
  args: any;
  key: string;
  settings: Omit<ContextSettings, "model"> & { model?: string };
};

export async function saveContextState(agent: AnyAgent, state: ContextState) {
  const { id, context, key, args, settings } = state;
  await agent.memory.store.set<ContextStateSnapshot>(`context:${id}`, {
    id,
    type: context.type,
    key,
    args,
    settings: {
      ...settings,
      model: settings.model?.modelId,
    },
  });

  if (state.context.save) {
    await state.context.save(state);
  } else {
    await agent.memory.store.set<any>(`memory:${id}`, state.memory);
  }
}
export async function loadContextState(
  agent: AnyAgent,
  context: AnyContext,
  contextId: string
): Promise<Omit<ContextState, "options" | "memory"> | null> {
  const state = await agent.memory.store.get<ContextStateSnapshot>(
    `context:${contextId}`
  );

  if (!state) return null;

  return {
    ...state,
    context,
    contexts: [],
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
  await agent.memory.store.set<string[]>(
    "contexts",
    Array.from(contextIds.values()).map((id) => id)
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
  return Array.from(contextIds.values()).map((id) =>
    getContextData(contexts, id)
  );
}
