import {
  smoothStream,
  streamText,
  type CoreMessage,
  type LanguageModelV1,
  type StreamTextResult,
  type ToolSet,
} from "ai";
import { task, type TaskContext } from "../task";
import type {
  Action,
  ActionCall,
  ActionCallContext,
  ActionContext,
  AnyAction,
  AnyAgent,
  AnyContext,
  Log,
  WorkingMemory,
} from "../types";
import type { Logger } from "../logger";
import { wrapStream } from "../streaming";
import type { parse } from "../xml";
import { randomUUIDv7 } from "../utils";

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
  "google/gemini-2.0-flash-001",
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
  isReasoningModel,
}: {
  model: LanguageModelV1;
  stream: StreamTextResult<ToolSet, never>;
  isReasoningModel: boolean;
}) {
  const prefix =
    modelsResponseConfig[model.modelId]?.prefix ??
    (isReasoningModel
      ? (modelsResponseConfig[model.modelId]?.thinkTag ?? "<think>")
      : "<response>");
  const suffix = "</response>";
  return {
    getTextResponse: async () => {
      const result = await stream.text;
      const text = prefix + result + suffix;
      return text;
    },
    stream: wrapStream(stream.textStream, prefix, suffix),
  };
}

type GenerateOptions = {
  prompt: string;
  workingMemory: WorkingMemory;
  logger: Logger;
  model: LanguageModelV1;
  onError: (error: unknown) => void;
  abortSignal?: AbortSignal;
};

export const runGenerate = task(
  "agent:run:generate",
  async (
    { prompt, workingMemory, model, onError, abortSignal }: GenerateOptions,
    { callId, debug }
  ) => {
    const isReasoningModel = reasoningModels.includes(model.modelId);

    const messages: CoreMessage[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
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
      onError: (event) => {
        console.log(event);
        onError(event.error);
      },
    });

    return prepareStreamResponse({
      model,
      stream,
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
    agent,
    logger,
  }: {
    ctx: ActionCallContext<any, TContext>;
    action: AnyAction;
    agent: AnyAgent;
    logger: Logger;
  }) => {
    logger.info(
      "agent:action_call:" + ctx.call.id,
      ctx.call.name,
      JSON.stringify(ctx.call.data)
    );

    try {
      const result =
        action.schema === undefined
          ? await (action as Action<undefined>).handler(ctx, agent)
          : await action.handler(ctx.call.data, ctx, agent);

      logger.debug("agent:action_result:" + ctx.call.id, ctx.call.name, result);
      return result;
    } catch (error) {
      logger.error("agent:action", "ACTION_FAILED", { error });

      if (action.onError) {
        await Promise.resolve(action.onError(error, ctx, agent));
      } else {
        throw error;
      }
    }
  }
);
