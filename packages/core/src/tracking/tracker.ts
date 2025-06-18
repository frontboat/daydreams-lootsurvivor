import { v7 as randomUUIDv7 } from "uuid";
import type {
  RequestTracking,
  AgentRunTracking,
  ContextTracking,
  ActionCallTracking,
  ModelCall,
  RequestContext,
  RequestTrackingConfig,
  RequestTrackingStorage,
  TokenUsage,
  ModelCallMetrics,
} from "../tracking";
import {
  aggregateTokenUsage,
  estimateCost,
  createRequestContext,
  createAgentRunContext,
  createContextTrackingContext,
  createActionCallContext,
} from "../tracking";
import {
  InMemoryRequestTrackingStorage,
  NoOpRequestTrackingStorage,
} from "./storage";
import type { Logger } from "../logger";

/**
 * Central request tracker that manages hierarchical tracking
 */
export class RequestTracker {
  private config: RequestTrackingConfig;
  private storage: RequestTrackingStorage;
  private activeRequests = new Map<string, RequestTracking>();
  private activeAgentRuns = new Map<string, AgentRunTracking>();
  private activeContexts = new Map<string, ContextTracking>();
  private activeActionCalls = new Map<string, ActionCallTracking>();
  private logger?: Logger;

  constructor(config?: Partial<RequestTrackingConfig>, logger?: Logger) {
    this.config = {
      enabled: true,
      trackTokenUsage: true,
      trackPerformance: true,
      trackCosts: true,
      enableLogging: true,
      logLevel: "debug",
      ...config,
    };

    this.storage = config?.storage
      ? config.storage
      : this.config.enabled
      ? new InMemoryRequestTrackingStorage()
      : new NoOpRequestTrackingStorage();

    this.logger = logger;
  }

  /**
   * Check if logging should be performed based on configuration
   */
  private shouldLog(
    level: "trace" | "debug" | "info" | "warn" | "error"
  ): boolean {
    if (!this.config.enableLogging || !this.logger) {
      return false;
    }

    const levelOrder = { trace: 0, debug: 1, info: 2, warn: 3, error: 4 };
    const configLevel = this.config.logLevel || "debug";

    return levelOrder[level] >= levelOrder[configLevel];
  }

  /**
   * Start tracking a new request
   */
  async startRequest(
    source: string,
    options?: {
      userId?: string;
      sessionId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<RequestContext> {
    if (!this.config.enabled) {
      return createRequestContext(source, {
        ...options,
        trackingEnabled: false,
      });
    }

    const context = createRequestContext(source, options);
    const request: RequestTracking = {
      id: context.requestId,
      userId: options?.userId,
      sessionId: options?.sessionId,
      source,
      startTime: Date.now(),
      agentRuns: [],
      status: "running",
      metadata: options?.metadata,
    };

    this.activeRequests.set(request.id, request);
    await this.storage.storeRequest(request);

    if (this.shouldLog("debug")) {
      this.logger!.debug(
        "RequestTracker",
        `Started tracking request: ${request.id}`,
        {
          requestId: request.id,
          source,
          userId: options?.userId,
          sessionId: options?.sessionId,
        }
      );
    }

    return context;
  }

  /**
   * Complete a request
   */
  async completeRequest(
    requestId: string,
    status: "completed" | "failed" = "completed",
    error?: { message: string; cause?: unknown }
  ): Promise<void> {
    if (!this.config.enabled) return;

    const request = this.activeRequests.get(requestId);
    if (!request) return;

    request.endTime = Date.now();
    request.status = status;
    if (error) {
      request.error = error;
    }

    // Aggregate metrics from all agent runs
    if (request.agentRuns.length > 0) {
      const tokenUsages = request.agentRuns
        .map((run) => run.totalTokenUsage)
        .filter((usage): usage is TokenUsage => usage !== undefined);

      if (tokenUsages.length > 0) {
        request.totalTokenUsage = aggregateTokenUsage(tokenUsages);
      }

      request.totalCost = request.agentRuns.reduce(
        (sum, run) => sum + (run.totalCost || 0),
        0
      );
    }

    await this.storage.storeRequest(request);
    this.activeRequests.delete(requestId);

    const duration = request.endTime - request.startTime;
    const logData = {
      requestId,
      status,
      duration,
      totalTokens: request.totalTokenUsage?.totalTokens,
      totalCost: request.totalCost,
      agentRuns: request.agentRuns.length,
      error: error?.message,
    };

    if (status === "failed" && this.shouldLog("warn")) {
      this.logger!.warn(
        "RequestTracker",
        `Request failed: ${requestId}`,
        logData
      );
    } else if (status === "completed" && this.shouldLog("info")) {
      this.logger!.info(
        "RequestTracker",
        `Request completed: ${requestId}`,
        logData
      );
    }
  }

  /**
   * Start tracking an agent run
   */
  async startAgentRun(
    parentContext: RequestContext,
    agentName: string
  ): Promise<RequestContext> {
    if (!this.config.enabled || !parentContext.trackingEnabled) {
      return createAgentRunContext(parentContext, agentName);
    }

    const context = createAgentRunContext(parentContext, agentName);
    const agentRun: AgentRunTracking = {
      id: context.agentRunId!,
      agentName,
      requestId: context.requestId,
      startTime: Date.now(),
      contexts: [],
      status: "running",
    };

    this.activeAgentRuns.set(agentRun.id, agentRun);

    // Add to parent request
    const request = this.activeRequests.get(context.requestId);
    if (request) {
      request.agentRuns.push(agentRun);
    }

    if (this.shouldLog("debug")) {
      this.logger!.debug("RequestTracker", `Started agent run: ${agentName}`, {
        agentRunId: agentRun.id,
        agentName,
        requestId: context.requestId,
      });
    }

    return context;
  }

  /**
   * Complete an agent run
   */
  async completeAgentRun(
    agentRunId: string,
    status: "completed" | "failed" = "completed",
    error?: { message: string; cause?: unknown }
  ): Promise<void> {
    if (!this.config.enabled) return;

    const agentRun = this.activeAgentRuns.get(agentRunId);
    if (!agentRun) return;

    agentRun.endTime = Date.now();
    agentRun.status = status;
    if (error) {
      agentRun.error = error;
    }

    // Aggregate metrics from all contexts
    if (agentRun.contexts.length > 0) {
      const tokenUsages = agentRun.contexts
        .map((ctx) => ctx.totalTokenUsage)
        .filter((usage): usage is TokenUsage => usage !== undefined);

      if (tokenUsages.length > 0) {
        agentRun.totalTokenUsage = aggregateTokenUsage(tokenUsages);
      }

      agentRun.totalCost = agentRun.contexts.reduce(
        (sum, ctx) => sum + (ctx.totalCost || 0),
        0
      );
    }

    this.activeAgentRuns.delete(agentRunId);

    const duration = agentRun.endTime - agentRun.startTime;
    const logData = {
      agentRunId,
      agentName: agentRun.agentName,
      status,
      duration,
      totalTokens: agentRun.totalTokenUsage?.totalTokens,
      totalCost: agentRun.totalCost,
      contexts: agentRun.contexts.length,
      error: error?.message,
    };

    if (status === "failed" && this.shouldLog("warn")) {
      this.logger!.warn(
        "RequestTracker",
        `Agent run failed: ${agentRun.agentName}`,
        logData
      );
    } else if (status === "completed" && this.shouldLog("debug")) {
      this.logger!.debug(
        "RequestTracker",
        `Agent run completed: ${agentRun.agentName}`,
        logData
      );
    }
  }

  /**
   * Start tracking a context
   */
  async startContextTracking(
    parentContext: RequestContext,
    contextId: string,
    contextType: string
  ): Promise<RequestContext> {
    if (!this.config.enabled || !parentContext.trackingEnabled) {
      return createContextTrackingContext(
        parentContext,
        contextId,
        contextType
      );
    }

    const context = createContextTrackingContext(
      parentContext,
      contextId,
      contextType
    );
    const contextTracking: ContextTracking = {
      id: contextId,
      type: contextType,
      agentRunId: context.agentRunId!,
      requestId: context.requestId,
      startTime: Date.now(),
      actionCalls: [],
      memoryOperations: 0,
    };

    this.activeContexts.set(contextId, contextTracking);

    // Add to parent agent run
    const agentRun = this.activeAgentRuns.get(context.agentRunId!);
    if (agentRun) {
      agentRun.contexts.push(contextTracking);
    }

    return context;
  }

  /**
   * Update context last used time and memory operations
   */
  async updateContext(
    contextId: string,
    updates: {
      memoryOperations?: number;
    }
  ): Promise<void> {
    if (!this.config.enabled) return;

    const context = this.activeContexts.get(contextId);
    if (!context) return;

    context.lastUsedTime = Date.now();
    if (updates.memoryOperations !== undefined) {
      context.memoryOperations += updates.memoryOperations;
    }
  }

  /**
   * Start tracking an action call
   */
  async startActionCall(
    parentContext: RequestContext,
    actionName: string
  ): Promise<RequestContext> {
    if (!this.config.enabled || !parentContext.trackingEnabled) {
      return createActionCallContext(parentContext, actionName);
    }

    const context = createActionCallContext(parentContext, actionName);
    const actionCall: ActionCallTracking = {
      id: context.actionCallId!,
      contextId: context.contextId!,
      agentRunId: context.agentRunId!,
      requestId: context.requestId,
      actionName,
      startTime: Date.now(),
      modelCalls: [],
      status: "running",
    };

    this.activeActionCalls.set(actionCall.id, actionCall);

    // Add to parent context
    const contextTracking = this.activeContexts.get(context.contextId!);
    if (contextTracking) {
      contextTracking.actionCalls.push(actionCall);
    }

    return context;
  }

  /**
   * Complete an action call
   */
  async completeActionCall(
    actionCallId: string,
    status: "completed" | "failed" = "completed",
    error?: { message: string; cause?: unknown }
  ): Promise<void> {
    if (!this.config.enabled) return;

    const actionCall = this.activeActionCalls.get(actionCallId);
    if (!actionCall) return;

    actionCall.endTime = Date.now();
    actionCall.status = status;
    if (error) {
      actionCall.error = error;
    }

    // Aggregate metrics from all model calls
    if (actionCall.modelCalls.length > 0) {
      const tokenUsages = actionCall.modelCalls
        .map((call) => call.tokenUsage)
        .filter((usage): usage is TokenUsage => usage !== undefined);

      if (tokenUsages.length > 0) {
        actionCall.totalTokenUsage = aggregateTokenUsage(tokenUsages);
      }

      actionCall.totalCost = actionCall.modelCalls.reduce(
        (sum, call) => sum + (call.tokenUsage?.estimatedCost || 0),
        0
      );
    }

    this.activeActionCalls.delete(actionCallId);

    // Update parent context metrics
    await this.updateContextMetrics(actionCall.contextId);
  }

  /**
   * Track a model call
   */
  async trackModelCall(
    parentContext: RequestContext,
    callType: ModelCall["callType"],
    modelId: string,
    provider: string,
    options?: {
      tokenUsage?: TokenUsage;
      metrics?: Partial<ModelCallMetrics>;
      error?: { message: string; code?: string; cause?: unknown };
    }
  ): Promise<string> {
    if (!this.config.enabled || !parentContext.trackingEnabled) {
      return "no-op";
    }

    const modelCall: ModelCall = {
      id: randomUUIDv7(),
      actionCallId: parentContext.actionCallId!,
      contextId: parentContext.contextId!,
      agentRunId: parentContext.agentRunId!,
      requestId: parentContext.requestId,
      startTime: Date.now(),
      callType,
      metrics: {
        modelId,
        provider,
        totalTime: 0,
        ...options?.metrics,
      },
    };

    if (options?.tokenUsage && this.config.trackCosts) {
      modelCall.tokenUsage = {
        ...options.tokenUsage,
        estimatedCost: estimateCost(
          options.tokenUsage,
          provider,
          this.config.costEstimation
        ),
      };
    } else if (options?.tokenUsage) {
      modelCall.tokenUsage = options.tokenUsage;
    }

    if (options?.error) {
      modelCall.error = options.error;
    }

    // Add to parent action call
    const actionCall = this.activeActionCalls.get(parentContext.actionCallId!);
    if (actionCall) {
      actionCall.modelCalls.push(modelCall);
    }

    await this.storage.storeModelCall(modelCall);

    const logData = {
      modelCallId: modelCall.id,
      callType,
      modelId,
      provider,
      requestId: parentContext.requestId,
      agentRunId: parentContext.agentRunId,
      contextId: parentContext.contextId,
      actionCallId: parentContext.actionCallId,
      tokenUsage: options?.tokenUsage,
      estimatedCost: modelCall.tokenUsage?.estimatedCost,
      error: options?.error?.message,
    };

    if (options?.error && this.shouldLog("warn")) {
      this.logger!.warn(
        "RequestTracker",
        `Model call failed: ${callType} on ${modelId}`,
        logData
      );
    } else if (!options?.error && this.shouldLog("trace")) {
      this.logger!.trace(
        "RequestTracker",
        `Model call tracked: ${callType} on ${modelId}`,
        logData
      );
    }

    return modelCall.id;
  }

  /**
   * Update context-level aggregated metrics
   */
  private async updateContextMetrics(contextId: string): Promise<void> {
    const context = this.activeContexts.get(contextId);
    if (!context) return;

    // Aggregate token usage from all action calls
    const tokenUsages = context.actionCalls
      .map((action) => action.totalTokenUsage)
      .filter((usage): usage is TokenUsage => usage !== undefined);

    if (tokenUsages.length > 0) {
      context.totalTokenUsage = aggregateTokenUsage(tokenUsages);
    }

    // Aggregate costs
    context.totalCost = context.actionCalls.reduce(
      (sum, action) => sum + (action.totalCost || 0),
      0
    );
  }

  /**
   * Get the storage instance (useful for querying)
   */
  getStorage(): RequestTrackingStorage {
    return this.storage;
  }

  /**
   * Get current configuration
   */
  getConfig(): RequestTrackingConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<RequestTrackingConfig>): void {
    this.config = { ...this.config, ...updates };
  }
}

// Global singleton instance
let globalTracker: RequestTracker | null = null;

/**
 * Get the global request tracker instance
 */
export function getRequestTracker(): RequestTracker {
  if (!globalTracker) {
    globalTracker = new RequestTracker();
  }
  return globalTracker;
}

/**
 * Set the global request tracker instance
 */
export function setRequestTracker(tracker: RequestTracker): void {
  globalTracker = tracker;
}

/**
 * Configure the global request tracker
 */
export function configureRequestTracking(
  config: Partial<RequestTrackingConfig>,
  logger?: Logger
): void {
  if (!globalTracker) {
    globalTracker = new RequestTracker(config, logger);
  } else {
    globalTracker.updateConfig(config);
    // Update logger if provided
    if (logger) {
      (globalTracker as any).logger = logger;
    }
  }
}
