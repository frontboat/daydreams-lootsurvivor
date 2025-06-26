import type { LanguageModelV1 } from "ai";
import type { z } from "zod/v4";
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
} from "../types";

/**
 * Core Memory interface - the unified API for all memory operations
 */
export interface Memory {
  // Core memory types
  working: IWorkingMemory;
  kv: KeyValueMemory;
  vector: VectorMemory;
  facts: FactualMemory;
  episodes: EpisodicMemory;
  semantic: SemanticMemory;
  graph: GraphMemory;

  // Unified operations
  remember(content: any, options?: RememberOptions): Promise<void>;
  recall(query: string, options?: RecallOptions): Promise<MemoryResult[]>;
  forget(criteria: ForgetCriteria): Promise<void>;
  extract(content: any, context: any): Promise<ExtractedMemories>;
  evolve(): Promise<void>;

  // Lifecycle
  lifecycle: MemoryLifecycle;

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
  middleware?: MemoryMiddleware[];
  options?: MemoryOptions;
}

export interface MemoryOptions {
  evolution?: {
    enabled: boolean;
    interval?: number;
  };
  learning?: {
    enabled: boolean;
    model?: LanguageModelV1;
  };
  compression?: {
    enabled: boolean;
    threshold?: number;
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
  scan(pattern?: string): AsyncIterator<[string, any]>;

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
  metadata?: Record<string, any>;
  namespace?: string;
}

export interface VectorQuery {
  query?: string;
  embedding?: number[];
  namespace?: string;
  filter?: Record<string, any>;
  limit?: number;
  includeMetadata?: boolean;
  includeContent?: boolean;
  minScore?: number;
}

export interface VectorResult {
  id: string;
  score: number;
  content?: string;
  metadata?: Record<string, any>;
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
  properties: Record<string, any>;
  labels?: string[];
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: string;
  properties?: Record<string, any>;
}

export interface GraphFilter {
  type?: string;
  labels?: string[];
  properties?: Record<string, any>;
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
  push(contextId: string, entry: AnyRef, options?: PushOptions): Promise<void>;
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
export interface MemoryManager {
  maxSize?: number;
  strategy?: "fifo" | "lru" | "smart" | "custom";
  shouldPrune?: (memory: WorkingMemoryData, entry: AnyRef) => Promise<boolean>;
  onMemoryPressure?: (memory: WorkingMemoryData) => Promise<WorkingMemoryData>;
  compress?: (entries: AnyRef[]) => Promise<string>;
}

/**
 * Factual Memory - stores verified facts
 */
export interface FactualMemory {
  store(facts: Fact | Fact[]): Promise<void>;
  get(id: string): Promise<Fact | null>;
  search(query: string, options?: SearchOptions): Promise<Fact[]>;
  verify(factId: string): Promise<FactVerification>;
  update(id: string, updates: Partial<Fact>): Promise<void>;
  delete(id: string): Promise<boolean>;
  getByTag(tag: string, value: string): Promise<Fact[]>;
  getByContext(contextId: string): Promise<Fact[]>;
}

export interface Fact {
  id: string;
  statement: string;
  confidence: number;
  source: string;
  entities?: string[];
  tags?: Record<string, string>;
  timestamp: number;
  contextId?: string;
  verification?: FactVerification;
}

export interface FactVerification {
  factId: string;
  verified: boolean;
  confidence: number;
  supportingFacts: string[];
  conflictingFacts: string[];
  lastVerified: number;
}

/**
 * Episodic Memory - stores past experiences
 */
export interface EpisodicMemory {
  store(episode: Episode): Promise<void>;
  get(id: string): Promise<Episode | null>;
  findSimilar(
    contextId: string,
    content: string,
    limit?: number
  ): Promise<Episode[]>;
  getTimeline(start: Date, end: Date): Promise<Episode[]>;
  getByContext(contextId: string): Promise<Episode[]>;
  compress(episodes: Episode[]): Promise<CompressedEpisode>;
}

export interface Episode {
  id: string;
  type: "conversation" | "action" | "event" | "compression";
  input?: any;
  output?: any;
  context: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
  summary?: string;
}

export interface CompressedEpisode extends Episode {
  type: "compression";
  originalEpisodes: string[];
  compressionRatio: number;
}

/**
 * Semantic Memory - stores learned concepts and patterns
 */
export interface SemanticMemory {
  store(concept: SemanticConcept): Promise<void>;
  get(id: string): Promise<SemanticConcept | null>;
  search(query: string, options?: SearchOptions): Promise<SemanticConcept[]>;
  getRelevantPatterns(contextId: string): Promise<Pattern[]>;
  learnFromAction(action: any, result: any): Promise<void>;
  updateConfidence(id: string, delta: number): Promise<void>;
}

export interface SemanticConcept {
  id: string;
  type: "pattern" | "concept" | "relationship" | "skill";
  content: string;
  confidence: number;
  occurrences: number;
  examples: string[];
  metadata?: Record<string, any>;
}

export interface Pattern extends SemanticConcept {
  type: "pattern";
  trigger: string;
  response: string;
  successRate: number;
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
  properties: Record<string, any>;
  contextIds: string[];
}

export interface Relationship {
  id: string;
  from: string;
  to: string;
  type: string;
  properties?: Record<string, any>;
  strength?: number;
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
  scan(pattern?: string): AsyncIterator<[string, any]>;
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
 * Memory lifecycle events
 */
export interface MemoryLifecycle {
  on(event: string, handler: LifecycleHandler): void;
  off(event: string, handler: LifecycleHandler): void;
  emit(event: string, data?: any): Promise<void>;
}

export type LifecycleHandler = (data: any) => void | Promise<void>;

/**
 * Memory middleware for cross-cutting concerns
 */
export interface MemoryMiddleware {
  name: string;
  initialize?(memory: Memory): Promise<void>;

  // Lifecycle hooks
  beforeRemember?(context: MemoryContext): Promise<void>;
  afterRemember?(context: MemoryContext): Promise<void>;
  beforeRecall?(context: MemoryContext): Promise<void>;
  afterRecall?(context: MemoryContext): Promise<void>;
  beforeForget?(context: MemoryContext): Promise<void>;
  afterForget?(context: MemoryContext): Promise<void>;

  // Transform hooks
  transformStore?(data: any): Promise<any>;
  transformRetrieve?(data: any): Promise<any>;
}

export interface MemoryContext {
  operation: string;
  data?: any;
  options?: any;
  memory: Memory;
}

/**
 * Memory operation options
 */
export interface RememberOptions {
  key?: string;
  type?: string;
  context?: string;
  metadata?: Record<string, any>;
  index?: boolean;
  ttl?: number;
}

export interface RecallOptions {
  context?: string;
  types?: string[];
  limit?: number;
  minRelevance?: number;
  boost?: Record<string, number>;
  filter?: Record<string, any>;
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
  filter?: Record<string, any>;
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
  metadata?: Record<string, any>;
  timestamp?: number;
}

export interface ExtractedMemories {
  facts: Fact[];
  preferences: Preference[];
  entities: Entity[];
  events: Event[];
  relationships: Relationship[];
}

export interface Preference {
  id: string;
  subject: string;
  preference: string;
  strength: number;
  contextId: string;
}

export interface Event {
  id: string;
  type: string;
  description: string;
  participants: string[];
  timestamp: number;
  contextId: string;
}

/**
 * Reference types from existing system
 */
// export interface AnyRef {
//   ref: string;
//   id?: string;
//   timestamp?: number;
//   [key: string]: any;
// }

// export interface InputRef<T> extends AnyRef {
//   ref: "input";
//   type: string;
//   content: T;
//   data: any;
//   params?: Record<string, string>;
//   processed: boolean;
//   formatted?: string | string[];
// }

// export interface OutputRef<T> extends AnyRef {
//   ref: "output";
//   type: string;
//   content: string;
//   data: T;
//   params?: Record<string, string>;
//   processed: boolean;
//   formatted?: string | string[];
//   error?: unknown;
// }

// export interface ActionCall<T> extends AnyRef {
//   ref: "action_call";
//   name: string;
//   input: T;
//   content: string;
//   data: any;
//   params?: Record<string, string>;
//   processed: boolean;
// }

// export interface ActionResult<T> extends AnyRef {
//   ref: "action_result";
//   data: T;
//   error?: string;
//   duration?: number;
//   callId: string;
//   name: string;
//   processed: boolean;
//   formatted?: string | string[];
// }

// export interface EventRef extends AnyRef {
//   ref: "event";
//   name: string;
//   type: string;
//   data: any;
//   params?: Record<string, string>;
//   processed: boolean;
//   formatted?: string | string[];
// }

// export interface StepRef extends AnyRef {
//   ref: "step";
//   number: number;
// }

// export interface RunRef extends AnyRef {
//   ref: "run";
//   id: string;
// }
