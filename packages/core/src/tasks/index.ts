import {
  streamText,
  type CoreMessage,
  type LanguageModel,
  type StreamTextResult,
  type ToolSet,
} from "ai";
import { task } from "../task";
import type {
  Action,
  ActionCallContext,
  AnyAction,
  AnyAgent,
  AnyContext,
  WorkingMemory,
  ContextState,
  Log,
  LogChunk,
  AnyRef,
  Output,
} from "../types";
import type { Logger } from "../logger";
import { wrapStream } from "../streaming";
import { modelsResponseConfig, reasoningModels } from "../configs";
import { generateText } from "ai";
import { type RequestContext } from "../tracking";
import { getRequestTracker } from "../tracking/tracker";
import { LogEventType, StructuredLogger } from "../logging-events";
import { createRequestContext } from "../tracking";
import { createEngine } from "../engine";
import { createContextStreamHandler, handleStream } from "../streaming";
import { mainPrompt } from "../prompts/main";
import { saveContextWorkingMemory } from "../context";

/**
 * Helper to extract model properties safely from LanguageModel union type
 */
function getModelInfo(model: LanguageModel): {
  modelId: string;
  provider: string;
} {
  if (typeof model === "string") {
    return { modelId: model, provider: "unknown" };
  }
  return {
    modelId: model.modelId || "unknown",
    provider: model.provider || "unknown",
  };
}
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
  model: LanguageModel;
  stream: StreamTextResult<ToolSet, never>;
  isReasoningModel: boolean;
}) {
  const { modelId } = getModelInfo(model);
  const prefix =
    modelsResponseConfig[modelId]?.prefix ??
    (isReasoningModel
      ? modelsResponseConfig[modelId]?.thinkTag ?? "<think>"
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
  structuredLogger?: StructuredLogger;
  model: LanguageModel;
  streaming: boolean;
  onError: (error: unknown) => void;
  requestContext?: RequestContext;
  contextSettings?: {
    modelSettings?: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      topK?: number;
      stopSequences?: string[];
      providerOptions?: Record<string, any>;
      [key: string]: any;
    };
  };
};

export const runGenerate = task({
  key: "agent:run:generate",
  handler: async (
    {
      prompt,
      workingMemory,
      model,
      streaming,
      onError,
      requestContext,
      contextSettings,
      structuredLogger,
    }: GenerateOptions,
    { abortSignal }
  ) => {
    const { modelId, provider } = getModelInfo(model);
    const isReasoningModel = reasoningModels.includes(modelId);
    const modelSettings = contextSettings?.modelSettings || {};

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

    if (modelsResponseConfig[modelId]?.assist !== false)
      messages.push({
        role: "assistant",
        content: isReasoningModel
          ? modelsResponseConfig[modelId]?.thinkTag ?? "<think>"
          : "<response>\n<reasoning>",
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

    const tracker = getRequestTracker();
    const startTime = Date.now();
    let modelCallId: string | undefined;

    // Start context and action tracking if requestContext is provided
    let contextTrackingContext = requestContext;
    let actionTrackingContext = requestContext;

    if (requestContext && requestContext.trackingEnabled) {
      // Start context tracking for the "generate" context
      contextTrackingContext = await tracker.startContextTracking(
        requestContext,
        `generate-${Date.now()}`, // Unique context ID
        "generate"
      );

      // Start action tracking for the "generate" action
      actionTrackingContext = await tracker.startActionCall(
        contextTrackingContext,
        "generate_text"
      );
    }

    try {
      // Log model call start event
      if (structuredLogger && actionTrackingContext) {
        structuredLogger.logEvent({
          eventType: LogEventType.MODEL_CALL_START,
          timestamp: startTime,
          requestContext: actionTrackingContext,
          provider: provider,
          modelId: modelId,
          callType: streaming ? "stream" : "generate",
          inputTokens: undefined, // Not available before the call
        });
      }

      if (!streaming) {
        const response = await generateText({
          model,
          messages,
          temperature: modelSettings.temperature ?? undefined,
          maxTokens: modelSettings.maxTokens,
          topP: modelSettings.topP,
          topK: modelSettings.topK,
          stopSequences: modelSettings.stopSequences,
          providerOptions: modelSettings.providerOptions,
          ...modelSettings,
        });

        const endTime = Date.now();

        // Track the model call
        if (actionTrackingContext && actionTrackingContext.trackingEnabled) {
          modelCallId = await tracker.trackModelCall(
            actionTrackingContext,
            "generate",
            modelId,
            provider,
            {
              tokenUsage: response.usage
                ? {
                    inputTokens: response.usage.inputTokens ?? 0,
                    outputTokens: response.usage.outputTokens ?? 0,
                    totalTokens: response.usage.totalTokens ?? 0,
                    reasoningTokens: (response.usage as any).reasoningTokens,
                  }
                : undefined,
              metrics: {
                modelId: modelId,
                provider: provider,
                totalTime: endTime - startTime,
                tokensPerSecond: response.usage
                  ? (response.usage.outputTokens ?? 0) /
                    ((endTime - startTime) / 1000)
                  : undefined,
              },
            }
          );
        }

        // Log structured model call complete event
        if (structuredLogger && actionTrackingContext && response.usage) {
          const tokenUsage = {
            inputTokens: response.usage.inputTokens ?? 0,
            outputTokens: response.usage.outputTokens ?? 0,
            totalTokens: response.usage.totalTokens ?? 0,
            reasoningTokens: (response.usage as any).reasoningTokens,
          };

          // Add cost estimation if tracking is enabled
          const tracker = getRequestTracker();
          const config = tracker.getConfig();
          if (config.trackCosts && config.costEstimation) {
            const { estimateCost } = await import("../tracking");
            // Try multiple provider key combinations for better matching
            const providerKeys = [
              `${provider}/${modelId}`, // e.g., "openrouter.chat/google/gemini-2.5-pro"
              provider, // e.g., "openrouter.chat"
              modelId.split("/")[0], // e.g., "google"
            ];

            let cost = 0;
            for (const providerKey of providerKeys) {
              cost = estimateCost(
                tokenUsage,
                providerKey,
                config.costEstimation
              );
              if (cost > 0) break; // Found a matching cost configuration
            }
            (tokenUsage as any).estimatedCost = cost;
          }

          structuredLogger.logEvent({
            eventType: LogEventType.MODEL_CALL_COMPLETE,
            timestamp: endTime,
            requestContext: actionTrackingContext,
            provider: provider,
            modelId: modelId,
            callType: "generate",
            tokenUsage,
            metrics: {
              modelId: modelId,
              provider: provider,
              totalTime: endTime - startTime,
              tokensPerSecond:
                (response.usage.outputTokens ?? 0) /
                ((endTime - startTime) / 1000),
            },
          });
        }

        let getTextResponse = async () => response.text;
        let stream = textToStream(response.text);

        return { getTextResponse, stream };
      } else {
        const stream = streamText({
          model,
          messages,
          stopSequences: modelSettings.stopSequences ?? ["\n</response>"],
          temperature: modelSettings.temperature ?? undefined,
          maxTokens: modelSettings.maxTokens,
          topP: modelSettings.topP,
          topK: modelSettings.topK,
          abortSignal,
          // experimental_transform: smoothStream({
          //   chunking: "word",
          // }),
          providerOptions: modelSettings.providerOptions || {
            openrouter: {
              reasoning: {
                max_tokens: 32768,
              },
            },
          },
          onError: (event) => {
            onError(event.error);
          },
          ...modelSettings,
        });

        // Track streaming model call when it completes
        if (actionTrackingContext && actionTrackingContext.trackingEnabled) {
          // Track after stream finishes - we'll use a simpler approach
          stream.usage
            .then(async (usage) => {
              const endTime = Date.now();

              await tracker.trackModelCall(
                actionTrackingContext,
                "stream",
                modelId,
                provider,
                {
                  tokenUsage: usage
                    ? {
                        inputTokens: usage.inputTokens ?? 0,
                        outputTokens: usage.outputTokens ?? 0,
                        totalTokens: usage.totalTokens ?? 0,
                        reasoningTokens: (usage as any).reasoningTokens,
                      }
                    : undefined,
                  metrics: {
                    modelId: modelId,
                    provider: provider,
                    totalTime: endTime - startTime,
                    tokensPerSecond: usage
                      ? (usage.outputTokens ?? 0) /
                        ((endTime - startTime) / 1000)
                      : undefined,
                  },
                }
              );

              // Log structured model call complete event for streaming
              if (structuredLogger && actionTrackingContext && usage) {
                const tokenUsage = {
                  inputTokens: usage.inputTokens ?? 0,
                  outputTokens: usage.outputTokens ?? 0,
                  totalTokens: usage.totalTokens ?? 0,
                  reasoningTokens: (usage as any).reasoningTokens,
                };

                // Add cost estimation if tracking is enabled
                const tracker = getRequestTracker();
                const config = tracker.getConfig();
                if (config.trackCosts && config.costEstimation) {
                  const { estimateCost } = await import("../tracking");
                  // Try multiple provider key combinations for better matching
                  const providerKeys = [
                    `${provider}/${modelId}`, // e.g., "openrouter.chat/google/gemini-2.5-pro"
                    provider, // e.g., "openrouter.chat"
                    modelId.split("/")[0], // e.g., "google"
                  ];

                  let cost = 0;
                  for (const providerKey of providerKeys) {
                    cost = estimateCost(
                      tokenUsage,
                      providerKey,
                      config.costEstimation
                    );
                    if (cost > 0) break; // Found a matching cost configuration
                  }
                  (tokenUsage as any).estimatedCost = cost;
                }

                structuredLogger.logEvent({
                  eventType: LogEventType.MODEL_CALL_COMPLETE,
                  timestamp: endTime,
                  requestContext: actionTrackingContext,
                  provider: provider,
                  modelId: modelId,
                  callType: "stream",
                  tokenUsage,
                  metrics: {
                    modelId: modelId,
                    provider: provider,
                    totalTime: endTime - startTime,
                    tokensPerSecond:
                      (usage.outputTokens ?? 0) /
                      ((endTime - startTime) / 1000),
                  },
                });
              }

              // Complete action tracking for successful streaming
              if (
                actionTrackingContext &&
                actionTrackingContext.actionCallId &&
                actionTrackingContext.trackingEnabled
              ) {
                await tracker.completeActionCall(
                  actionTrackingContext.actionCallId,
                  "completed"
                );
              }
            })
            .catch(async (error: any) => {
              // Track failed streaming call
              if (
                actionTrackingContext &&
                actionTrackingContext.trackingEnabled
              ) {
                await tracker.trackModelCall(
                  actionTrackingContext,
                  "stream",
                  modelId,
                  provider,
                  {
                    error: {
                      message: error.message || "Stream failed",
                      cause: error,
                    },
                    metrics: {
                      modelId: modelId,
                      provider: provider,
                      totalTime: Date.now() - startTime,
                    },
                  }
                );
              }

              // Complete action tracking for failed streaming
              if (
                actionTrackingContext &&
                actionTrackingContext.actionCallId &&
                actionTrackingContext.trackingEnabled
              ) {
                await tracker.completeActionCall(
                  actionTrackingContext.actionCallId,
                  "failed",
                  {
                    message: error.message || "Stream failed",
                    cause: error,
                  }
                );
              }
            });
        }

        return prepareStreamResponse({
          model,
          stream,
          isReasoningModel,
        });
      }
    } catch (error) {
      // Track failed model call
      if (actionTrackingContext && actionTrackingContext.trackingEnabled) {
        const endTime = Date.now();
        await tracker.trackModelCall(
          actionTrackingContext,
          streaming ? "stream" : "generate",
          modelId,
          provider,
          {
            error: {
              message:
                error instanceof Error ? error.message : "Model call failed",
              cause: error,
            },
            metrics: {
              modelId: modelId,
              provider: provider,
              totalTime: endTime - startTime,
            },
          }
        );
      }

      // Log structured model call error event
      if (structuredLogger && actionTrackingContext) {
        structuredLogger.logEvent({
          eventType: LogEventType.MODEL_CALL_ERROR,
          timestamp: Date.now(),
          requestContext: actionTrackingContext,
          provider: provider,
          modelId: modelId,
          callType: streaming ? "stream" : "generate",
          error: {
            message:
              error instanceof Error ? error.message : "Model call failed",
            cause: error,
          },
        });
      }

      // Complete action and context tracking with error
      if (
        actionTrackingContext &&
        actionTrackingContext.actionCallId &&
        actionTrackingContext.trackingEnabled
      ) {
        await tracker.completeActionCall(
          actionTrackingContext.actionCallId,
          "failed",
          {
            message:
              error instanceof Error ? error.message : "Generate action failed",
            cause: error,
          }
        );
      }

      onError(error);
      throw error;
    } finally {
      // Complete action and context tracking for non-streaming calls
      if (
        !streaming &&
        actionTrackingContext &&
        actionTrackingContext.actionCallId &&
        actionTrackingContext.trackingEnabled
      ) {
        await tracker.completeActionCall(
          actionTrackingContext.actionCallId,
          "completed"
        );
      }
    }
  },
});

async function* textToStream(
  text: string,
  chunkSize = 10
): AsyncGenerator<string> {
  for (let i = 0; i < text.length; i += chunkSize) {
    const chunk = text.slice(i, i + chunkSize);
    yield chunk;
    // Optional: add a small delay to simulate streaming
    // await new Promise(resolve => setTimeout(resolve, 10));
  }
}

/**
 * Task that executes a complete agent context run
 * This replaces the direct agent.run() to provide proper concurrency control
 */
export const runAgentContext = task({
  key: "agent:run:context",
  concurrency: 1, // Only 1 execution per queue (per context)
  retry: false, // Context runs shouldn't retry
  handler: async (
    params: {
      agent: AnyAgent;
      context: AnyContext;
      args: unknown;
      outputs?: Record<string, Omit<Output<any, any, AnyContext, any>, "type">>;
      handlers?: Record<string, unknown>;
      requestContext?: RequestContext;
      chain?: Log[];
      model?: LanguageModel;
    },
    { abortSignal }
  ) => {
    const { agent, context, args, outputs, handlers, requestContext, chain } =
      params;

    const model =
      params.model ?? context.model ?? agent.reasoningModel ?? agent.model;
    if (!model) throw new Error("no model");

    // Create request context if not provided
    let effectiveRequestContext = requestContext;
    if (!effectiveRequestContext) {
      effectiveRequestContext = createRequestContext("agent:run", {
        trackingEnabled: false,
      });
    }

    // Start agent run tracking
    let agentRunContext = effectiveRequestContext;
    const tracker = getRequestTracker();
    const startTime = Date.now();

    if (effectiveRequestContext && effectiveRequestContext.trackingEnabled) {
      agentRunContext = await tracker.startAgentRun(
        effectiveRequestContext,
        "agent"
      );
    }

    // Log structured agent start event
    const structuredLogger = agent.container?.resolve?.("structuredLogger") as
      | StructuredLogger
      | undefined;
    if (structuredLogger) {
      structuredLogger.logEvent({
        eventType: LogEventType.AGENT_START,
        timestamp: startTime,
        requestContext: agentRunContext,
        agentName: "agent",
        configuration: {
          contextType: context.type,
          hasArgs: !!args,
          hasCustomOutputs: !!outputs,
          hasHandlers: !!handlers,
          model: model,
        },
      });
    }

    const ctxId = agent.getContextId({ context, args });

    // Get context state and working memory
    const ctxState = await agent.getContext({ context, args });
    const workingMemory = await agent.getWorkingMemory(ctxId);
    const agentCtxState = await agent.getAgentContext();

    // Create engine and streaming components

    // Create empty subscriptions for this execution
    const subscriptions = new Set<(ref: AnyRef, done: boolean) => void>();
    const chunkSubscriptions = new Set<(chunk: LogChunk) => void>();

    const engine = createEngine({
      agent,
      ctxState: ctxState,
      workingMemory,
      handlers,
      agentCtxState: agentCtxState,
      subscriptions,
      __chunkSubscriptions: chunkSubscriptions,
    });

    const { streamState, streamHandler, tags, __streamChunkHandler } =
      createContextStreamHandler({
        abortSignal,
        pushLog(log: Log, done: boolean) {
          engine.push(log, done, false);
        },
        __pushLogChunk(chunk: LogChunk) {
          engine.pushChunk(chunk);
        },
      });

    await engine.setParams({
      actions: undefined,
      outputs: outputs,
      contexts: undefined,
    });

    let stepRef = await engine.start();

    if (chain) {
      for (const log of chain) {
        await engine.push(log);
      }
    }

    await engine.settled();

    const { state } = engine;
    let maxSteps = 0;

    function getMaxSteps() {
      return state.contexts.reduce(
        (maxSteps, ctxState) =>
          Math.max(
            maxSteps,
            ctxState.settings.maxSteps ?? ctxState.context.maxSteps ?? 0
          ),
        5
      );
    }

    while ((maxSteps = getMaxSteps()) >= state.step) {
      try {
        if (state.step > 1) {
          stepRef = await engine.nextStep();
          streamState.index++;
        }

        const promptData = mainPrompt.formatter({
          contexts: state.contexts,
          actions: state.actions,
          outputs: state.outputs,
          workingMemory,
          chainOfThoughtSize: 0,
          maxWorkingMemorySize: ctxState.settings.maxWorkingMemorySize,
        });

        const prompt = mainPrompt.render(promptData);
        stepRef.data.prompt = prompt;

        let streamError: unknown = null;

        const unprocessed = [
          ...workingMemory.inputs.filter((i) => i.processed === false),
          ...state.chain.filter((i) => i.processed === false),
        ];

        // Use runGenerate task with shared LLM queue
        const { stream, getTextResponse } = await agent.taskRunner.enqueueTask(
          runGenerate,
          {
            model,
            prompt,
            workingMemory,
            logger: agent.logger,
            structuredLogger: agent.container?.resolve?.("structuredLogger") as
              | StructuredLogger
              | undefined,
            streaming: true,
            contextSettings: ctxState.settings,
            requestContext: agentRunContext,
            onError: (error: unknown) => {
              streamError = error;
            },
          },
          {
            abortSignal,
            queueKey: "llm", // Shared LLM queue
          }
        );

        await handleStream(
          stream,
          streamState.index,
          tags,
          streamHandler,
          __streamChunkHandler
        );

        if (streamError) {
          throw streamError;
        }

        const response = await getTextResponse();
        stepRef.data.response = response;

        unprocessed.forEach((i) => {
          (i as { processed: boolean }).processed = true;
        });

        await engine.settled();
        stepRef.processed = true;

        // Save working memory
        await saveContextWorkingMemory(agent, ctxState.id, workingMemory);

        await Promise.all(
          state.contexts.map((state) =>
            state.context.onStep?.(
              {
                ...state,
                workingMemory,
              },
              agent
            )
          )
        );

        await Promise.all(
          state.contexts.map((state) => agent.saveContext(state))
        );

        if (!engine.shouldContinue()) break;

        state.step++;
      } catch (error) {
        agent.logger.error("agent:run", "Step execution failed", {
          error,
          step: state.step,
          contextId: ctxState.id,
        });

        await Promise.allSettled([
          saveContextWorkingMemory(agent, ctxState.id, workingMemory),
          ...state.contexts.map((state) => agent.saveContext(state)),
        ]);

        if (context.onError) {
          try {
            await context.onError(
              error,
              {
                ...ctxState,
                workingMemory,
              },
              agent
            );
          } catch (error) {
            break;
          }
        } else {
          break;
        }
      }
    }

    await Promise.all(
      state.contexts.map((state) =>
        state.context.onRun?.(
          {
            ...state,
            workingMemory,
          },
          agent
        )
      )
    );

    await Promise.all(state.contexts.map((state) => agent.saveContext(state)));

    // Complete agent run tracking
    if (
      agentRunContext &&
      agentRunContext.agentRunId &&
      agentRunContext.trackingEnabled
    ) {
      await tracker.completeAgentRun(agentRunContext.agentRunId, "completed");
    }

    const executionTime = Date.now() - startTime;

    // Log structured agent complete event
    if (structuredLogger) {
      structuredLogger.logEvent({
        eventType: LogEventType.AGENT_COMPLETE,
        timestamp: Date.now(),
        requestContext: agentRunContext,
        agentName: "agent",
        executionTime,
      });
    }

    agent.logger.info("agent:run", "Run completed", {
      contextId: ctxState.id,
      chainLength: state.chain.length,
      executionTime,
    });

    return state.chain;
  },
});

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
export const runAction = task({
  key: "agent:run:action",
  handler: async <TContext extends AnyContext>({
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
          ? await (action as Action<undefined>).handler(
              ctx as unknown as ActionCallContext<undefined, AnyContext>,
              agent
            )
          : await (action.handler as any)(ctx.call.data, ctx, agent);

      logger.debug("agent:action_result:" + ctx.call.id, ctx.call.name, result);

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorDetails = {
        actionName: ctx.call.name,
        callId: ctx.call.id,
        error: errorMessage,
        errorStack: error instanceof Error ? error.stack : undefined,
        callData: ctx.call.data,
      };

      logger.error(
        "agent:action",
        `Action '${ctx.call.name}' failed: ${errorMessage}`,
        errorDetails
      );

      if (action.onError) {
        return await action.onError(error, ctx as any, agent);
      } else {
        throw error;
      }
    }
  },
});
