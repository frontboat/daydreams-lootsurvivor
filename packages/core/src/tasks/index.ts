import {
  smoothStream,
  streamText,
  type CoreMessage,
  type LanguageModelV1,
  type StreamTextResult,
  type ToolSet,
} from "ai";
import { parse, prompt, resultsPrompt } from "../prompts/main";
import { task, type TaskContext } from "../task";
import { formatContext, formatContexts } from "../formatters";
import { renderWorkingMemory } from "../context";
import type {
  Action,
  ActionCall,
  ActionContext,
  AnyAction,
  AnyAgent,
  AnyContext,
  ContextState,
  Log,
  Output,
  WorkingMemory,
} from "../types";
import type { Logger } from "../logger";
import { wrapStream } from "../streaming";

type ModelConfig = {
  assist?: boolean;
  prefix?: string;
  thinkTag?: string;
};

// TODO: move this
export const modelsResponseConfig: Record<string, ModelConfig> = {
  "o3-mini": {
    assist: false,
    prefix: "",
  },
  "claude-3-7-sonnet-20250219": {
    // assist: true,
    // prefix: "<thinking>",
    // thinkTag: "<thinking>",
  },
  "qwen-qwq-32b": {
    prefix: "",
  },
  "deepseek-r1-distill-llama-70b": {
    prefix: "",
    assist: false,
  },
};

export const reasoningModels = [
  "claude-3-7-sonnet-20250219",
  "qwen-qwq-32b",
  "deepseek-r1-distill-llama-70b",
  "o3-mini",
];

/**
 * Prepares a stream response by handling the stream result and parsing it.
 *
 * @param options - Configuration options
 * @param options.contextId - The ID of the context
 * @param options.step - The current step in the process
 * @param options.stream - The stream result to process
 * @param options.logger - The logger instance
 * @param options.task - The task context containing callId and debug function
 * @returns An object containing the parsed response promise and wrapped text stream
 */
function prepareStreamResponse({
  model,
  stream,
  logger,
  contextId,
  step,
  task: { callId, debug },
  isReasoningModel,
}: {
  model: LanguageModelV1;
  contextId: string;
  step: string;
  stream: StreamTextResult<ToolSet, never>;
  logger: Logger;
  task: TaskContext;
  isReasoningModel: boolean;
}) {
  const prefix =
    modelsResponseConfig[model.modelId]?.prefix ??
    (isReasoningModel
      ? (modelsResponseConfig[model.modelId]?.thinkTag ?? "<think>")
      : "<response>");
  const suffix = "</response>";

  const response = new Promise<ReturnType<typeof parse>>(
    async (resolve, reject) => {
      try {
        const result = await stream.text;
        const text = prefix + result + suffix;

        debug(contextId, [step, callId], text);

        logger.debug("agent:response", text, {
          contextId,
          callId,
        });

        resolve(parse(text));
      } catch (error) {
        reject(error);
      }
    }
  );

  return {
    response,
    stream: wrapStream(stream.textStream, prefix, suffix),
  };
}

type GenerateOptions = {
  agent: AnyAgent;
  contexts: ContextState<AnyContext>[];
  contextId: string;
  workingMemory: WorkingMemory;
  outputs: Output[];
  actions: AnyAction[];
  logger: Logger;
  model: LanguageModelV1;
  chain: Log[];
  abortSignal?: AbortSignal;
};

/**
 * Task that generates a response from the agent based on the current context and working memory.
 *
 * @param options - Configuration options
 * @param options.agent - The agent instance
 * @param options.contexts - Array of context states
 * @param options.contextId - The ID of the current context
 * @param options.workingMemory - The working memory state
 * @param options.outputs - Available outputs
 * @param options.actions - Available actions
 * @param options.logger - The logger instance
 * @param options.model - The language model to use
 * @param taskContext - The task context containing callId and debug function
 * @returns The prepared stream response with parsed result and text stream
 */
export const runGenerate = task(
  "agent:run:generate",
  async (
    {
      contexts,
      workingMemory,
      outputs,
      actions,
      logger,
      model,
      contextId,
      abortSignal,
    }: GenerateOptions,
    { callId, debug }
  ) => {
    debug(
      contextId,
      ["workingMemory", callId],
      JSON.stringify(workingMemory, null, 2)
    );

    const mainContext = contexts.find((ctx) => ctx.id === contextId)!;

    const system = prompt({
      context: formatContexts(contextId, contexts, workingMemory),
      outputs,
      actions,
      updates: formatContext({
        type: mainContext.context.type,
        key: mainContext.key,
        content: renderWorkingMemory({
          memory: {
            inputs: workingMemory.inputs,
            results: workingMemory.results,
          },
          processed: false,
        }),
      }),
    });

    debug(contextId, ["prompt", callId], system);

    logger.debug("agent:system", system);

    const isReasoningModel = reasoningModels.includes(model.modelId);

    const messages: CoreMessage[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: system,
          },
        ],
      },
    ];

    if (modelsResponseConfig[model.modelId]?.assist !== false)
      messages.push({
        role: "assistant",
        content: isReasoningModel
          ? (modelsResponseConfig[model.modelId]?.thinkTag ?? "<think>")
          : "<response>",
      });

    if (workingMemory.currentImage) {
      messages[0].content = [
        ...messages[0].content,
        {
          type: "image",
          image: workingMemory.currentImage,
        },
      ] as CoreMessage["content"];
    }

    const stream = streamText({
      model,
      messages,
      stopSequences: ["</response>"],
      temperature: 0.6,
      abortSignal,
      experimental_transform: smoothStream({
        chunking: "word",
      }),
      onError: (error) => {
        console.error(error);
      },
      providerOptions: {
        // TODO: providerOptions
        // openai: isReasoningModel
        //   ? {
        //       reasoningEffort: "low",
        //     }
        //   : {},
        // anthropic: {
        //   thinking: {
        //     type: isReasoningModel ? "enabled" : "disabled",
        //     budgetTokens: 12000,
        //   },
        // },
      },
    });

    return prepareStreamResponse({
      model,
      step: "response",
      contextId,
      logger,
      stream,
      task: { callId, debug },
      isReasoningModel,
    });
  }
);

/**
 * Task that generates results based on the agent's actions and working memory.
 *
 * @param options - Configuration options
 * @param options.agent - The agent instance
 * @param options.contexts - Array of context states
 * @param options.contextId - The ID of the current context
 * @param options.workingMemory - The working memory state
 * @param options.outputs - Available outputs
 * @param options.actions - Available actions
 * @param options.logger - The logger instance
 * @param options.model - The language model to use
 * @param options.chain - Array of logs representing the action chain
 * @param taskContext - The task context containing callId and debug function
 * @returns The prepared stream response with parsed result and text stream
 */
export const runGenerateResults = task(
  "agent:run:generate-results",
  async (
    {
      contexts,
      workingMemory,
      outputs,
      actions,
      logger,
      model,
      contextId,
      chain,
      abortSignal,
    }: GenerateOptions,
    { callId, debug }
  ) => {
    debug(
      contextId,
      ["workingMemory", callId],
      JSON.stringify(workingMemory, null, 2)
    );

    const mainContext = contexts.find((ctx) => ctx.id === contextId)!;

    const system = resultsPrompt({
      context: formatContexts(contextId, contexts, workingMemory),
      outputs,
      actions,
      updates: formatContext({
        type: mainContext.context.type,
        key: mainContext.key,
        content: renderWorkingMemory({
          memory: {
            inputs: workingMemory.inputs,
          },
          processed: false,
        }),
      }),
      logs: chain.filter((i) =>
        i.ref === "action_result" ? false : i.processed !== true
      ),
      results: workingMemory.results.filter((i) => i.processed !== true),
    });

    debug(contextId, ["prompt-results", callId], system);

    logger.debug("agent:system", system, {
      contextId,
      callId,
    });

    const isReasoningModel = reasoningModels.includes(model.modelId);

    const messages: CoreMessage[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: system,
          },
        ],
      },
    ];

    if (modelsResponseConfig[model.modelId]?.assist !== false)
      messages.push({
        role: "assistant",
        content: isReasoningModel
          ? (modelsResponseConfig[model.modelId]?.thinkTag ?? "<think>")
          : "<response>",
      });

    if (workingMemory.currentImage) {
      messages[0].content = [
        ...messages[0].content,
        {
          type: "image",
          image: workingMemory.currentImage,
        },
      ] as CoreMessage["content"];
    }

    const stream = streamText({
      model,
      messages,
      stopSequences: ["</response>"],
      temperature: 0.6,
      abortSignal,
      experimental_transform: smoothStream({
        chunking: "word",
      }),
      onError: (error) => {
        console.error(error);
      },
    });

    return prepareStreamResponse({
      model,
      step: "results-response",
      contextId,
      logger,
      stream,
      task: { callId, debug },
      isReasoningModel,
    });
  }
);

/**
 * Task that executes an action with the given context and parameters.
 *
 * @param options - Configuration options
 * @param options.ctx - The agent context with memory
 * @param options.action - The action to execute
 * @param options.call - The action call details
 * @param options.agent - The agent instance
 * @param options.logger - The logger instance
 * @returns The result of the action execution
 * @throws Will throw an error if the action execution fails
 */
export const runAction = task(
  "agent:run:action",
  async <TContext extends AnyContext>({
    ctx,
    action,
    call,
    agent,
    logger,
  }: {
    ctx: ActionContext<TContext>;
    action: AnyAction;
    call: ActionCall;
    agent: AnyAgent;
    logger: Logger;
  }) => {
    try {
      logger.info(
        "agent:action_call:" + call.id,
        call.name,
        JSON.stringify(call.data)
      );

      call.processed = true;

      const result =
        action.schema === undefined
          ? await (action as Action<undefined>).handler(
              {
                ...ctx,
                call,
              },
              agent
            )
          : await action.handler(
              call.data,
              {
                ...ctx,
                call,
              },
              agent
            );

      logger.debug("agent:action_result:" + call.id, call.name, result);
      return result;
    } catch (error) {
      logger.error("agent:action", "ACTION_FAILED", { error });

      if (action.onError) {
        await Promise.resolve(
          action.onError(
            error,
            action.schema === undefined ? undefined : call.data,
            {
              ...ctx,
              call,
            },
            agent
          )
        );
      } else {
        throw error;
      }
    }
  }
);
