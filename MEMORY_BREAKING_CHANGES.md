# Memory System Breaking Changes Guide

## Overview

This guide details all breaking changes when migrating to the new unified Memory API.

## What's Being Removed

### 1. Interfaces and Types
```typescript
// REMOVED - These no longer exist
interface MemoryStore { }
interface VectorStore { }
interface BaseMemory { }

// REMOVED - Old configuration
interface DreamsConfig {
  memory?: BaseMemory;  // ❌ REMOVED
}
```

### 2. Old Memory Methods
```typescript
// REMOVED - Old way
agent.memory.store.get(key)
agent.memory.store.set(key, value)
agent.memory.vector.upsert(id, data)
agent.memory.vector.query(id, query)

// NEW - Unified API
agent.memory.kv.get(key)
agent.memory.kv.set(key, value)
agent.memory.vector.index(documents)
agent.memory.vector.search(query)
agent.memory.recall(query)  // High-level unified search
agent.memory.remember(content)  // Intelligent storage
```

## Required Changes

### 1. Agent Creation
```typescript
// ❌ OLD
const agent = createDreams({
  model: 'gpt-4',
  memory: {
    store: createMemoryStore(),
    vector: createVectorStore()
  }
});

// ✅ NEW - Memory configuration is REQUIRED
const agent = createDreams({
  model: 'gpt-4',
  memory: {
    providers: {
      kv: new RedisProvider({ url: 'redis://localhost' }),
      vector: new ChromaProvider({ url: 'http://localhost:8000' }),
      graph: new Neo4jProvider({ uri: 'bolt://localhost' })
    }
  }
});
```

### 2. Context Operations
```typescript
// ❌ OLD
const memory = await agent.memory.store.get(`memory:${id}`);
await agent.memory.store.set(`context:${id}`, state);

// ✅ NEW
const memory = await agent.memory.kv.get(`memory:${id}`);
await agent.memory.kv.set(`context:${id}`, state);
```

### 3. Working Memory
```typescript
// ❌ OLD
const workingMemory = await agent.memory.store.get(`working-memory:${id}`);
pushToWorkingMemory(workingMemory, entry);
await agent.memory.store.set(`working-memory:${id}`, workingMemory);

// ✅ NEW
const workingMemory = await agent.memory.working.get(id);
await agent.memory.working.push(id, entry, { memoryManager });
// Saving is automatic
```

### 4. Vector Operations
```typescript
// ❌ OLD
await agent.memory.vector.upsert(contextId, {
  id: doc.id,
  text: doc.content,
  vector: embedding
});

const results = await agent.memory.vector.query(contextId, queryText);

// ✅ NEW
await agent.memory.vector.index([{
  id: doc.id,
  content: doc.content,
  embedding: embedding,
  metadata: { contextId }
}]);

const results = await agent.memory.vector.search({
  query: queryText,
  filter: { contextId },
  limit: 10
});
```

### 5. Storage Extension Updates

#### Redis Extension
```typescript
// ❌ OLD
export function createRedisStore(): MemoryStore {
  return {
    get, set, delete, clear, keys
  };
}

// ✅ NEW
export class RedisProvider implements KeyValueProvider {
  async initialize(): Promise<void> { }
  async close(): Promise<void> { }
  async health(): Promise<HealthStatus> { }
  async get<T>(key: string): Promise<T | null> { }
  async set<T>(key: string, value: T): Promise<void> { }
  // ... all required methods
}
```

#### Vector Extensions
```typescript
// ❌ OLD
export function createChromaStore(): VectorStore {
  return {
    upsert, query, createIndex, deleteIndex
  };
}

// ✅ NEW
export class ChromaProvider implements VectorProvider {
  async initialize(): Promise<void> { }
  async close(): Promise<void> { }
  async health(): Promise<HealthStatus> { }
  async index(documents: VectorDocument[]): Promise<void> { }
  async search(query: VectorQuery): Promise<VectorResult[]> { }
  async delete(ids: string[]): Promise<void> { }
}
```

### 6. Memory Management
```typescript
// ❌ OLD - Manual memory management
if (workingMemory.inputs.length > 100) {
  workingMemory.inputs = workingMemory.inputs.slice(-50);
}

// ✅ NEW - Automatic with memory managers
await agent.memory.working.push(contextId, entry, {
  memoryManager: smartMemoryManager({ maxSize: 100 })
});
```

### 7. Action Memory
```typescript
// ❌ OLD
if (action.memory) {
  actionMemory = await agent.memory.store.get(action.memory.key) || 
    await action.memory.create();
}
// ... after action
await agent.memory.store.set(action.memory.key, actionMemory);

// ✅ NEW - Action memory is part of the memory system
const actionMemory = await agent.memory.kv.get(`action:${action.name}`);
// ... after action
await agent.memory.kv.set(`action:${action.name}`, actionMemory);

// Plus automatic episodic memory creation
// Episodes are created automatically in lifecycle hooks
```

## New Required Concepts

### 1. Memory Providers
All storage backends must implement provider interfaces:
- `KeyValueProvider` - For structured data
- `VectorProvider` - For embeddings and similarity search
- `GraphProvider` - For relationships and entities

### 2. Unified Operations
New high-level operations that work across all memory types:
- `memory.remember()` - Intelligently stores any content
- `memory.recall()` - Searches across all memory types
- `memory.extract()` - Extracts structured information from content
- `memory.evolve()` - Consolidates and learns from memories

### 3. Memory Types
Specialized interfaces for different kinds of memory:
- `working` - Current session state
- `facts` - Verified information with confidence scores
- `episodes` - Past interactions and experiences
- `semantic` - Learned patterns and concepts
- `graph` - Entity relationships

### 4. Lifecycle Integration
Memory operations now happen automatically:
- Input processing triggers recall
- Step completion triggers storage
- Actions create episodic memories
- Periodic evolution improves memory

## Migration Checklist

- [ ] Update all imports from old interfaces to new
- [ ] Replace `memory.store` with `memory.kv`
- [ ] Replace `memory.vector` with new vector API
- [ ] Update agent creation with required memory config
- [ ] Update all storage extensions to implement providers
- [ ] Remove manual memory management code
- [ ] Add memory lifecycle hooks
- [ ] Test memory recall and storage
- [ ] Update documentation

## Common Errors and Solutions

### Error: "Memory configuration is required"
**Solution**: Add memory configuration to createDreams:
```typescript
memory: {
  providers: {
    kv: new InMemoryProvider(),
    vector: new InMemoryVectorProvider(),
    graph: new InMemoryGraphProvider()
  }
}
```

### Error: "Cannot read property 'store' of undefined"
**Solution**: Replace `agent.memory.store` with `agent.memory.kv`

### Error: "Method 'upsert' does not exist"
**Solution**: Replace `vector.upsert()` with `vector.index()`

### Error: "Working memory not found for context"
**Solution**: Ensure context is properly initialized with `agent.memory.working.create(contextId)`

## Benefits After Migration

1. **Unified API**: Single consistent interface for all memory operations
2. **Automatic Management**: Memory lifecycle handled by framework
3. **Rich Memory Types**: Facts, episodes, semantic knowledge built-in
4. **Better Performance**: Optimized providers and caching
5. **Type Safety**: Full TypeScript support throughout
6. **Intelligent Operations**: `remember()` and `recall()` handle complexity

The breaking changes are significant but result in a much more powerful and cohesive memory system.