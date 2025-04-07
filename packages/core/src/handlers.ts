import { z } from "zod";
import type { Logger } from "./logger";
import type { TaskRunner } from "./task";
import { runAction } from "./tasks";
import type {
  ActionCall,
  ActionCallContext,
  ActionCtxRef,
  ActionResult,
  AnyAction,
  AnyAgent,
  AnyContext,
  Context,
  ContextRef,
  ContextState,
  EventRef,
  Input,
  InputConfig,
  InputRef,
  Log,
  Memory,
  Output,
  OutputRef,
  WorkingMemory,
} from "./types";
import { randomUUIDv7 } from "./utils";

export class NotFoundError extends Error {
  constructor(public ref: ActionCall | OutputRef | InputRef) {
    super();
  }
}

export class ParsingError extends Error {
  constructor(
    public ref: ActionCall | OutputRef | InputRef,
    public parsingError: unknown
  ) {
    super();
  }
}

function parseJSONContent(content: string) {
  if (content.startsWith("```json")) {
    content = content.slice("```json".length, -3);
  }

  return JSON.parse(content);
}

export async function prepareActionCall({
  call,
  actions,
  logger,
}: {
  call: ActionCall;
  actions: ActionCtxRef[];
  logger: Logger;
}) {
  const action = actions.find((a) => a.name === call.name);

  if (!action) {
    logger.error("agent:action", "ACTION_MISMATCH", {
      name: call.name,
      data: call.content,
    });

    throw new NotFoundError(call);
  }

  try {
    let data: any = undefined;
    if (action.schema) {
      const schema =
        "parse" in action.schema || "validate" in action.schema
          ? action.schema
          : z.object(action.schema);

      data =
        call.content.length > 0 ? parseJSONContent(call.content.trim()) : {};

      data =
        "parse" in schema
          ? schema.parse(data)
          : schema.validate
            ? schema.validate(data)
            : data;
    }

    call.data = data;

    return { action, data };
  } catch (error) {
    throw new ParsingError(call, error);
  }
}

export async function handleActionCall({
  state,
  workingMemory,
  action,
  logger,
  call,
  taskRunner,
  agent,
  agentState,
  abortSignal,
  pushLog,
}: {
  state: ContextState<AnyContext>;
  workingMemory: WorkingMemory;
  call: ActionCall;
  action: AnyAction;
  logger: Logger;
  taskRunner: TaskRunner;
  agent: AnyAgent;
  agentState?: ContextState;
  abortSignal?: AbortSignal;
  pushLog?: (log: Log) => void;
}) {
  let actionMemory: Memory<any> | undefined = undefined;

  if (action.memory) {
    actionMemory =
      (await agent.memory.store.get(action.memory.key)) ??
      action.memory.create();
  }

  const callCtx: ActionCallContext = {
    ...state,
    workingMemory,
    actionMemory,
    agentMemory: agentState?.memory,
    abortSignal,
    call,
    emit(event, args, options) {
      console.log("emitting", { event, args });

      const eventRef: EventRef = {
        ref: "event",
        id: randomUUIDv7(),
        name: event as string,
        data: args,
        processed: options?.processed ?? true,
        timestamp: Date.now(),
      };

      if (pushLog) pushLog(eventRef);
      else workingMemory.events.push(eventRef);
    },
  };

  const resultData = await taskRunner.enqueueTask(
    runAction,
    {
      action,
      agent,
      logger,
      ctx: callCtx,
    },
    {
      debug: agent.debugger,
      retry: action.retry,
      abortSignal,
    }
  );

  call.processed = true;

  const result: ActionResult = {
    ref: "action_result",
    id: randomUUIDv7(),
    callId: call.id,
    data: resultData,
    name: call.name,
    timestamp: Date.now(),
    processed: false,
  };

  if (action.format) result.formatted = action.format(result);

  if (action.memory) {
    await agent.memory.store.set(action.memory.key, actionMemory);
  }

  if (action.onSuccess) {
    await Promise.try(action.onSuccess, result, callCtx, agent);
  }

  return result;
}

export async function handleOutput({
  outputRef,
  outputs,
  logger,
  state,
  workingMemory,
  agent,
}: {
  outputs: Output[];
  outputRef: OutputRef;
  logger: Logger;
  workingMemory: WorkingMemory;
  state: ContextState;
  agent: AnyAgent;
}): Promise<OutputRef | OutputRef[]> {
  const output = outputs.find((output) => output.type === outputRef.type);

  if (!output) {
    throw new NotFoundError(outputRef);
  }

  logger.debug("agent:output", outputRef.type, outputRef.data);

  if (output.schema) {
    const schema = (
      "parse" in output.schema ? output.schema : z.object(output.schema)
    ) as z.AnyZodObject | z.ZodString;

    let parsedContent = outputRef.content;

    try {
      if (typeof parsedContent === "string") {
        if (schema._def.typeName !== "ZodString") {
          parsedContent = JSON.parse(parsedContent.trim());
        }
      }

      outputRef.data = schema.parse(parsedContent);
    } catch (error) {
      throw new ParsingError(outputRef, error);
    }
  }

  if (output.handler) {
    const response = await Promise.try(
      output.handler,
      outputRef.data,
      {
        ...state,
        workingMemory,
        outputRef,
      },
      agent
    );

    if (Array.isArray(response)) {
      const refs: OutputRef[] = [];
      for (const res of response) {
        const ref: OutputRef = {
          ...outputRef,
          id: randomUUIDv7(),
          processed: res.processed ?? true,
          ...res,
        };

        ref.formatted = output.format ? output.format(response) : undefined;
        refs.push(ref);
      }
      return refs;
    } else if (response) {
      const ref: OutputRef = {
        ...outputRef,
        ...response,
        processed: response.processed ?? true,
      };

      ref.formatted = output.format ? output.format(response) : undefined;

      return ref;
    }
  }

  return {
    ...outputRef,
    formatted: output.format ? output.format(outputRef.data) : undefined,
    processed: true,
  };
}

export async function prepareContextActions(params: {
  context: Context;
  state: ContextState<AnyContext>;
  workingMemory: WorkingMemory;
  agent: AnyAgent;
  agentCtxState: ContextState<AnyContext> | undefined;
}): Promise<ActionCtxRef[]> {
  const { context, state } = params;
  const actions =
    typeof context.actions === "function"
      ? await Promise.try(context.actions, state)
      : context.actions;

  return Promise.all(
    actions.map((action) =>
      prepareAction({
        action,
        ...params,
      })
    )
  ).then((t) => t.filter((t) => !!t));
}

export async function prepareAction({
  action,
  context,
  state,
  workingMemory,
  agent,
  agentCtxState,
}: {
  action: AnyAction;
  context: AnyContext;
  state: ContextState<AnyContext>;
  workingMemory: WorkingMemory;
  agent: AnyAgent;
  agentCtxState: ContextState<AnyContext> | undefined;
}): Promise<ActionCtxRef | undefined> {
  if (action.context && action.context.type !== context.type) return undefined;

  let actionMemory: Memory | undefined = undefined;

  if (action.memory) {
    actionMemory =
      (await agent.memory.store.get(action.memory.key)) ??
      action.memory.create();
  }

  const enabled = action.enabled
    ? action.enabled({
        ...state,
        context,
        workingMemory,
        actionMemory,
        agentMemory: agentCtxState?.memory,
      })
    : true;

  if (action.enabled && actionMemory) {
    await agent.memory.store.set(actionMemory.key, actionMemory);
  }

  return enabled
    ? {
        ...action,
        ctxId: state.id,
      }
    : undefined;
}

export async function prepareContext({
  agent,
  ctxState,
  agentCtxState,
  workingMemory,
  params,
}: {
  agent: AnyAgent;
  ctxState: ContextState;
  agentCtxState?: ContextState;
  workingMemory: WorkingMemory;
  params?: {
    outputs?: Record<string, Omit<Output, "type">>;
    inputs?: Record<string, InputConfig>;
    actions?: AnyAction[];
    contexts?: ContextRef[];
  };
}) {
  await agentCtxState?.context.loader?.(agentCtxState, agent);

  await ctxState?.context.loader?.(ctxState, agent);

  const inputs: Input[] = Object.entries({
    ...agent.inputs,
    ...ctxState.context.inputs,
    ...(params?.inputs ?? {}),
  }).map(([type, input]) => ({
    type,
    ...input,
  }));

  const outputs: Output[] = Object.entries({
    ...agent.outputs,
    ...ctxState.context.outputs,
    ...(params?.outputs ?? {}),
  })
    .filter(([_, output]) =>
      output.enabled
        ? output.enabled({
            ...ctxState,
            workingMemory,
          })
        : true
    )
    .map(([type, output]) => ({
      type,
      ...output,
    }));

  const actions = await Promise.all(
    [agent.actions, params?.actions]
      .filter((t) => !!t)
      .flat()
      .map((action: AnyAction) =>
        prepareAction({
          action,
          agent,
          agentCtxState,
          context: ctxState.context,
          state: ctxState,
          workingMemory,
        })
      )
  ).then((r) => r.filter((a) => !!a));

  const ctxActions = await prepareContextActions({
    agent,
    agentCtxState,
    context: ctxState.context,
    state: ctxState,
    workingMemory,
  });

  actions.push(...ctxActions);

  const subCtxsStates = await Promise.all([
    ...(ctxState?.contexts ?? []).map((ref) => agent.getContextById(ref)),
    ...(params?.contexts ?? []).map((ref) => agent.getContext(ref)),
  ]).then((res) => res.filter((r) => !!r));

  await Promise.all(
    subCtxsStates.map((state) => state.context.loader?.(state, agent))
  );

  const subCtxsStatesInputs: Input[] = subCtxsStates
    .map((state) => Object.entries(state.context.inputs))
    .flat()
    .map(([type, input]) => ({
      type,
      ...input,
    }));

  inputs.push(...subCtxsStatesInputs);

  const subCtxsStatesOutputs: Output[] = subCtxsStates
    .map((state) => Object.entries(state.context.outputs))
    .flat()
    .map(([type, output]) => ({
      type,
      ...output,
    }));

  outputs.push(...subCtxsStatesOutputs);

  const subCtxsActions = await Promise.all(
    subCtxsStates.map((state) =>
      prepareContextActions({
        agent,
        agentCtxState,
        context: state.context,
        state: state,
        workingMemory,
      })
    )
  );

  actions.push(...subCtxsActions.flat());

  const contexts = [agentCtxState, ctxState, ...subCtxsStates].filter(
    (t) => !!t
  );

  return {
    contexts,
    outputs,
    actions,
    inputs,
  };
}

export async function handleInput({
  inputs,
  inputRef,
  logger,
  ctxState,
  workingMemory,
  agent,
}: {
  inputs: Record<string, InputConfig>;
  inputRef: InputRef;
  logger: Logger;
  workingMemory: WorkingMemory;
  ctxState: ContextState;
  agent: AnyAgent;
}) {
  const input = inputs[inputRef.type];

  if (!input) {
    throw new NotFoundError(inputRef);
  }

  try {
    if (input.schema) {
      const schema = (
        "parse" in input.schema ? input.schema : z.object(input.schema)
      ) as z.AnyZodObject | z.ZodString;
      inputRef.data = schema.parse(inputRef.content);
    } else {
      inputRef.data = z.string().parse(inputRef.content);
    }
  } catch (error) {
    throw new ParsingError(inputRef, error);
  }

  logger.debug("agent:send", "Querying episodic memory");

  const episodicMemory = await agent.memory.vector.query(
    `${ctxState.id}`,
    JSON.stringify(inputRef.data)
  );

  logger.trace("agent:send", "Episodic memory retrieved", {
    episodesCount: episodicMemory.length,
  });

  workingMemory.episodicMemory = {
    episodes: episodicMemory,
  };

  if (input.handler) {
    logger.debug("agent:send", "Using custom input handler", {
      type: inputRef.type,
    });

    const { data, params } = await Promise.try(
      input.handler,
      inputRef.data,
      {
        ...ctxState,
        workingMemory,
      },
      agent
    );

    inputRef.data = data;
    if (params) {
      inputRef.params = {
        ...inputRef.params,
        ...params,
      };
    }
  }

  inputRef.formatted = input.format ? input.format(inputRef) : undefined;
}
