import type {
  RequestTracking,
  ModelCall,
  RequestTrackingStorage,
  RequestQueryCriteria,
  MetricsQueryCriteria,
  AggregatedMetrics,
  TokenUsage,
} from "../tracking";
import { aggregateTokenUsage } from "../tracking";

/**
 * In-memory storage implementation for request tracking
 * Suitable for development and testing
 */
export class InMemoryRequestTrackingStorage implements RequestTrackingStorage {
  private requests = new Map<string, RequestTracking>();
  private modelCalls = new Map<string, ModelCall>();

  async storeRequest(request: RequestTracking): Promise<void> {
    this.requests.set(request.id, { ...request });
  }

  async getRequest(requestId: string): Promise<RequestTracking | null> {
    return this.requests.get(requestId) || null;
  }

  async storeModelCall(modelCall: ModelCall): Promise<void> {
    this.modelCalls.set(modelCall.id, { ...modelCall });
  }

  async queryRequests(criteria: RequestQueryCriteria): Promise<RequestTracking[]> {
    let results = Array.from(this.requests.values());

    // Apply filters
    if (criteria.userId) {
      results = results.filter(r => r.userId === criteria.userId);
    }

    if (criteria.sessionId) {
      results = results.filter(r => r.sessionId === criteria.sessionId);
    }

    if (criteria.agentName) {
      results = results.filter(r => 
        r.agentRuns.some(run => run.agentName === criteria.agentName)
      );
    }

    if (criteria.timeRange) {
      results = results.filter(r => 
        r.startTime >= criteria.timeRange!.start && 
        r.startTime <= criteria.timeRange!.end
      );
    }

    if (criteria.status) {
      results = results.filter(r => criteria.status!.includes(r.status));
    }

    // Sort by start time (newest first)
    results.sort((a, b) => b.startTime - a.startTime);

    // Apply pagination
    if (criteria.offset) {
      results = results.slice(criteria.offset);
    }
    if (criteria.limit) {
      results = results.slice(0, criteria.limit);
    }

    return results;
  }

  async getMetrics(criteria: MetricsQueryCriteria): Promise<AggregatedMetrics> {
    let requests = Array.from(this.requests.values());

    // Apply time range filter
    if (criteria.timeRange) {
      requests = requests.filter(r => 
        r.startTime >= criteria.timeRange!.start && 
        r.startTime <= criteria.timeRange!.end
      );
    }

    // Apply user filter
    if (criteria.userId) {
      requests = requests.filter(r => r.userId === criteria.userId);
    }

    // Apply agent filter
    if (criteria.agentName) {
      requests = requests.filter(r => 
        r.agentRuns.some(run => run.agentName === criteria.agentName)
      );
    }

    // Calculate overall metrics
    const totalRequests = requests.length;
    const completedRequests = requests.filter(r => r.status === "completed");
    const successRate = totalRequests > 0 ? completedRequests.length / totalRequests : 0;

    const allTokenUsages = requests
      .map(r => r.totalTokenUsage)
      .filter((usage): usage is TokenUsage => usage !== undefined);
    
    const totalTokenUsage = allTokenUsages.length > 0 
      ? aggregateTokenUsage(allTokenUsages)
      : { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

    const totalCost = requests.reduce((sum, r) => sum + (r.totalCost || 0), 0);

    const responseTimes = completedRequests
      .filter(r => r.endTime)
      .map(r => r.endTime! - r.startTime);
    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    // Generate breakdown based on aggregateBy
    const breakdown = this.generateBreakdown(requests, criteria);

    return {
      totalRequests,
      totalTokenUsage,
      totalCost,
      averageResponseTime,
      successRate,
      breakdown,
    };
  }

  private generateBreakdown(
    requests: RequestTracking[],
    criteria: MetricsQueryCriteria
  ): AggregatedMetrics["breakdown"] {
    const groups = new Map<string, RequestTracking[]>();

    for (const request of requests) {
      const groupKeys = this.getGroupKeys(request, criteria);
      
      for (const groupKey of groupKeys) {
        if (!groups.has(groupKey)) {
          groups.set(groupKey, []);
        }
        groups.get(groupKey)!.push(request);
      }
    }

    return Array.from(groups.entries()).map(([groupKey, groupRequests]) => {
      const groupData = JSON.parse(groupKey);
      const completedRequests = groupRequests.filter(r => r.status === "completed");
      
      const groupTokenUsages = groupRequests
        .map(r => r.totalTokenUsage)
        .filter((usage): usage is TokenUsage => usage !== undefined);
      
      const groupTokenUsage = groupTokenUsages.length > 0
        ? aggregateTokenUsage(groupTokenUsages)
        : { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

      const groupCost = groupRequests.reduce((sum, r) => sum + (r.totalCost || 0), 0);
      
      const groupResponseTimes = completedRequests
        .filter(r => r.endTime)
        .map(r => r.endTime! - r.startTime);
      const groupAverageResponseTime = groupResponseTimes.length > 0
        ? groupResponseTimes.reduce((sum, time) => sum + time, 0) / groupResponseTimes.length
        : 0;

      const groupSuccessRate = groupRequests.length > 0
        ? completedRequests.length / groupRequests.length
        : 0;

      return {
        group: groupData,
        metrics: {
          requests: groupRequests.length,
          tokenUsage: groupTokenUsage,
          cost: groupCost,
          averageResponseTime: groupAverageResponseTime,
          successRate: groupSuccessRate,
        },
      };
    });
  }

  private getGroupKeys(request: RequestTracking, criteria: MetricsQueryCriteria): string[] {
    const keys: string[] = [];

    switch (criteria.aggregateBy) {
      case "request":
        keys.push(JSON.stringify({ requestId: request.id }));
        break;
      
      case "agent":
        for (const agentRun of request.agentRuns) {
          const group: Record<string, string> = { agentName: agentRun.agentName };
          if (criteria.groupBy) {
            for (const groupField of criteria.groupBy) {
              if (groupField === "userId" && request.userId) {
                group.userId = request.userId;
              }
              if (groupField === "sessionId" && request.sessionId) {
                group.sessionId = request.sessionId;
              }
            }
          }
          keys.push(JSON.stringify(group));
        }
        break;
      
      case "context":
        for (const agentRun of request.agentRuns) {
          for (const context of agentRun.contexts) {
            const group: Record<string, string> = { 
              contextType: context.type,
              agentName: agentRun.agentName,
            };
            if (criteria.groupBy) {
              for (const groupField of criteria.groupBy) {
                if (groupField === "userId" && request.userId) {
                  group.userId = request.userId;
                }
              }
            }
            keys.push(JSON.stringify(group));
          }
        }
        break;
      
      case "action":
        for (const agentRun of request.agentRuns) {
          for (const context of agentRun.contexts) {
            for (const action of context.actionCalls) {
              const group: Record<string, string> = {
                actionName: action.actionName,
                contextType: context.type,
                agentName: agentRun.agentName,
              };
              keys.push(JSON.stringify(group));
            }
          }
        }
        break;
      
      case "model":
        for (const agentRun of request.agentRuns) {
          for (const context of agentRun.contexts) {
            for (const action of context.actionCalls) {
              for (const modelCall of action.modelCalls) {
                const group: Record<string, string> = {
                  modelId: modelCall.metrics?.modelId || "unknown",
                  provider: modelCall.metrics?.provider || "unknown",
                  callType: modelCall.callType,
                };
                keys.push(JSON.stringify(group));
              }
            }
          }
        }
        break;
    }

    return keys;
  }

  /**
   * Clear all stored data (useful for testing)
   */
  async clear(): Promise<void> {
    this.requests.clear();
    this.modelCalls.clear();
  }

  /**
   * Get all stored requests (useful for testing)
   */
  async getAllRequests(): Promise<RequestTracking[]> {
    return Array.from(this.requests.values());
  }

  /**
   * Get all stored model calls (useful for testing)
   */
  async getAllModelCalls(): Promise<ModelCall[]> {
    return Array.from(this.modelCalls.values());
  }
}

/**
 * No-op storage implementation for when tracking is disabled
 */
export class NoOpRequestTrackingStorage implements RequestTrackingStorage {
  async storeRequest(_request: RequestTracking): Promise<void> {
    // No-op
  }

  async getRequest(_requestId: string): Promise<RequestTracking | null> {
    return null;
  }

  async storeModelCall(_modelCall: ModelCall): Promise<void> {
    // No-op
  }

  async queryRequests(_criteria: RequestQueryCriteria): Promise<RequestTracking[]> {
    return [];
  }

  async getMetrics(_criteria: MetricsQueryCriteria): Promise<AggregatedMetrics> {
    return {
      totalRequests: 0,
      totalTokenUsage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      totalCost: 0,
      averageResponseTime: 0,
      successRate: 0,
      breakdown: [],
    };
  }
}