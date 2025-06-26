# Unified Memory API Strategy

## Core Insight

Instead of separate Storage and Vector adapters, we need a **single, cohesive Memory API** that unifies all memory operations. This API is configured once in `createDreams` and provides access to all memory types through a clean interface.

## Architecture Overview

```typescript
// Single Memory API configured at agent creation
const agent = createDreams({
  memory: new MemorySystem({
    providers: {
      kv: new PostgreSQLProvider(),
      vector: new ChromaProvider(),
      graph: new Neo4jProvider(),
      timeseries: new InfluxProvider()
    },
    middleware: [
      new PersistenceMiddleware(),
      new CacheMiddleware(),
      new EncryptionMiddleware()
    ]
  })
});
```

## Detailed Design

### 1. Unified Memory Interface

```typescript
interface Memory {
  // Working memory for current execution
  working: WorkingMemory;
  
  // Different memory types exposed through clean APIs
  kv: KeyValueMemory;
  vector: VectorMemory;
  graph: GraphMemory;
  facts: FactualMemory;
  episodes: EpisodicMemory;
  semantic: SemanticMemory;
  
  // High-level operations that may use multiple stores
  remember(content: any, options?: RememberOptions): Promise<void>;
  recall(query: string, options?: RecallOptions): Promise<MemoryResult[]>;
  forget(criteria: ForgetCriteria): Promise<void>;
  
  // Lifecycle hooks for middleware
  lifecycle: MemoryLifecycle;
}
```

### 2. Memory System Implementation

```typescript
class MemorySystem implements Memory {
  private providers: MemoryProviders;
  private middleware: MemoryMiddleware[];
  private lifecycle: MemoryLifecycle;
  
  constructor(config: MemoryConfig) {
    this.providers = config.providers;
    this.middleware = config.middleware || [];
    this.lifecycle = new MemoryLifecycle();
    
    // Initialize specialized memory types
    this.working = new WorkingMemoryImpl();
    this.kv = new KeyValueMemoryImpl(this.providers.kv);
    this.vector = new VectorMemoryImpl(this.providers.vector);
    this.graph = new GraphMemoryImpl(this.providers.graph);
    this.facts = new FactualMemoryImpl(this);
    this.episodes = new EpisodicMemoryImpl(this);
    this.semantic = new SemanticMemoryImpl(this);
    
    // Wire up middleware
    this.setupMiddleware();
  }
  
  // Unified remember operation
  async remember(content: any, options?: RememberOptions): Promise<void> {
    await this.lifecycle.emit('beforeRemember', { content, options });
    
    // Intelligent routing to appropriate memory types
    const classified = await this.classify(content, options);
    
    await Promise.all([
      classified.facts && this.facts.store(classified.facts),
      classified.episodes && this.episodes.store(classified.episodes),
      classified.entities && this.graph.addEntities(classified.entities),
      classified.vectors && this.vector.index(classified.vectors)
    ]);
    
    await this.lifecycle.emit('afterRemember', { content, options, classified });
  }
  
  // Unified recall operation
  async recall(query: string, options?: RecallOptions): Promise<MemoryResult[]> {
    await this.lifecycle.emit('beforeRecall', { query, options });
    
    // Parallel search across relevant memory types
    const [facts, episodes, semantic, graph] = await Promise.all([
      this.facts.search(query, options),
      this.episodes.search(query, options),
      this.semantic.search(query, options),
      this.graph.search(query, options)
    ]);
    
    // Merge and rank results
    const results = await this.mergeResults({ facts, episodes, semantic, graph }, options);
    
    await this.lifecycle.emit('afterRecall', { query, options, results });
    
    return results;
  }
}
```

### 3. Memory Providers

```typescript
// Base provider interface that all storage backends implement
interface MemoryProvider {
  initialize(): Promise<void>;
  close(): Promise<void>;
  health(): Promise<HealthStatus>;
}

interface KeyValueProvider extends MemoryProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: SetOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  scan(pattern: string): AsyncIterator<[string, any]>;
}

interface VectorProvider extends MemoryProvider {
  index(documents: VectorDocument[]): Promise<void>;
  search(query: VectorQuery): Promise<VectorResult[]>;
  delete(ids: string[]): Promise<void>;
}

interface GraphProvider extends MemoryProvider {
  addNode(node: GraphNode): Promise<string>;
  addEdge(edge: GraphEdge): Promise<void>;
  traverse(query: GraphQuery): Promise<GraphResult>;
  shortestPath(from: string, to: string): Promise<GraphPath>;
}
```

### 4. Specialized Memory Types

```typescript
// Each memory type provides domain-specific operations
class FactualMemory {
  constructor(private memory: MemorySystem) {}
  
  async store(facts: Fact[]): Promise<void> {
    // Store in KV for retrieval
    await Promise.all(facts.map(fact => 
      this.memory.kv.set(`fact:${fact.id}`, fact)
    ));
    
    // Index in vector store for semantic search
    await this.memory.vector.index(facts.map(fact => ({
      id: fact.id,
      content: fact.statement,
      metadata: { type: 'fact', confidence: fact.confidence }
    })));
    
    // Add entities to graph
    const entities = this.extractEntities(facts);
    await this.memory.graph.addNodes(entities);
  }
  
  async verify(factId: string): Promise<FactVerification> {
    const fact = await this.memory.kv.get<Fact>(`fact:${factId}`);
    if (!fact) throw new Error('Fact not found');
    
    // Cross-reference with other facts
    const related = await this.memory.vector.search({
      query: fact.statement,
      filter: { type: 'fact' },
      limit: 10
    });
    
    return this.assessVerification(fact, related);
  }
}

class EpisodicMemory {
  constructor(private memory: MemorySystem) {}
  
  async store(episode: Episode): Promise<void> {
    // Store the full episode
    await this.memory.kv.set(`episode:${episode.id}`, episode);
    
    // Extract and store temporal markers
    await this.memory.kv.set(`timeline:${episode.timestamp}`, episode.id);
    
    // Index for semantic search
    await this.memory.vector.index([{
      id: episode.id,
      content: episode.summary,
      metadata: {
        type: 'episode',
        timestamp: episode.timestamp,
        participants: episode.participants
      }
    }]);
    
    // Update relationship graph
    await this.updateRelationships(episode);
  }
  
  async getTimeline(start: Date, end: Date): Promise<Episode[]> {
    const episodeIds = await this.memory.kv.scan(`timeline:${start.getTime()}-${end.getTime()}`);
    return Promise.all(
      Array.from(episodeIds).map(([_, id]) => 
        this.memory.kv.get<Episode>(`episode:${id}`)
      )
    );
  }
}
```

### 5. Memory Middleware System

```typescript
interface MemoryMiddleware {
  name: string;
  
  // Lifecycle hooks
  beforeRemember?(context: MemoryContext): Promise<void>;
  afterRemember?(context: MemoryContext): Promise<void>;
  beforeRecall?(context: MemoryContext): Promise<void>;
  afterRecall?(context: MemoryContext): Promise<void>;
  beforeForget?(context: MemoryContext): Promise<void>;
  afterForget?(context: MemoryContext): Promise<void>;
  
  // Memory operation hooks
  transformStore?(data: any, type: MemoryType): Promise<any>;
  transformRetrieve?(data: any, type: MemoryType): Promise<any>;
  
  // Provider operation hooks
  beforeProviderOperation?(op: ProviderOperation): Promise<void>;
  afterProviderOperation?(op: ProviderOperation): Promise<void>;
}

// Example middleware
class PersistenceMiddleware implements MemoryMiddleware {
  name = 'persistence';
  
  async afterRemember(context: MemoryContext): Promise<void> {
    // Ensure critical memories are persisted to disk
    if (context.options?.critical) {
      await this.backupToDisk(context.content);
    }
  }
}

class MemoryCompressionMiddleware implements MemoryMiddleware {
  name = 'compression';
  
  async transformStore(data: any, type: MemoryType): Promise<any> {
    if (type === 'episode' && this.shouldCompress(data)) {
      return this.compress(data);
    }
    return data;
  }
  
  async transformRetrieve(data: any, type: MemoryType): Promise<any> {
    if (this.isCompressed(data)) {
      return this.decompress(data);
    }
    return data;
  }
}

class MemoryEvolutionMiddleware implements MemoryMiddleware {
  name = 'evolution';
  
  async afterRemember(context: MemoryContext): Promise<void> {
    // Evolve existing memories based on new information
    const conflicts = await this.findConflicts(context.content);
    if (conflicts.length > 0) {
      await this.resolveConflicts(conflicts, context.content);
    }
    
    // Update user profile
    await this.updateProfile(context.userId, context.content);
  }
}
```

### 6. Integration with Agent Lifecycle

```typescript
class MemoryLifecycle extends EventEmitter {
  constructor(private agent: Agent) {
    super();
    
    // Wire up to agent lifecycle
    this.setupAgentHooks();
  }
  
  private setupAgentHooks() {
    // Before processing input
    this.agent.on('input.pre', async (input, context) => {
      const memories = await this.agent.memory.recall(input.content, {
        context: context.id,
        intent: await this.detectIntent(input.content)
      });
      
      context.workingMemory.relevantMemories = memories;
    });
    
    // After each step
    this.agent.on('step.post', async (step, context) => {
      await this.agent.memory.remember({
        type: 'step',
        content: step,
        context: context.id,
        timestamp: Date.now()
      });
    });
    
    // On context save
    this.agent.on('context.save', async (context) => {
      await this.agent.memory.remember({
        type: 'context_snapshot',
        state: context.memory,
        working: context.workingMemory.summarize()
      });
    });
    
    // On error
    this.agent.on('error', async (error, context) => {
      await this.agent.memory.remember({
        type: 'error',
        error: error.message,
        stack: error.stack,
        context: context.id,
        recovery: await this.suggestRecovery(error)
      });
    });
  }
}
```

### 7. Configuration and Usage

```typescript
// Simple configuration
const agent = createDreams({
  memory: new MemorySystem({
    providers: {
      kv: new RedisProvider({ url: 'redis://localhost' }),
      vector: new ChromaProvider({ url: 'http://localhost:8000' })
    }
  })
});

// Advanced configuration with middleware
const agent = createDreams({
  memory: new MemorySystem({
    providers: {
      kv: new PostgreSQLProvider({ connectionString }),
      vector: new PineconeProvider({ apiKey, environment }),
      graph: new Neo4jProvider({ uri, auth }),
      timeseries: new InfluxProvider({ url, token })
    },
    middleware: [
      new CacheMiddleware({ ttl: 300 }),
      new CompressionMiddleware({ threshold: 1024 }),
      new EncryptionMiddleware({ key: process.env.ENCRYPTION_KEY }),
      new EvolutionMiddleware({ model: 'gpt-4' }),
      new MetricsMiddleware({ collector: prometheusClient })
    ],
    options: {
      defaultTTL: 86400,
      maxMemorySize: '1GB',
      compressionThreshold: 1024,
      indexBatchSize: 100
    }
  })
});

// Usage in agent code
agent.on('input', async (input, context) => {
  // Automatic memory integration
  const memories = context.workingMemory.relevantMemories;
  
  // Manual memory operations
  await agent.memory.remember({
    type: 'user_preference',
    content: extractedPreference,
    confidence: 0.9
  });
  
  // Complex recall
  const insights = await agent.memory.recall(input.content, {
    types: ['fact', 'episode', 'preference'],
    timeRange: { start: lastWeek },
    minConfidence: 0.7,
    includeGraph: true
  });
});
```

## Benefits of This Architecture

1. **Unified Interface**: Single Memory API for all memory operations
2. **Flexibility**: Mix and match providers for different memory types
3. **Extensibility**: Easy to add new memory types or providers
4. **Middleware Power**: Cross-cutting concerns handled cleanly
5. **Lifecycle Integration**: Memory operations tied to agent lifecycle
6. **Type Safety**: Each memory type has its own interface
7. **Performance**: Providers can be optimized independently
8. **Debugging**: Middleware provides observation points

## Migration from Current Architecture

1. Replace separate `MemoryStore` and `VectorStore` with unified `Memory`
2. Convert existing stores to providers
3. Move memory operations from agent code to Memory API
4. Add middleware for current cross-cutting concerns
5. Gradually adopt specialized memory types

This architecture provides maximum flexibility while maintaining a clean, intuitive API for developers.