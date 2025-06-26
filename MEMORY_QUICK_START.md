# Memory System Quick Start Guide

## Overview

This guide shows the immediate next steps to begin implementing the unified Memory API in Daydreams.

## Step 1: Create Core Memory Interfaces

```typescript
// packages/core/src/memory/types.ts

export interface Memory {
  // Core memory types
  working: WorkingMemory;
  kv: KeyValueMemory;
  vector: VectorMemory;
  facts?: FactualMemory;
  episodes?: EpisodicMemory;
  semantic?: SemanticMemory;
  graph?: GraphMemory;
  
  // Unified operations
  remember(content: any, options?: RememberOptions): Promise<void>;
  recall(query: string, options?: RecallOptions): Promise<MemoryResult[]>;
  forget(criteria: ForgetCriteria): Promise<void>;
  
  // Lifecycle
  lifecycle: MemoryLifecycle;
  
  // System
  initialize(): Promise<void>;
  close(): Promise<void>;
}

export interface MemoryConfig {
  providers: {
    kv: KeyValueProvider;
    vector?: VectorProvider;
    graph?: GraphProvider;
  };
  middleware?: MemoryMiddleware[];
  options?: MemoryOptions;
}

export interface MemoryProvider {
  initialize(): Promise<void>;
  close(): Promise<void>;
  health(): Promise<HealthStatus>;
}

export interface KeyValueProvider extends MemoryProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: SetOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  keys(pattern?: string): Promise<string[]>;
  scan(pattern?: string): AsyncIterator<[string, any]>;
}

export interface VectorProvider extends MemoryProvider {
  index(documents: VectorDocument[]): Promise<void>;
  search(query: VectorQuery): Promise<VectorResult[]>;
  delete(ids: string[]): Promise<void>;
}
```

## Step 2: Implement Basic MemorySystem

```typescript
// packages/core/src/memory/memory-system.ts

import { EventEmitter } from 'events';
import type { Memory, MemoryConfig, KeyValueMemory, VectorMemory, WorkingMemory } from './types';

export class MemorySystem implements Memory {
  public lifecycle: MemoryLifecycle;
  public working: WorkingMemory;
  public kv: KeyValueMemory;
  public vector: VectorMemory;
  
  private providers: MemoryConfig['providers'];
  private middleware: MemoryMiddleware[];
  
  constructor(private config: MemoryConfig) {
    this.providers = config.providers;
    this.middleware = config.middleware || [];
    this.lifecycle = new MemoryLifecycle();
    
    // Initialize memory types
    this.kv = new KeyValueMemoryImpl(this.providers.kv);
    this.vector = this.providers.vector 
      ? new VectorMemoryImpl(this.providers.vector)
      : new NoOpVectorMemory();
    this.working = new WorkingMemoryImpl(this.kv);
  }
  
  async initialize(): Promise<void> {
    // Initialize all providers
    await this.providers.kv.initialize();
    if (this.providers.vector) {
      await this.providers.vector.initialize();
    }
    if (this.providers.graph) {
      await this.providers.graph.initialize();
    }
    
    // Initialize middleware
    for (const mw of this.middleware) {
      if (mw.initialize) {
        await mw.initialize(this);
      }
    }
    
    this.lifecycle.emit('initialized');
  }
  
  async remember(content: any, options?: RememberOptions): Promise<void> {
    await this.lifecycle.emit('beforeRemember', { content, options });
    
    // Simple implementation - can be enhanced later
    const key = options?.key || `memory:${Date.now()}`;
    await this.kv.set(key, content);
    
    // Index if vector provider available
    if (this.providers.vector && options?.index !== false) {
      await this.vector.index([{
        id: key,
        content: JSON.stringify(content),
        metadata: options?.metadata
      }]);
    }
    
    await this.lifecycle.emit('afterRemember', { content, options });
  }
  
  async recall(query: string, options?: RecallOptions): Promise<MemoryResult[]> {
    await this.lifecycle.emit('beforeRecall', { query, options });
    
    const results: MemoryResult[] = [];
    
    // Search vector store if available
    if (this.providers.vector) {
      const vectorResults = await this.vector.search({
        query,
        limit: options?.limit || 10
      });
      
      // Fetch full content from KV store
      for (const vr of vectorResults) {
        const content = await this.kv.get(vr.id);
        if (content) {
          results.push({
            id: vr.id,
            content,
            score: vr.score,
            type: 'vector'
          });
        }
      }
    }
    
    await this.lifecycle.emit('afterRecall', { query, options, results });
    
    return results;
  }
  
  async forget(criteria: ForgetCriteria): Promise<void> {
    // Simple implementation - delete by key pattern
    if (criteria.pattern) {
      const keys = await this.kv.keys(criteria.pattern);
      for (const key of keys) {
        await this.kv.delete(key);
      }
    }
  }
  
  async close(): Promise<void> {
    await this.providers.kv.close();
    if (this.providers.vector) {
      await this.providers.vector.close();
    }
    if (this.providers.graph) {
      await this.providers.graph.close();
    }
    
    this.lifecycle.emit('closed');
  }
}

class MemoryLifecycle extends EventEmitter {
  async emit(event: string, data?: any): Promise<void> {
    super.emit(event, data);
  }
}
```

## Step 3: Create In-Memory Provider

```typescript
// packages/core/src/memory/providers/in-memory.ts

export class InMemoryProvider implements KeyValueProvider {
  private store = new Map<string, any>();
  private ready = false;
  
  async initialize(): Promise<void> {
    this.ready = true;
  }
  
  async close(): Promise<void> {
    this.store.clear();
    this.ready = false;
  }
  
  async health(): Promise<HealthStatus> {
    return {
      status: this.ready ? 'healthy' : 'unhealthy',
      message: this.ready ? 'In-memory provider operational' : 'Not initialized'
    };
  }
  
  async get<T>(key: string): Promise<T | null> {
    return this.store.get(key) ?? null;
  }
  
  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }
  
  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }
  
  async keys(pattern?: string): Promise<string[]> {
    const allKeys = Array.from(this.store.keys());
    
    if (!pattern) return allKeys;
    
    // Simple pattern matching (supports * wildcard)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return allKeys.filter(key => regex.test(key));
  }
  
  async *scan(pattern?: string): AsyncIterator<[string, any]> {
    const keys = await this.keys(pattern);
    for (const key of keys) {
      const value = await this.get(key);
      if (value !== null) {
        yield [key, value];
      }
    }
  }
}
```

## Step 4: Update Agent Creation (With Compatibility)

```typescript
// packages/core/src/dreams.ts

// Add to existing imports
import { Memory, MemorySystem, InMemoryProvider } from './memory';

// Update config interface
export interface DreamsConfig {
  // ... existing config ...
  
  // Old (keep for compatibility)
  memory?: BaseMemory;
  
  // New
  memorySystem?: Memory | MemoryConfig;
}

// Update createDreams function
export async function createDreams(config: DreamsConfig): Promise<Agent> {
  // ... existing setup ...
  
  // Initialize memory
  let memory: Memory;
  
  if (config.memorySystem) {
    // Use new memory system
    memory = config.memorySystem instanceof MemorySystem
      ? config.memorySystem
      : new MemorySystem(config.memorySystem);
  } else if (config.memory) {
    // Use compatibility adapter for old API
    memory = createLegacyAdapter(config.memory);
    console.warn('Using legacy memory configuration. Please migrate to memorySystem.');
  } else {
    // Default in-memory system
    memory = new MemorySystem({
      providers: {
        kv: new InMemoryProvider()
      }
    });
  }
  
  await memory.initialize();
  
  // Create agent with new memory
  const agent = {
    // ... existing properties ...
    memory,
    
    // Keep old memory property for compatibility
    get memoryLegacy() {
      return {
        store: {
          get: (k: string) => memory.kv.get(k),
          set: (k: string, v: any) => memory.kv.set(k, v),
          delete: (k: string) => memory.kv.delete(k),
          clear: async () => {
            const keys = await memory.kv.keys();
            await Promise.all(keys.map(k => memory.kv.delete(k)));
          },
          keys: (pattern?: string) => memory.kv.keys(pattern)
        },
        vector: {
          upsert: async (id: string, data: any) => {
            await memory.vector.index([{ id, ...data }]);
          },
          query: async (id: string, query: string) => {
            const results = await memory.vector.search({ query });
            return results;
          },
          createIndex: async () => {},
          deleteIndex: async () => {}
        }
      };
    }
  };
  
  // ... rest of agent creation ...
}
```

## Step 5: Start Using New API in One Place

```typescript
// packages/core/src/context.ts

// Update getContext to use new memory API
export async function getContext(
  agent: Agent,
  type: string,
  key?: string,
  options?: ContextOptions
): Promise<ContextState> {
  const id = createContextId(type, key);
  
  // Try new memory API first
  if (agent.memory) {
    const existingState = await agent.memory.kv.get<ContextState>(`context:${id}`);
    if (existingState) {
      return existingState;
    }
  } else {
    // Fallback to old API
    const existingState = await agent.memoryLegacy.store.get(`context:${id}`);
    if (existingState) {
      return existingState;
    }
  }
  
  // ... rest of function ...
}
```

## Next Immediate Actions

### 1. Create the type definitions file
```bash
touch packages/core/src/memory/types.ts
# Copy the interfaces from Step 1
```

### 2. Create the memory system implementation
```bash
touch packages/core/src/memory/memory-system.ts
# Copy the implementation from Step 2
```

### 3. Create the in-memory provider
```bash
mkdir -p packages/core/src/memory/providers
touch packages/core/src/memory/providers/in-memory.ts
# Copy the implementation from Step 3
```

### 4. Create barrel exports
```bash
touch packages/core/src/memory/index.ts
```

```typescript
// packages/core/src/memory/index.ts
export * from './types';
export { MemorySystem } from './memory-system';
export { InMemoryProvider } from './providers/in-memory';
```

### 5. Run tests to ensure nothing breaks
```bash
cd packages/core
pnpm test
```

## Testing the New System

```typescript
// packages/core/src/memory/__tests__/memory-system.test.ts

import { describe, it, expect } from 'vitest';
import { MemorySystem, InMemoryProvider } from '../index';

describe('MemorySystem', () => {
  it('should initialize and perform basic operations', async () => {
    const memory = new MemorySystem({
      providers: {
        kv: new InMemoryProvider()
      }
    });
    
    await memory.initialize();
    
    // Test remember
    await memory.remember({ fact: 'test fact' }, { key: 'fact:1' });
    
    // Test KV get
    const stored = await memory.kv.get('fact:1');
    expect(stored).toEqual({ fact: 'test fact' });
    
    // Test recall (without vector provider, should return empty)
    const results = await memory.recall('test');
    expect(results).toEqual([]);
    
    await memory.close();
  });
});
```

## Summary

This quick start provides:

1. **Minimal viable implementation** of the new Memory API
2. **Backwards compatibility** with existing code
3. **Clear migration path** for gradual adoption
4. **Testable components** from day one

Start with these steps, test thoroughly, then gradually expand to include more sophisticated memory types and providers.