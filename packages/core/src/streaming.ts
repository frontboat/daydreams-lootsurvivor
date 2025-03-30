import { saveContextWorkingMemory } from "./context";
import {
  handleActionCall,
  handleInput,
  handleOutput,
  NotFoundError,
  ParsingError,
  prepareActionCall,
  prepareContext,
} from "./handlers";
import type { Logger } from "./logger";
import { generateEpisode } from "./memory/utils";
import type { StepConfig } from "./prompts/main";
import type { TaskRunner } from "./task";
import type {
  ActionCall,
  ActionCtxRef,
  ActionResult,
  AnyAction,
  AnyAgent,
  ContextRef,
  ContextState,
  EventRef,
  Handlers,
  Input,
  InputRef,
  Log,
  Output,
  OutputRef,
  RunRef,
  StepRef,
  WorkingMemory,
} from "./types";
import { input, randomUUIDv7 } from "./utils";
import { xmlStreamParser } from "./xml";

type PartialLog = Partial<Log> &
  Pick<Log, "ref" | "id" | "timestamp" | "processed">;

type AsyncIterableStream<T> = AsyncIterable<T> & ReadableStream<T>;

export type StackElement = {
  index: number;
  tag: string;
  attributes: Record<string, any>;
  content: string;
  done: boolean;
};

export async function handleStream<Ctx = any>(
  textStream: AsyncGenerator<string>,
  initialIndex: number,
  tags: Set<string>,
  fn: (el: StackElement, ctx?: Ctx) => void,
  ctx?: Ctx
) {
  const parser = xmlStreamParser(tags);

  parser.next();

  let current: StackElement | undefined = undefined;
  let stack: StackElement[] = [];

  let index = initialIndex;

  function handleChunk(chunk: string) {
    let result = parser.next(chunk);
    while (!result.done && result.value) {
      if (result.value.type === "start") {
        if (current) stack.push(current);
        current = {
          index: index++,
          tag: result.value.name,
          attributes: result.value.attributes,
          content: "",
          done: false,
        };
        fn(current, ctx);
      }

      if (result.value.type === "end") {
        if (current)
          fn(
            {
              ...current,
              done: true,
            },
            ctx
          );
        current = stack.pop();
      }

      if (result.value.type === "text") {
        if (current) {
          current.content += result.value.content;
          fn(current, ctx);
        }
      }
      result = parser.next();
    }
  }

  for await (const chunk of textStream) {
    handleChunk(chunk);
  }

  parser.return?.();
}

export async function* wrapStream(
  stream: AsyncIterable<string>,
  prefix: string,
  suffix: string
) {
  yield prefix;
  for await (const value of stream) {
    yield value;
  }
  yield suffix;
}

const defaultTags = new Set([
  "think",
  "thinking",
  "response",
  "output",
  "action_call",
  "reasoning",
]);

export function createContextStreamHandler({
  agent,
  ctxState,
  agentCtxState,
  logger,
  handlers,
  taskRunner,
  workingMemory,
  stepConfig,
  abortSignal,
}: {
  agent: AnyAgent;
  taskRunner: TaskRunner;
  ctxState: ContextState;
  agentCtxState?: ContextState;
  logger: Logger;
  handlers?: Partial<Handlers>;
  workingMemory: WorkingMemory;
  stepConfig: StepConfig;
  abortSignal?: AbortSignal;
}) {
  const runRef: RunRef = {
    id: randomUUIDv7(),
    ref: "run",
    type: ctxState.context.type,
    data: {},
    processed: false,
    timestamp: Date.now(),
  };

  function createStep() {
    const newStep: StepRef = {
      ref: "step",
      id: randomUUIDv7(),
      step: state.step,
      type: stepConfig.name,
      data: {},
      processed: false,
      timestamp: Date.now(),
    };

    state.steps.push(newStep);
    workingMemory.steps.push(newStep);

    return newStep;
  }

  const state = {
    index: 0,
    logsByIndex: new Map<number, PartialLog>(),
    step: 0,
    ctxState,
    agentCtxState,
    runRef,
    controller: new AbortController(),
    steps: [] as StepRef[],
    chain: [] as Log[],
    actions: [] as ActionCtxRef[],
    outputs: [] as Output[],
    inputs: [] as Input[],
    contexts: [] as ContextState[],
    errors: [] as any[],
    calls: [] as Promise<any>[],
    promises: [] as Promise<any>[],
    response: null as null | string,

    params: {} as {
      actions?: AnyAction[];
      outputs?: Record<string, Omit<Output, "type">>;
      contexts?: ContextRef[];
    },

    async start(params: {
      actions?: AnyAction[];
      outputs?: Record<string, Omit<Output, "type">>;
      contexts?: ContextRef[];
    }) {
      state.params = params;

      const { actions, contexts, outputs, inputs } = await prepareContext({
        agent,
        ctxState,
        workingMemory,
        agentCtxState,
        params: state.params,
      });

      Object.assign(state, { actions, contexts, outputs, inputs });

      state.step = 1;

      return createStep();
    },

    async startNewStep(params?: {
      actions?: AnyAction[];
      outputs?: Record<string, Omit<Output, "type">>;
      contexts?: ContextRef[];
    }) {
      if (params) {
        state.params = params;
      }

      const { actions, contexts, outputs, inputs } = await prepareContext({
        agent,
        ctxState,
        workingMemory,
        agentCtxState,
        params: state.params,
      });

      Object.assign(state, { actions, contexts, outputs, inputs });

      state.index++;

      return createStep();
    },

    shouldContinue() {
      if (state.errors.length > 0) {
        logger.warn("agent:run", "Continuing despite error", {
          errors: state.errors,
          step: state.step,
        });
      }

      for (const ctx of state.contexts) {
        if (!ctx.context.shouldContinue) continue;

        if (
          ctx.context.shouldContinue({
            ...ctx,
            workingMemory,
          })
        )
          return true;
      }

      return stepConfig.shouldContinue({ chain: state.chain });
    },
  };

  abortSignal?.addEventListener("abort", () => {
    state.controller.abort(abortSignal?.reason);
  });

  function createErrorEvent({
    name,
    data,
    params,
  }: Pick<EventRef, "name" | "data" | "params">): EventRef {
    return {
      ref: "event",
      id: randomUUIDv7(),
      name,
      data,
      params,
      processed: false,
      timestamp: Date.now(),
    };
  }

  workingMemory.runs.push(runRef);

  function getOrCreateRef<
    TLog extends Omit<PartialLog, "id" | "timestamp" | "processed">,
  >(
    index: number,
    ref: TLog
  ): TLog & Pick<PartialLog, "id" | "timestamp" | "processed"> {
    if (!state.logsByIndex.has(index)) {
      state.logsByIndex.set(index, {
        id: randomUUIDv7(),
        timestamp: Date.now(),
        processed: false,
        ...ref,
      });
    }

    state.index = Math.max(index, state.index);

    return state.logsByIndex.get(index)! as TLog &
      Pick<PartialLog, "id" | "timestamp" | "processed">;
  }

  async function pushLogStream(log: Log, done: boolean) {
    if (log.ref !== "output" && done) state.chain.push(log);

    if (log.ref === "thought" && done) {
      workingMemory.thoughts.push(log);
      logger.debug("agent:think", "thought", log.content);
      handlers?.onThinking?.(log);
    }

    if (log.ref === "input" && done) {
      await handleInput({
        agent,
        ctxState,
        inputRef: log,
        inputs: {
          ...agent.inputs,
          ...ctxState.context.inputs,
        },
        logger,
        workingMemory,
      });

      state.chain.push(log);
      workingMemory.inputs.push(log);
    }

    if (log.ref === "output" && done) {
      await handleOutputStream(log);
    }

    if (log.ref === "event" && done) {
      workingMemory.events.push(log);
    }

    if (log.ref === "action_call" && done) {
      workingMemory.calls.push(log);
      await handleActionCallStream(log);
    }

    if (log.ref === "action_result" && done) {
      workingMemory.results.push(log);

      // Find the most recent thought and action call
      const lastThought =
        workingMemory.thoughts[workingMemory.thoughts.length - 1];
      const lastActionCall =
        workingMemory.calls[workingMemory.calls.length - 1];

      // If we have a complete thought-action-result cycle, generate an episode
      if (lastThought && lastActionCall && agent.memory.generateMemories) {
        // Generate episode with the last thought, action call, and result

        await generateEpisode(
          lastThought,
          lastActionCall,
          log,
          agent,
          ctxState.id,
          state.actions
        ).catch((error) => {
          logger.error(
            "agent:generateEpisode",
            "Failed to generate episode",
            error
          );
        });
      }
    }

    if (done) await saveContextWorkingMemory(agent, ctxState.id, workingMemory);

    handlers?.onLogStream?.(log, done);
  }

  async function handleActionCallStream(call: ActionCall) {
    const { action } = await prepareActionCall({
      call,
      actions: state.actions,
      logger,
    });

    if (abortSignal?.aborted) return;

    state.calls.push(
      handleActionCall({
        call,
        action,
        agent,
        logger,
        state:
          state.contexts.find(
            (subCtxState) => subCtxState.id === action.ctxId
          ) ?? ctxState,
        taskRunner,
        workingMemory,
        agentState: agentCtxState,
        abortSignal,
        pushLog: (log) => handlePushLog(log, true),
      })
        .catch((err) => {
          const result: ActionResult = {
            ref: "action_result",
            id: randomUUIDv7(),
            callId: call.id,
            data: { error: JSON.stringify(err) },
            name: call.name,
            timestamp: Date.now(),
            processed: false,
          };

          return result;
        })
        .then((res) => {
          handlePushLog(res, true);
          return res;
        })
    );
  }

  async function handleOutputStream(outputRef: OutputRef) {
    logger.debug("agent:output", outputRef.type, outputRef.data);

    const refs = await handleOutput({
      agent,
      logger,
      state: ctxState,
      workingMemory,
      outputs: state.outputs,
      outputRef,
    });

    for (const ref of Array.isArray(refs) ? refs : [refs]) {
      logger.debug("agent:output", "Output processed status", {
        type: ref.type,
        processed: ref.processed,
      });
      state.chain.push(ref);
      workingMemory.outputs.push(ref);
    }
  }

  async function handlePushLog(el: Log, done: boolean) {
    try {
      await pushLogStream(el, done);
    } catch (error) {
      state.errors.push(error);
      if (el.ref === "input") return;
      // wip
      if (error instanceof NotFoundError) {
        if (error.ref.ref === "input") return;
        if (error.ref.ref === "output") {
          const outputRef = {
            ...error.ref,
            params: {
              ...error.ref.params,
              id: error.ref.id,
              error: "OutputTypeNotFound",
            },
            processed: false,
          };
          state.chain.push(outputRef);
          workingMemory.outputs.push(outputRef);
        }

        await pushLogStream(
          createErrorEvent({
            name: `error:${error.ref.ref}`,
            data:
              error.ref.ref === "output"
                ? {
                    error: "OutputTypeNotFound",
                    type: error.ref.type ?? "undefined",
                  }
                : { error: "ActionNameNotFound", name: error.ref.name },
            params:
              error.ref.ref === "output"
                ? { outputId: error.ref.id }
                : { callId: error.ref.id },
          }),
          true
        );
      }

      if (error instanceof ParsingError) {
        if (error.ref.ref === "output")
          pushLogStream(
            {
              ...error.ref,
              params: {
                id: error.ref.id,
                error: "parsingError",
              },
            },
            true
          );
        pushLogStream(
          createErrorEvent({
            name: `error:${error.ref.ref}:parsingError`,
            data: error.parsingError,
            params:
              error.ref.ref === "output"
                ? { outputId: error.ref.id }
                : { callId: error.ref.id },
          }),
          true
        );
      }
    }
  }

  function handler(el: StackElement, _: any) {
    if (abortSignal?.aborted) return;

    switch (el.tag) {
      case "think":
      case "thinking":
      case "reasoning": {
        const ref = getOrCreateRef(el.index, {
          ref: "thought",
        });

        handlePushLog(
          {
            ...ref,
            content: el.content,
          },
          el.done
        );

        break;
      }

      case "action_call": {
        const ref = getOrCreateRef(el.index, {
          ref: "action_call",
        });

        handlePushLog(
          {
            ...ref,
            name: el.attributes.name,
            content: el.content,
            data: undefined,
            processed: false,
          },
          el.done
        );

        break;
      }

      case "output": {
        const ref = getOrCreateRef(el.index, {
          ref: "output",
        });

        const { type, ...params } = el.attributes;

        handlePushLog(
          {
            ...ref,
            type,
            params,
            content: el.content,
            data: undefined,
          },
          el.done
        );

        break;
      }

      default:
        break;
    }
  }

  return {
    state,
    handler,
    push: handlePushLog,
    tags: defaultTags,
    stepConfig: stepConfig,
  };
}
