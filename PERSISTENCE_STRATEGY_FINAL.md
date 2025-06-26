# Final Persistence Strategy: Unified Memory API

## Architectural Shift

Moving from separate Storage/Vector adapters to a **single, unified Memory API** that encompasses all memory types and operations.

### Before (Current)
```typescript
const agent = createDreams({
  memory: {
    store: new MemoryStore(),    // KV operations
    vector: new VectorStore(),   // Semantic search
  }
});
```

### After (Proposed)
```typescript
const agent = createDreams({
  memory: new MemorySystem({
    providers: {
      kv: new RedisProvider(),
      vector: new ChromaProvider(),
      graph: new Neo4jProvider()
    },
    middleware: [
      new CacheMiddleware(),
      new EvolutionMiddleware()
    ]
  })
});
```

## Core Design Principles

### 1. Single Entry Point
- One Memory API configured in `createDreams`
- All memory operations go through this unified interface
- Consistent API regardless of underlying storage

### 2. Provider Architecture
```typescript
interface MemoryProvider {
  initialize(): Promise<void>;
  close(): Promise<void>;
  health(): Promise<HealthStatus>;
}

// Specialized providers extend base
interface KeyValueProvider extends MemoryProvider { }
interface VectorProvider extends MemoryProvider { }
interface GraphProvider extends MemoryProvider { }
```

### 3. Memory Types as First-Class Citizens
```typescript
interface Memory {
  // Different memory types exposed directly
  working: WorkingMemory;      // Current session
  facts: FactualMemory;        // Verified information
  episodes: EpisodicMemory;    // Past experiences
  semantic: SemanticMemory;    // Concepts and knowledge
  graph: GraphMemory;          // Relationships
  
  // Unified operations
  remember(content: any): Promise<void>;
  recall(query: string): Promise<MemoryResult[]>;
  forget(criteria: any): Promise<void>;
}
```

### 4. Middleware for Cross-Cutting Concerns
```typescript
interface MemoryMiddleware {
  // Lifecycle hooks
  beforeRemember?(ctx: MemoryContext): Promise<void>;
  afterRemember?(ctx: MemoryContext): Promise<void>;
  beforeRecall?(ctx: MemoryContext): Promise<void>;
  afterRecall?(ctx: MemoryContext): Promise<void>;
  
  // Transform hooks
  transformStore?(data: any): Promise<any>;
  transformRetrieve?(data: any): Promise<any>;
}
```

### 5. Deep Agent Integration
```typescript
// Memory operations automatically triggered by agent lifecycle
agent.on('input.pre', async (input, context) => {
  // Automatic memory recall
  const memories = await agent.memory.recall(input.content);
  context.workingMemory.relevantMemories = memories;
});

agent.on('step.post', async (step, context) => {
  // Automatic memory storage
  await agent.memory.remember({
    type: 'step',
    content: step,
    context: context.id
  });
});
```

## Key Benefits

### 1. Developer Experience
```typescript
// Simple, intuitive API
await agent.memory.remember({ fact: "User prefers dark mode" });
const memories = await agent.memory.recall("user preferences");

// Direct access to specialized memory types
const timeline = await agent.memory.episodes.getTimeline(start, end);
const facts = await agent.memory.facts.verify("user-location");
```

### 2. Flexibility
- Mix and match providers (Redis for KV, Pinecone for vectors, Neo4j for graphs)
- Add new memory types without changing core API
- Middleware handles cross-cutting concerns cleanly

### 3. Performance
- Providers optimized independently
- Middleware for caching, batching, compression
- Parallel operations across memory types

### 4. Intelligence
- Automatic classification of memories
- Smart routing to appropriate storage
- Evolution and consolidation over time

## Implementation Phases

### Phase 1: Core Memory System (Week 1-2)
- [ ] Define Memory interface and base types
- [ ] Implement MemorySystem class
- [ ] Create provider interfaces
- [ ] Build middleware system

### Phase 2: Providers (Week 3-4)
- [ ] Implement KeyValueProvider adapters (Redis, PostgreSQL)
- [ ] Implement VectorProvider adapters (Chroma, Pinecone)
- [ ] Implement GraphProvider adapters (Neo4j)
- [ ] Create in-memory providers for testing

### Phase 3: Memory Types (Week 5-6)
- [ ] Implement FactualMemory
- [ ] Implement EpisodicMemory
- [ ] Implement SemanticMemory
- [ ] Implement GraphMemory

### Phase 4: Intelligence Layer (Week 7-8)
- [ ] Memory classification system
- [ ] Automatic routing logic
- [ ] Evolution and consolidation
- [ ] Conflict resolution

### Phase 5: Integration (Week 9-10)
- [ ] Agent lifecycle hooks
- [ ] Middleware implementations
- [ ] Performance optimizations
- [ ] Documentation and examples

## Breaking Changes

Since we're not supporting backwards compatibility:

1. **Remove**: `MemoryStore` and `VectorStore` interfaces
2. **Remove**: `memory.store` and `memory.vector` configuration
3. **Replace**: With unified `memory: MemorySystem` configuration
4. **Update**: All existing storage extensions to use provider pattern

## Example: Complete Configuration

```typescript
const agent = createDreams({
  model: 'gpt-4',
  
  memory: new MemorySystem({
    // Storage providers
    providers: {
      kv: new RedisProvider({
        url: process.env.REDIS_URL,
        keyPrefix: 'daydreams:'
      }),
      vector: new PineconeProvider({
        apiKey: process.env.PINECONE_API_KEY,
        environment: 'production',
        indexName: 'daydreams-memories'
      }),
      graph: new Neo4jProvider({
        uri: process.env.NEO4J_URI,
        auth: neo4j.auth.basic('neo4j', process.env.NEO4J_PASSWORD)
      })
    },
    
    // Middleware stack
    middleware: [
      // Performance
      new CacheMiddleware({
        ttl: 300,
        maxSize: 1000
      }),
      
      // Security
      new EncryptionMiddleware({
        key: process.env.ENCRYPTION_KEY,
        algorithm: 'aes-256-gcm'
      }),
      
      // Intelligence
      new EvolutionMiddleware({
        model: 'gpt-4',
        consolidationInterval: 3600
      }),
      
      // Observability
      new MetricsMiddleware({
        collector: prometheusRegistry,
        buckets: [0.01, 0.05, 0.1, 0.5, 1]
      })
    ],
    
    // Global options
    options: {
      defaultTTL: 86400,
      compressionThreshold: 1024,
      batchSize: 100,
      maxMemorySize: '1GB'
    }
  }),
  
  // Rest of configuration...
});
```

## Conclusion

This unified Memory API represents a fundamental improvement in how Daydreams handles persistence. By treating memory as a first-class concept with multiple specialized types, we enable sophisticated AI applications while maintaining a clean, extensible architecture.

The middleware system ensures cross-cutting concerns are handled consistently, while the provider pattern allows for maximum flexibility in storage backends. Most importantly, the deep integration with agent lifecycle means memory operations happen automatically at the right times.

This design positions Daydreams as a leader in stateful AI agent frameworks, ready for the next generation of intelligent applications.