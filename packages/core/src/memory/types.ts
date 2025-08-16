import type { LanguageModel } from "ai";
import type { z } from "zod";

import type {
  ActionCall,
  ActionResult,
  AnyRef,
  EventRef,
  InputRef,
  OutputRef,
  ThoughtRef,
  RunRef,
  StepRef,
  AgentContext,
  AnyContext,
  AnyAgent,
  ContextState,
} from "../types";

/**
 * Core Memory interface - simplified for basic storage
 */
export interface Memory {
  // Core storage types
  working: IWorkingMemory;
  kv: KeyValueMemory;
  vector: VectorMemory;
  graph: GraphMemory;
  episodes?: import("./episodic-memory").EpisodicMemory;

  // Basic operations
  remember(content: unknown, options?: RememberOptions): Promise<void>;
  recall(query: string, options?: RecallOptions): Promise<MemoryResult[]>;
  forget(criteria: ForgetCriteria): Promise<void>;

  // System
  initialize(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Memory system configuration
 */
export interface MemoryConfig {
  providers: {
    kv: KeyValueProvider;
    vector: VectorProvider;
    graph: GraphProvider;
  };
  logger?: any;
  knowledge?: {
    enabled?: boolean;
    model?: import("ai").LanguageModel;
    schema?: import("./knowledge-schema").KnowledgeSchema;
    extraction?: {
      maxTokens?: number;
      temperature?: number;
      minConfidence?: number;
      usePatternFallback?: boolean;
    };
  };
}


/**
 * Base provider interface
 */
export interface MemoryProvider {
  initialize(): Promise<void>;
  close(): Promise<void>;
  health(): Promise<HealthStatus>;
}

export interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  message: string;
  details?: Record<string, any>;
}

/**
 * Key-Value storage provider
 */
export interface KeyValueProvider extends MemoryProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: SetOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  keys(pattern?: string): Promise<string[]>;
  count(pattern?: string): Promise<number>;
  scan(pattern?: string): AsyncIterator<[string, unknown]>;

  // Batch operations
  getBatch<T>(keys: string[]): Promise<Map<string, T>>;
  setBatch<T>(entries: Map<string, T>, options?: SetOptions): Promise<void>;
  deleteBatch(keys: string[]): Promise<number>;
}

export interface SetOptions {
  ttl?: number;
  ifNotExists?: boolean;
  tags?: Record<string, string>;
}

/**
 * Vector storage provider
 */
export interface VectorProvider extends MemoryProvider {
  index(documents: VectorDocument[]): Promise<void>;
  search(query: VectorQuery): Promise<VectorResult[]>;
  delete(ids: string[]): Promise<void>;
  update(id: string, updates: Partial<VectorDocument>): Promise<void>;
  count(namespace?: string): Promise<number>;
}

export interface VectorDocument {
  id: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, unknown>;
  namespace?: string;
}

export interface VectorQuery {
  query?: string;
  embedding?: number[];
  namespace?: string;
  filter?: Record<string, unknown>;
  limit?: number;
  includeMetadata?: boolean;
  includeContent?: boolean;
  minScore?: number;
}

export interface VectorResult {
  id: string;
  score: number;
  content?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Graph storage provider
 */
export interface GraphProvider extends MemoryProvider {
  // Node operations
  addNode(node: GraphNode): Promise<string>;
  getNode(id: string): Promise<GraphNode | null>;
  updateNode(id: string, updates: Partial<GraphNode>): Promise<void>;
  deleteNode(id: string): Promise<boolean>;

  // Edge operations
  addEdge(edge: GraphEdge): Promise<string>;
  getEdges(
    nodeId: string,
    direction?: "in" | "out" | "both"
  ): Promise<GraphEdge[]>;
  deleteEdge(id: string): Promise<boolean>;

  // Query operations
  findNodes(filter: GraphFilter): Promise<GraphNode[]>;
  traverse(traversal: GraphTraversal): Promise<GraphPath[]>;
  shortestPath(from: string, to: string): Promise<GraphPath | null>;
}

export interface GraphNode {
  id: string;
  type: string;
  properties: Record<string, unknown>;
  labels?: string[];
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: string;
  properties?: Record<string, unknown>;
}

export interface GraphFilter {
  type?: string;
  labels?: string[];
  properties?: Record<string, unknown>;
}

export interface GraphTraversal {
  start: string;
  direction: "in" | "out" | "both";
  maxDepth?: number;
  filter?: GraphFilter;
}

export interface GraphPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
  length: number;
}

/**
 * Working Memory - manages current session state
 */
export interface IWorkingMemory {
  create(contextId: string): Promise<WorkingMemoryData>;
  get(contextId: string): Promise<WorkingMemoryData>;
  set(contextId: string, data: WorkingMemoryData): Promise<void>;
  push<TContext extends AnyContext = AnyContext>(
    contextId: string,
    entry: AnyRef,
    ctx: AgentContext<TContext>,
    agent: AnyAgent,
    options?: PushOptions
  ): Promise<void>;
  clear(contextId: string): Promise<void>;
  summarize(contextId: string): Promise<string>;
}

export interface WorkingMemoryData {
  inputs: InputRef<any>[];
  outputs: OutputRef[];
  thoughts: ThoughtRef[];
  calls: ActionCall<any>[];
  results: ActionResult<any>[];
  events: EventRef[];
  steps: StepRef[];
  runs: RunRef[];
  relevantMemories?: MemoryResult[];
}

export interface PushOptions {
  memoryManager?: MemoryManager;
  compress?: boolean;
}

/**
 * Memory manager for handling memory pressure
 */
export interface MemoryManager<TContext extends AnyContext = AnyContext> {
  /** Called when memory needs pruning due to size constraints */
  onMemoryPressure?: (
    ctx: AgentContext<TContext>,
    workingMemory: WorkingMemory,
    agent: AnyAgent
  ) => Promise<WorkingMemory> | WorkingMemory;

  /** Called before adding new entries to determine if pruning is needed */
  shouldPrune?: (
    ctx: AgentContext<TContext>,
    workingMemory: WorkingMemory,
    newEntry: AnyRef,
    agent: AnyAgent
  ) => Promise<boolean> | boolean;

  /** Called to compress/summarize old entries into a compact representation */
  compress?: (
    ctx: AgentContext<TContext>,
    entries: AnyRef[],
    agent: AnyAgent
  ) => Promise<string> | string;

  /** Maximum number of entries before triggering memory management */
  maxSize?: number;

  /** Memory management strategy */
  strategy?: "fifo" | "lru" | "smart" | "custom";

  /** Whether to preserve certain types of entries during pruning */
  preserve?: {
    /** Always keep the last N inputs */
    recentInputs?: number;
    /** Always keep the last N outputs */
    recentOutputs?: number;
    /** Always keep action calls with these names */
    actionNames?: string[];
    /** Custom preservation logic */
    custom?: (entry: AnyRef, ctx: AgentContext<TContext>) => boolean;
  };
}







/**
 * Graph Memory - stores entity relationships
 */
export interface GraphMemory {
  addEntity(entity: Entity): Promise<string>;
  addRelationship(relationship: Relationship): Promise<string>;
  getEntity(id: string): Promise<Entity | null>;
  findRelated(entityId: string, relationshipType?: string): Promise<Entity[]>;
  findPath(from: string, to: string): Promise<Entity[]>;
  updateEntity(id: string, updates: Partial<Entity>): Promise<void>;
  removeEntity(id: string): Promise<boolean>;
}

export interface Entity {
  id: string;
  type: string;
  name: string;
  properties: Record<string, unknown>;
  contextIds: string[];
}

export interface Relationship {
  id: string;
  from: string;
  to: string;
  type: string;
  properties?: Record<string, unknown>;
  strength?: number;
  /** Semantic metadata for this relationship */
  semantics?: {
    /** Human-readable verb describing the relationship */
    verb: string;
    /** Inverse verb (e.g., "works_for" inverse is "employs") */
    inverseVerb?: string;
    /** Relationship strength (0-1) - can override top-level strength */
    strength?: number;
    /** Context where this relationship applies */
    context?: string;
    /** Whether this relationship was inferred vs explicit */
    inferred?: boolean;
    /** Temporal information */
    temporal?: {
      start?: Date;
      end?: Date;
      duration?: number;
    };
    /** Confidence in this relationship (0-1) */
    confidence?: number;
  };
}

/**
 * Key-Value Memory interface
 */
export interface KeyValueMemory {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: SetOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  keys(pattern?: string): Promise<string[]>;
  count(pattern?: string): Promise<number>;
  scan(pattern?: string): AsyncIterator<[string, unknown]>;

  // Batch operations
  getBatch<T>(keys: string[]): Promise<Map<string, T>>;
  setBatch<T>(entries: Map<string, T>, options?: SetOptions): Promise<void>;
  deleteBatch(keys: string[]): Promise<number>;
}

/**
 * Vector Memory interface
 */
export interface VectorMemory {
  index(documents: VectorDocument[]): Promise<void>;
  search(query: VectorQuery): Promise<VectorResult[]>;
  delete(ids: string[]): Promise<void>;
}



/**
 * Memory operation options
 */
export interface RememberOptions {
  key?: string;
  type?: string;
  scope?: "context" | "user" | "global";
  contextId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  ttl?: number;
}

export interface RecallOptions {
  contextId?: string;
  userId?: string;
  scope?: "context" | "user" | "global" | "all";
  limit?: number;
  minRelevance?: number;
  filter?: Record<string, unknown>;
}

export interface ForgetCriteria {
  pattern?: string;
  type?: string;
  context?: string;
  olderThan?: Date;
  tag?: Record<string, string>;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  sort?: "relevance" | "timestamp" | "confidence";
  filter?: Record<string, unknown>;
}

/**
 * Memory results
 */
export interface MemoryResult {
  id: string;
  type: string;
  content: any;
  score?: number;
  confidence?: number;
  metadata?: Record<string, unknown>;
  timestamp?: number;
}

/**
 * Represents a memory configuration for storing data
 * @template Data - Type of data stored in memory
 */
export type ActionState<Data = any> = {
  /** Unique identifier for this memory */
  key: string;
  /** Function to initialize memory data */
  create: () => Promise<Data> | Data;
};

/**
 * Extracts the data type from a Memory type
 * @template TMemory - Memory type to extract data from
 */
export type InferActionState<TMemory extends ActionState<any>> =
  TMemory extends ActionState<infer Data> ? Data : never;

/**
 * Represents the working memory state during execution
 */
export interface WorkingMemory extends WorkingMemoryData {
  /** Current image URL for multimodal context */
  currentImage?: URL;
}

/**
 * Episode detection and creation hooks for contexts
 * Allows developers to customize when and how episodes are stored
 */
export interface EpisodeHooks<TContext extends AnyContext = AnyContext> {
  /**
   * Called to determine if a new episode should be started
   * @param ref - The current log reference being processed
   * @param workingMemory - Current working memory state
   * @param contextState - Current context state
   * @param agent - Agent instance
   * @returns true if a new episode should start
   */
  shouldStartEpisode?(
    ref: AnyRef,
    workingMemory: WorkingMemory,
    contextState: ContextState<TContext>,
    agent: AnyAgent
  ): Promise<boolean> | boolean;

  /**
   * Called to determine if the current episode should be ended and stored
   * @param ref - The current log reference being processed
   * @param workingMemory - Current working memory state
   * @param contextState - Current context state
   * @param agent - Agent instance
   * @returns true if the current episode should be stored
   */
  shouldEndEpisode?(
    ref: AnyRef,
    workingMemory: WorkingMemory,
    contextState: ContextState<TContext>,
    agent: AnyAgent
  ): Promise<boolean> | boolean;

  /**
   * Called to create episode data from collected logs
   * @param logs - Array of logs that make up this episode
   * @param contextState - Current context state
   * @param agent - Agent instance
   * @returns Episode data to be stored
   */
  createEpisode?(
    logs: AnyRef[],
    contextState: ContextState<TContext>,
    agent: AnyAgent
  ): Promise<any> | any;

  /**
   * Called to classify the type of episode (optional)
   * @param episodeData - The episode data from createEpisode
   * @param contextState - Current context state
   * @returns Episode type/classification string
   */
  classifyEpisode?(
    episodeData: any,
    contextState: ContextState<TContext>
  ): string;

  /**
   * Called to extract additional metadata for the episode (optional)
   * @param episodeData - The episode data from createEpisode
   * @param logs - The original logs for this episode
   * @param contextState - Current context state
   * @returns Metadata object
   */
  extractMetadata?(
    episodeData: any,
    logs: AnyRef[],
    contextState: ContextState<TContext>
  ): Record<string, any>;
}
