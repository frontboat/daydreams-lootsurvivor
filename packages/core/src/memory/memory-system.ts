import type {
  Memory,
  MemoryConfig,
  IWorkingMemory,
  KeyValueMemory,
  VectorMemory,
  GraphMemory,
  RememberOptions,
  RecallOptions,
  MemoryResult,
  ForgetCriteria,
} from "./types";
import { WorkingMemoryImpl } from "./working-memory";
import { KeyValueMemoryImpl } from "./kv-memory";
import { VectorMemoryImpl } from "./vector-memory";
import { GraphMemoryImpl } from "./graph-memory";
import { EpisodicMemoryImpl, type EpisodicMemory } from "./episodic-memory";
import { KnowledgeService } from "./services/knowledge-service";
import type { Logger } from "../logger";

/**
 * Simplified Memory System - basic storage only
 */
export class MemorySystem implements Memory {
  public working: IWorkingMemory;
  public kv: KeyValueMemory;
  public vector: VectorMemory;
  public graph: GraphMemory;
  public episodes: EpisodicMemory;

  private providers: MemoryConfig["providers"];
  private initialized = false;
  private logger: Logger;

  constructor(private config: MemoryConfig) {
    this.providers = config.providers;
    this.logger = config.logger;

    // Initialize basic memory types with providers
    this.kv = new KeyValueMemoryImpl(this.providers.kv);
    this.vector = new VectorMemoryImpl(this.providers.vector);
    this.graph = new GraphMemoryImpl(this.providers.graph);

    // Initialize episodic and working memory with intelligence
    this.episodes = new EpisodicMemoryImpl(this);
    this.working = new WorkingMemoryImpl(this);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    if (this.logger) {
      this.logger.info("memory:init", "Starting memory system initialization", {
        providers: {
          kv: this.providers.kv.constructor.name,
          vector: this.providers.vector.constructor.name,
          graph: this.providers.graph.constructor.name,
        },
      });
    }

    // Initialize providers
    await Promise.all([
      this.providers.kv.initialize(),
      this.providers.vector.initialize(),
      this.providers.graph.initialize(),
    ]);

    this.initialized = true;

    if (this.logger) {
      this.logger.info("memory:init", "Memory system initialized successfully");
    }
  }

  async close(): Promise<void> {
    if (!this.initialized) return;

    // Close providers
    await Promise.all([
      this.providers.kv.close(),
      this.providers.vector.close(),
      this.providers.graph.close(),
    ]);

    this.initialized = false;
  }

  async remember(content: unknown, options?: RememberOptions): Promise<void> {
    const scope = options?.scope || "context";
    const key = this.buildStorageKey(content, options, scope);

    // Store based on content type and scope
    if (typeof content === "string") {
      // Store as vector document for search
      await this.vector.index([
        {
          id: key,
          content,
          metadata: {
            scope,
            contextId: options?.contextId,
            userId: options?.userId,
            type: options?.type || "text",
            timestamp: Date.now(),
            ...options?.metadata,
          },
        },
      ]);
    }
  }

  async recall(
    query: string,
    options?: RecallOptions
  ): Promise<MemoryResult[]> {
    const searchFilter = this.buildSearchFilter(options);

    // Vector search across scoped content
    const vectorResults = await this.vector.search({
      query,
      limit: options?.limit || 20,
      filter: searchFilter,
      minScore: options?.minRelevance,
      includeContent: true,
      includeMetadata: true,
    });

    return vectorResults.map((vr) => ({
      id: vr.id,
      type: "memory",
      content: vr.content,
      score: vr.score,
      metadata: vr.metadata,
    }));
  }

  async forget(criteria: ForgetCriteria): Promise<void> {
    const promises: Promise<any>[] = [];

    // Delete by pattern
    if (criteria.pattern) {
      const keys = await this.kv.keys(criteria.pattern);
      promises.push(...keys.map((key) => this.kv.delete(key)));
    }

    // Delete by context
    if (criteria.context) {
      const contextPattern = `*:${criteria.context}:*`;
      const keys = await this.kv.keys(contextPattern);
      promises.push(...keys.map((key) => this.kv.delete(key)));
    }

    // Delete old entries
    if (criteria.olderThan) {
      const cutoff = criteria.olderThan.getTime();
      const iterator = this.kv.scan();
      let result = await iterator.next();
      while (!result.done) {
        const [key, valueData] = result.value;
        if (
          valueData &&
          typeof valueData === "object" &&
          "timestamp" in valueData
        ) {
          const timestamp = (valueData as any).timestamp;
          if (timestamp && timestamp < cutoff) {
            promises.push(this.kv.delete(key));
          }
        }
        result = await iterator.next();
      }
    }

    await Promise.all(promises);
  }

  private buildStorageKey(
    _content: unknown,
    options?: RememberOptions,
    scope: string = "context"
  ): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2);

    if (options?.key) {
      return options.key;
    }

    switch (scope) {
      case "context":
        return `memory:${scope}:${options?.contextId}:${timestamp}-${random}`;
      case "user":
        return `memory:${scope}:${options?.userId}:${timestamp}-${random}`;
      case "global":
        return `memory:${scope}:${timestamp}-${random}`;
      default:
        return `memory:${timestamp}-${random}`;
    }
  }

  private buildSearchFilter(options?: RecallOptions): Record<string, any> {
    const filter: Record<string, any> = {};

    if (options?.contextId) {
      filter.contextId = options.contextId;
    }

    if (options?.userId) {
      filter.userId = options.userId;
    }

    if (options?.scope) {
      filter.scope = options.scope;
    }

    return filter;
  }

  private isStructuredContent(content: unknown): content is {
    entities?: any[];
    relationships?: any[];
  } {
    return (
      typeof content === "object" &&
      content !== null &&
      ("entities" in content || "relationships" in content)
    );
  }
}
