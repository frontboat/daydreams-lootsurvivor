import type {
  AnyRef,
  AgentContext,
  AnyContext,
  AnyAgent,
  WorkingMemory,
} from "../types";
import type {
  IWorkingMemory,
  WorkingMemoryData,
  PushOptions,
  Memory,
  MemoryManager,
} from "./types";
import { contextLockManager } from "./context-lock-manager";
import { KnowledgeService } from "./services";

export class WorkingMemoryImpl implements IWorkingMemory {
  private knowledgeService?: KnowledgeService;

  constructor(private memory: Memory) {}

  async create(contextId: string): Promise<WorkingMemoryData> {
    return contextLockManager.withLock(contextId, async () => {
      // Check if already exists to avoid race condition
      const existing = await this.memory.kv.get<WorkingMemoryData>(
        `working-memory:${contextId}`
      );
      if (existing) {
        return existing;
      }

      const data: WorkingMemoryData = {
        inputs: [],
        outputs: [],
        thoughts: [],
        calls: [],
        results: [],
        events: [],
        steps: [],
        runs: [],
      };

      await this.memory.kv.set(`working-memory:${contextId}`, data);
      return data;
    });
  }

  async get(contextId: string): Promise<WorkingMemoryData> {
    const data = await this.memory.kv.get<WorkingMemoryData>(
      `working-memory:${contextId}`
    );

    if (!data) {
      // Auto-create if not exists
      return this.create(contextId);
    }

    return data;
  }

  async set(contextId: string, data: WorkingMemoryData): Promise<void> {
    return contextLockManager.withLock(contextId, async () => {
      await this.memory.kv.set(`working-memory:${contextId}`, data);
    });
  }

  async push<TContext extends AnyContext = AnyContext>(
    contextId: string,
    entry: AnyRef,
    ctx: AgentContext<TContext>,
    agent: AnyAgent,
    options?: PushOptions
  ): Promise<void> {
    return contextLockManager.withLock(contextId, async () => {
      // Re-fetch data inside lock to ensure consistency
      let data = await this.memory.kv.get<WorkingMemoryData>(
        `working-memory:${contextId}`
      );

      if (!data) {
        data = {
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

      // Add entry to appropriate array based on ref type
      switch (entry.ref) {
        case "input":
          data.inputs.push(entry as any);
          break;
        case "output":
          data.outputs.push(entry as any);
          break;
        case "thought":
          data.thoughts.push(entry as any);
          break;
        case "action_call":
          data.calls.push(entry as any);
          break;
        case "action_result":
          data.results.push(entry as any);
          break;
        case "event":
          data.events.push(entry as any);
          break;
        case "step":
          data.steps.push(entry as any);
          break;
        case "run":
          data.runs.push(entry as any);
          break;
        default:
          // Add to events as fallback
          data.events.push(entry as any);
      }

      // Check if we should consolidate working memory
      if (await this.shouldConsolidate(contextId, data)) {
        await this.consolidate(contextId, data, ctx, agent);
        // Compress working memory after consolidation
        data = await this.compressAfterConsolidation(data);
      }

      // Check memory pressure if manager provided AFTER adding the entry
      if (options?.memoryManager) {
        const shouldPrune = await this.shouldPrune(
          ctx as unknown as AgentContext<AnyContext>,
          data,
          entry,
          agent,
          options.memoryManager as any
        );
        if (shouldPrune) {
          data = await this.handleMemoryPressure(
            contextId,
            ctx as unknown as AgentContext<AnyContext>,
            data,
            agent,
            options.memoryManager as any
          );
        }
      }

      // Save updated data
      await this.memory.kv.set(`working-memory:${contextId}`, data);
    });
  }

  async clear(contextId: string): Promise<void> {
    return contextLockManager.withLock(contextId, async () => {
      const data: WorkingMemoryData = {
        inputs: [],
        outputs: [],
        thoughts: [],
        calls: [],
        results: [],
        events: [],
        steps: [],
        runs: [],
      };
      await this.memory.kv.set(`working-memory:${contextId}`, data);
    });
  }

  async summarize(contextId: string): Promise<string> {
    const data = await this.get(contextId);

    // Simple summarization for now
    const summary = {
      inputs: data.inputs.length,
      outputs: data.outputs.length,
      thoughts: data.thoughts.length,
      calls: data.calls.length,
      results: data.results.length,
      events: data.events.length,
      steps: data.steps.length,
      runs: data.runs.length,
    };

    return `Working memory contains: ${JSON.stringify(summary)}`;
  }

  private async shouldPrune<TContext extends AnyContext = AnyContext>(
    ctx: AgentContext<TContext>,
    data: WorkingMemoryData,
    entry: AnyRef,
    agent: AnyAgent,
    manager: MemoryManager<TContext>
  ): Promise<boolean> {
    if (manager.shouldPrune) {
      return manager.shouldPrune(ctx, data as WorkingMemory, entry, agent);
    }

    // Default size-based pruning
    const currentSize = this.calculateSize(data);
    return currentSize >= (manager.maxSize || 1000);
  }

  private async handleMemoryPressure<TContext extends AnyContext = AnyContext>(
    contextId: string,
    ctx: AgentContext<TContext>,
    data: WorkingMemoryData,
    agent: AnyAgent,
    manager: MemoryManager<TContext>
  ): Promise<WorkingMemoryData> {
    if (manager.onMemoryPressure) {
      const pruned = await manager.onMemoryPressure(
        ctx,
        data as WorkingMemory,
        agent
      );
      return pruned as WorkingMemoryData;
    }

    // Default FIFO pruning
    const strategy = manager.strategy || "fifo";

    switch (strategy) {
      case "fifo":
        // Keep most recent entries
        const keepRecent = Math.floor((manager.maxSize || 1000) * 0.7);
        data.inputs = data.inputs.slice(-keepRecent);
        data.outputs = data.outputs.slice(-keepRecent);
        data.thoughts = data.thoughts.slice(-keepRecent);
        data.calls = data.calls.slice(-keepRecent);
        data.results = data.results.slice(-keepRecent);
        break;

      case "smart":
        // Compress old entries if compression function provided
        if (manager.compress) {
          const oldEntries = [
            ...data.inputs.slice(0, -10),
            ...data.outputs.slice(0, -10),
          ];

          if (oldEntries.length > 0) {
            const compressed = await manager.compress(ctx, oldEntries, agent);

            // Store compressed version as episode
            await this.memory.remember({
              type: "episode",
              summary: compressed,
              metadata: {
                originalCount: oldEntries.length,
                compressed: true,
              },
            }, {
              scope: "context",
              contextId,
              type: "compression",
            });

            // Remove compressed entries
            data.inputs = data.inputs.slice(-10);
            data.outputs = data.outputs.slice(-10);
          }
        }
        break;
    }

    return data;
  }

  /**
   * Check if working memory should be consolidated
   */
  async shouldConsolidate(contextId: string, data?: WorkingMemoryData): Promise<boolean> {
    const memoryData = data || await this.get(contextId);
    const totalEntries = this.calculateSize(memoryData);
    
    // Consolidate when we have enough meaningful content
    const significantEntries = memoryData.inputs.length + memoryData.outputs.length + memoryData.calls.length;
    
    // Trigger consolidation with:
    // 1. More than 30 total entries, OR
    // 2. More than 10 significant entries (inputs/outputs/calls)
    return totalEntries > 30 || significantEntries > 10;
  }

  /**
   * Set knowledge service for advanced extraction
   */
  setKnowledgeService(knowledgeService: KnowledgeService): void {
    this.knowledgeService = knowledgeService;
  }

  /**
   * Get knowledge service if available
   */
  getKnowledgeService(): KnowledgeService | undefined {
    return this.knowledgeService;
  }

  /**
   * Consolidate working memory into persistent storage
   */
  async consolidate<TContext extends AnyContext = AnyContext>(
    contextId: string, 
    data: WorkingMemoryData,
    _ctx: AgentContext<TContext>,
    _agent: AnyAgent
  ): Promise<void> {
    const conversation = this.buildConversationSummary(data);
    
    if (conversation.trim()) {
      // Store as episode in context scope
      await this.memory.remember({
        type: "episode",
        summary: conversation,
        input: data.inputs[0]?.content,
        output: data.outputs[data.outputs.length - 1]?.content,
        metadata: {
          entryCount: this.calculateSize(data),
          consolidatedAt: Date.now(),
          contextId,
        },
      }, {
        scope: "context",
        contextId,
        type: "episode",
      });

      // Also store raw conversation text for vector search
      await this.memory.remember(conversation, {
        scope: "context",
        contextId,
        type: "conversation",
        metadata: {
          consolidatedAt: Date.now(),
          entryCount: this.calculateSize(data),
        },
      });

      // Extract and store knowledge if service available
      if (this.knowledgeService?.isEnabled()) {
        await this.knowledgeService.processAndStore(conversation, {
          contextId,
          scope: "global", // Knowledge typically goes to global scope
        });
      }
    }
  }

  /**
   * Build a conversation summary from working memory
   */
  private buildConversationSummary(data: WorkingMemoryData): string {
    const timeline: Array<{ timestamp: number; content: string; type: string }> = [];
    
    // Add inputs and outputs to timeline
    data.inputs.forEach(input => {
      timeline.push({
        timestamp: input.timestamp,
        content: `User: ${typeof input.content === 'string' ? input.content : JSON.stringify(input.content)}`,
        type: 'input'
      });
    });
    
    data.outputs.forEach(output => {
      timeline.push({
        timestamp: output.timestamp,
        content: `Assistant: ${typeof output.content === 'string' ? output.content : JSON.stringify(output.content)}`,
        type: 'output'
      });
    });
    
    // Add significant action calls
    data.calls.forEach(call => {
      if (call.name !== 'think') { // Skip thinking calls
        timeline.push({
          timestamp: call.timestamp,
          content: `Action: ${call.name}(${JSON.stringify(call.data)})`,
          type: 'action'
        });
      }
    });
    
    // Sort by timestamp
    timeline.sort((a, b) => a.timestamp - b.timestamp);
    
    return timeline.map(entry => entry.content).join('\n\n');
  }

  /**
   * Compress working memory after consolidation
   */
  private async compressAfterConsolidation(data: WorkingMemoryData): Promise<WorkingMemoryData> {
    // Keep only the last few entries of each type after consolidation
    return {
      inputs: data.inputs.slice(-3),
      outputs: data.outputs.slice(-3), 
      thoughts: data.thoughts.slice(-5),
      calls: data.calls.slice(-5),
      results: data.results.slice(-5),
      events: data.events.slice(-5),
      steps: data.steps.slice(-2),
      runs: data.runs.slice(-2),
    };
  }

  private calculateSize(data: WorkingMemoryData): number {
    return (
      data.inputs.length +
      data.outputs.length +
      data.thoughts.length +
      data.calls.length +
      data.results.length +
      data.events.length +
      data.steps.length +
      data.runs.length
    );
  }
}
