# Daydreams Persistence Strategy

## Executive Summary

This document outlines a comprehensive strategy for evolving Daydreams' persistence architecture to support future growth while maintaining the framework's core philosophy of extensibility and minimal business logic. The strategy emphasizes standardization, separation of concerns, and developer experience.

## Current State Analysis

### Strengths
1. **Clear Separation**: Distinct MemoryStore (KV) and VectorStore interfaces
2. **Pluggable Architecture**: Easy to swap storage backends
3. **Context-Centric Design**: All data organized around contexts
4. **Automatic Persistence**: Transparent to developers
5. **Memory Management**: Built-in strategies for long conversations

### Identified Gaps
1. **Limited Abstraction Layers**: Direct coupling between agents and storage
2. **Inconsistent Serialization**: No standardized approach across stores
3. **Missing Middleware**: No interception points for cross-cutting concerns
4. **Limited Query Capabilities**: Basic key-value operations only
5. **No Transaction Support**: Atomicity concerns for complex operations
6. **Weak Type Safety**: Heavy reliance on any types in storage interfaces
7. **No Schema Evolution**: No versioning or migration support
8. **Limited Observability**: No built-in metrics or monitoring hooks

## Strategic Recommendations

### 1. Enhanced Storage Abstraction Layer

#### 1.1 Introduce Storage Adapters
```typescript
interface StorageAdapter<T = any> {
  // Core operations
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  delete(key: string): Promise<void>;
  
  // Batch operations
  getBatch(keys: string[]): Promise<Map<string, T>>;
  setBatch(entries: Map<string, T>): Promise<void>;
  
  // Query operations
  query(filter: QueryFilter): Promise<T[]>;
  count(filter: QueryFilter): Promise<number>;
  
  // Transaction support
  transaction<R>(fn: (tx: Transaction) => Promise<R>): Promise<R>;
}

interface QueryFilter {
  prefix?: string;
  tags?: Record<string, any>;
  timeRange?: { start: Date; end?: Date };
  limit?: number;
  offset?: number;
}
```

#### 1.2 Specialized Store Types
```typescript
// Context-specific store with optimized operations
interface ContextStore extends StorageAdapter<ContextData> {
  getByType(type: string): Promise<ContextData[]>;
  getActive(since: Date): Promise<ContextData[]>;
  archive(contextId: string): Promise<void>;
}

// Memory-specific store with compression support
interface MemoryStore extends StorageAdapter<WorkingMemory> {
  compress(contextId: string, strategy: CompressionStrategy): Promise<void>;
  getWindow(contextId: string, window: TimeWindow): Promise<WorkingMemory>;
}
```

### 2. Standardized Serialization Layer

#### 2.1 Serialization Protocol
```typescript
interface SerializationProtocol<T> {
  serialize(data: T): Promise<Buffer | string>;
  deserialize(raw: Buffer | string): Promise<T>;
  contentType: string; // 'application/json', 'application/msgpack', etc.
}

// Pluggable serializers
const serializers = {
  json: new JSONSerializer(),
  msgpack: new MessagePackSerializer(),
  protobuf: new ProtobufSerializer(),
};
```

#### 2.2 Schema Registry
```typescript
interface SchemaRegistry {
  register(type: string, schema: Schema): void;
  validate(type: string, data: unknown): ValidationResult;
  migrate(type: string, data: unknown, fromVersion: number): unknown;
}
```

### 3. Middleware Architecture

#### 3.1 Storage Middleware
```typescript
interface StorageMiddleware {
  beforeRead?(key: string, context: MiddlewareContext): Promise<void>;
  afterRead?(key: string, value: any, context: MiddlewareContext): Promise<any>;
  beforeWrite?(key: string, value: any, context: MiddlewareContext): Promise<any>;
  afterWrite?(key: string, value: any, context: MiddlewareContext): Promise<void>;
  onError?(error: Error, context: MiddlewareContext): Promise<void>;
}

// Example middleware
class EncryptionMiddleware implements StorageMiddleware {
  async beforeWrite(key: string, value: any) {
    return encrypt(value, this.key);
  }
  async afterRead(key: string, value: any) {
    return decrypt(value, this.key);
  }
}
```

#### 3.2 Built-in Middleware
- **Caching**: Multi-level caching with TTL
- **Compression**: Automatic compression for large values
- **Encryption**: At-rest encryption for sensitive data
- **Auditing**: Track all storage operations
- **Metrics**: Performance monitoring and alerting

### 4. Advanced Query Capabilities

#### 4.1 Query Builder API
```typescript
const contexts = await storage
  .contexts()
  .where('type', '=', 'chat')
  .where('created', '>', dayjs().subtract(7, 'days'))
  .orderBy('lastActive', 'desc')
  .limit(10)
  .include(['workingMemory', 'metadata'])
  .execute();
```

#### 4.2 Aggregation Support
```typescript
const stats = await storage
  .contexts()
  .aggregate({
    totalMessages: { $sum: 'messageCount' },
    avgDuration: { $avg: 'duration' },
    byType: { $group: 'type' }
  })
  .execute();
```

### 5. Transaction and Consistency Model

#### 5.1 Transaction API
```typescript
await storage.transaction(async (tx) => {
  const context = await tx.contexts.get(contextId);
  const memory = await tx.memories.get(memoryId);
  
  // All operations atomic
  await tx.contexts.update(contextId, updatedContext);
  await tx.memories.append(memoryId, newEntries);
  await tx.events.emit('context.updated', { contextId });
});
```

#### 5.2 Consistency Levels
```typescript
enum ConsistencyLevel {
  EVENTUAL = 'eventual',      // Default, best performance
  STRONG = 'strong',          // ACID guarantees
  BOUNDED = 'bounded',        // Max staleness guarantees
}
```

### 6. Type Safety and Developer Experience

#### 6.1 Strongly Typed Storage
```typescript
// Type-safe storage with automatic inference
const contextStore = createStore<ContextData>('contexts', {
  schema: contextSchema,
  indexes: ['type', 'userId'],
});

// Compile-time type checking
const context = await contextStore.get(id); // TypeScript knows this is ContextData
```

#### 6.2 Storage Decorators
```typescript
@Persistent({ store: 'contexts', ttl: '30d' })
class ChatContext extends BaseContext {
  @Index() userId: string;
  @Encrypted() apiKeys: Record<string, string>;
  @Compressed() messages: Message[];
}
```

### 7. Observability and Monitoring

#### 7.1 Built-in Metrics
```typescript
interface StorageMetrics {
  operations: Counter;         // Read/write counts
  latency: Histogram;         // Operation latencies
  size: Gauge;               // Storage size
  errors: Counter;           // Error counts by type
}
```

#### 7.2 Tracing Integration
```typescript
// OpenTelemetry integration
const span = tracer.startSpan('storage.get');
try {
  const value = await storage.get(key);
  span.setAttributes({ 
    'storage.key': key,
    'storage.size': sizeof(value) 
  });
} finally {
  span.end();
}
```

### 8. Implementation Timeline

#### Phase 1: Core Implementation (Month 1)
1. Replace MemoryStore/VectorStore with new StorageAdapter interface
2. Implement serialization layer with JSON default
3. Add basic middleware support
4. Update all existing storage extensions

#### Phase 2: Enhancement (Month 2)
1. Add transaction support
2. Implement query builder
3. Add schema registry
4. Complete documentation

#### Phase 3: Advanced Features (Month 3)
1. Add aggregation support
2. Implement decorators
3. Integrate observability
4. Performance optimizations

### 9. Breaking Changes

This strategy represents a complete overhaul of the persistence layer:

- **Removed**: Legacy MemoryStore and VectorStore interfaces
- **Removed**: Direct storage coupling in agents
- **New Required**: All storage implementations must use StorageAdapter
- **New Required**: Explicit serialization configuration
- **Impact**: All existing storage extensions must be rewritten

### 10. Extension Developer Guidelines

#### Storage Extension Template
```typescript
export class MyStorageAdapter implements StorageAdapter {
  constructor(private config: MyStorageConfig) {}
  
  async initialize(): Promise<void> {
    // Setup connection, create tables/indexes
  }
  
  async get(key: string): Promise<any> {
    // Implementation with proper error handling
  }
  
  // ... other required methods
}

// Registration
export function createMyStorage(config: MyStorageConfig): Extension {
  return {
    name: 'my-storage',
    install: async (agent) => {
      const adapter = new MyStorageAdapter(config);
      await adapter.initialize();
      agent.registerStorageAdapter('my-storage', adapter);
    }
  };
}
```

## Benefits of This Strategy

1. **Developer Experience**: Type-safe, intuitive APIs with good defaults
2. **Performance**: Caching, batching, and query optimization
3. **Reliability**: Transactions, consistency guarantees, error handling
4. **Extensibility**: Clear extension points without framework coupling
5. **Observability**: Built-in monitoring and debugging capabilities
6. **Clean Architecture**: No legacy code or compatibility layers

## Next Steps

1. **Gather Feedback**: Review with core team and community
2. **Prototype**: Build proof-of-concept for key components
3. **Implementation**: Direct replacement of existing system
4. **Documentation**: Comprehensive guides for new API
5. **Extension Updates**: Rewrite all storage extensions

This strategy positions Daydreams for long-term success by providing a robust, extensible persistence layer that scales with application complexity while maintaining simplicity for basic use cases. The clean break from legacy systems ensures no technical debt and a solid foundation for future development.