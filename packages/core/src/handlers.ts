import { z } from "zod";
import type { Logger } from "./logger";
import type { TaskRunner } from "./task";
import { runAction } from "./tasks";
import type {
  ActionCall,
  ActionCtxRef,
  ActionResult,
  AnyAction,
  AnyAgent,
  AnyContext,
  ContextState,
  Memory,
  Output,
  OutputRef,
  WorkingMemory,
} from "./types";
import { randomUUIDv7 } from "./utils";

class ActionNotFoundError extends Error {
  constructor(public call: ActionCall) {
    super();
  }
}

class ParsingError extends Error {
  constructor(public parsingError: unknown) {
    super();
  }
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

    throw new ActionNotFoundError(call);
  }

  try {
    let data: any = undefined;
    if (action.schema) {
      const schema =
        "parse" in action.schema || "validate" in action.schema
          ? action.schema
          : z.object(action.schema);

      data = call.content.length > 0 ? JSON.parse(call.content) : {};

      data =
        "parse" in action.schema
          ? schema.parse(data)
          : schema.validate
            ? schema.validate(data)
            : data;
    }

    call.data = data;

    return { action, data };
  } catch (error) {
    throw new ParsingError(error);
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
}) {
  let actionMemory: Memory<any> | undefined = undefined;

  if (action.memory) {
    actionMemory =
      (await agent.memory.store.get(action.memory.key)) ??
      action.memory.create();
  }

  const resultData = await taskRunner.enqueueTask(
    runAction,
    {
      action,
      call,
      agent,
      logger,
      ctx: {
        ...state,
        workingMemory,
        actionMemory,
        agentMemory: agentState?.memory,
        abortSignal,
      },
    },
    {
      debug: agent.debugger,
      retry: action.retry,
      abortSignal,
    }
  );

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
    logger.error("agent:output", "OUTPUT_NOT_FOUND", {
      outputRef,
      availableOutputs: outputs.map((o) => o.type),
    });
    return {
      ...outputRef,
      params: { error: "OUTPUT NOT FOUND" },
      timestamp: Date.now(),
      data: { content: outputRef.data, error: "OUTPUT NOT FOUND" },
    };
  }

  logger.debug("agent:output", outputRef.type, outputRef.data);

  try {
    if (output.schema) {
      const schema = (
        "parse" in output.schema ? output.schema : z.object(output.schema)
      ) as z.AnyZodObject | z.ZodString;

      let parsedContent = outputRef.content;

      if (typeof parsedContent === "string") {
        if (schema._def.typeName !== "ZodString") {
          try {
            parsedContent = JSON.parse(parsedContent.trim());
          } catch (error) {
            console.log("failed parsing output content", {
              content: parsedContent,
            });
            throw error;
          }
        }
      }

      try {
        outputRef.data = schema.parse(parsedContent);
      } catch (error) {
        console.log("failed parsing output schema");
        throw error;
      }
    }

    const response = await output.handler(
      outputRef.data,
      {
        ...state,
        workingMemory,
      },
      agent
    );

    if (Array.isArray(response)) {
      const refs: OutputRef[] = [];
      for (const res of response) {
        const ref: OutputRef = {
          ...outputRef,
          id: randomUUIDv7(),
          processed: true,
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
        processed: true,
      };

      ref.formatted = output.format ? output.format(response) : undefined;

      return ref;
    }

    return {
      ...outputRef,
      formatted: output.format ? output.format(outputRef.data) : undefined,
      processed: true,
    };
  } catch (error) {
    const ref: OutputRef = {
      ...outputRef,
      timestamp: Date.now(),
      error,
      processed: false,
    };

    logger.error("agent:output", outputRef.type, error);

    return ref;
  }
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
