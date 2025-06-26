# RFC: Storage Adapter Interface

## Summary
Introduce a new `StorageAdapter` interface to decouple storage implementations from framework logic, enabling better extensibility and type safety.

## Motivation

Current issues:
- Direct coupling between agents and storage implementations
- Limited to basic key-value operations
- No batch operation support
- Weak type safety with `any` types
- No standard error handling

This RFC addresses these issues by introducing a standardized adapter interface.

## Detailed Design

### Core Interface

```typescript
// packages/core/src/storage/types.ts

export interface StorageAdapter<T = any> {
  /**
   * Initialize the storage adapter
   */
  initialize(): Promise<void>;
  
  /**
   * Close connections and cleanup
   */
  close(): Promise<void>;
  
  // Single operations
  get(key: string): Promise<T | null>;
  set(key: string, value: T, options?: SetOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  exists(key: string): Promise<boolean>;
  
  // Batch operations
  getBatch(keys: string[]): Promise<Map<string, T>>;
  setBatch(entries: Map<string, T>, options?: SetOptions): Promise<void>;
  deleteBatch(keys: string[]): Promise<number>;
  
  // Query operations
  keys(pattern?: string | RegExp): Promise<string[]>;
  scan(options: ScanOptions): AsyncIterator<[string, T]>;
  count(pattern?: string | RegExp): Promise<number>;
  
  // Metadata
  readonly capabilities: StorageCapabilities;
}

export interface SetOptions {
  ttl?: number; // Time to live in seconds
  ifNotExists?: boolean; // Only set if key doesn't exist
  tags?: Record<string, string>; // Metadata tags
}

export interface ScanOptions {
  pattern?: string | RegExp;
  limit?: number;
  cursor?: string;
}

export interface StorageCapabilities {
  ttl: boolean;
  batching: boolean;
  scanning: boolean;
  transactions: boolean;
  sorting: boolean;
}
```

### Adapter Base Class

```typescript
// packages/core/src/storage/adapter-base.ts

export abstract class BaseStorageAdapter<T = any> implements StorageAdapter<T> {
  abstract get(key: string): Promise<T | null>;
  abstract set(key: string, value: T, options?: SetOptions): Promise<void>;
  abstract delete(key: string): Promise<boolean>;
  
  // Default batch implementations using single operations
  async getBatch(keys: string[]): Promise<Map<string, T>> {
    const results = new Map<string, T>();
    const promises = keys.map(async (key) => {
      const value = await this.get(key);
      if (value !== null) {
        results.set(key, value);
      }
    });
    await Promise.all(promises);
    return results;
  }
  
  async setBatch(entries: Map<string, T>, options?: SetOptions): Promise<void> {
    const promises = Array.from(entries.entries()).map(([key, value]) =>
      this.set(key, value, options)
    );
    await Promise.all(promises);
  }
  
  async exists(key: string): Promise<boolean> {
    const value = await this.get(key);
    return value !== null;
  }
  
  // Subclasses can override for better performance
  async *scan(options: ScanOptions): AsyncIterator<[string, T]> {
    const keys = await this.keys(options.pattern);
    let count = 0;
    for (const key of keys) {
      if (options.limit && count >= options.limit) break;
      const value = await this.get(key);
      if (value !== null) {
        yield [key, value];
        count++;
      }
    }
  }
}
```

### Adapter Registry

```typescript
// packages/core/src/storage/registry.ts

export class StorageAdapterRegistry {
  private adapters = new Map<string, StorageAdapter>();
  private defaultAdapter?: string;
  
  register(name: string, adapter: StorageAdapter): void {
    this.adapters.set(name, adapter);
  }
  
  get(name?: string): StorageAdapter {
    const adapterName = name || this.defaultAdapter;
    if (!adapterName) {
      throw new Error('No storage adapter specified and no default set');
    }
    
    const adapter = this.adapters.get(adapterName);
    if (!adapter) {
      throw new Error(`Storage adapter '${adapterName}' not found`);
    }
    
    return adapter;
  }
  
  setDefault(name: string): void {
    if (!this.adapters.has(name)) {
      throw new Error(`Cannot set default: adapter '${name}' not registered`);
    }
    this.defaultAdapter = name;
  }
}
```


### Example Implementation

```typescript
// packages/redis/src/redis-adapter.ts

export class RedisStorageAdapter extends BaseStorageAdapter {
  private client: Redis;
  
  constructor(private config: RedisConfig) {
    super();
  }
  
  async initialize(): Promise<void> {
    this.client = new Redis(this.config);
    await this.client.ping();
  }
  
  async close(): Promise<void> {
    await this.client.quit();
  }
  
  async get(key: string): Promise<any> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }
  
  async set(key: string, value: any, options?: SetOptions): Promise<void> {
    const serialized = JSON.stringify(value);
    
    if (options?.ttl) {
      await this.client.setex(key, options.ttl, serialized);
    } else if (options?.ifNotExists) {
      await this.client.setnx(key, serialized);
    } else {
      await this.client.set(key, serialized);
    }
  }
  
  // Optimized batch operations
  async getBatch(keys: string[]): Promise<Map<string, any>> {
    const values = await this.client.mget(...keys);
    const results = new Map<string, any>();
    
    keys.forEach((key, index) => {
      const value = values[index];
      if (value) {
        results.set(key, JSON.parse(value));
      }
    });
    
    return results;
  }
  
  get capabilities(): StorageCapabilities {
    return {
      ttl: true,
      batching: true,
      scanning: true,
      transactions: true,
      sorting: true,
    };
  }
}
```

### Integration with Agent

```typescript
// packages/core/src/dreams.ts

export interface DreamsConfig {
  // Existing config...
  
  storage: {
    adapter: StorageAdapter;
    serializer?: SerializationProtocol;
  };
}

export function createDreams(config: DreamsConfig): Agent {
  if (!config.storage?.adapter) {
    throw new Error('Storage adapter is required');
  }
  
  const storage = {
    adapter: config.storage.adapter,
    serializer: config.storage.serializer || new JSONSerializer(),
  };
  
  // Initialize storage
  await storage.adapter.initialize();
  
  // Rest of agent creation...
}
```

## Implementation Plan

### Immediate Changes (v0.4.0)
- Remove MemoryStore and VectorStore interfaces
- Replace with new StorageAdapter interface
- Update all existing storage extensions
- Update documentation with new API

### Breaking Changes

- **Removed**: `MemoryStore` interface
- **Removed**: `VectorStore` interface  
- **Removed**: `memory.store` and `memory.vector` config options
- **Required**: `storage.adapter` in agent configuration
- **Required**: All storage extensions must implement `StorageAdapter`

## Alternatives Considered

1. **Extend existing MemoryStore interface**
   - Pros: Backwards compatibility
   - Cons: Limited by current design, technical debt

2. **Multiple specialized interfaces**
   - Pros: Type safety per use case
   - Cons: Complex for adapter developers

3. **GraphQL-style query language**
   - Pros: Very flexible
   - Cons: Over-engineered for current needs

**Decision**: Clean break with new interface provides the best long-term foundation.

## Open Questions

1. Should we support async iterators for all operations?
2. How should we handle serialization in the adapter vs framework?
3. Should capabilities be static or dynamic (discovered at runtime)?
4. Do we need a standard error hierarchy for storage errors?

## Example Usage

```typescript
// Create agent with new storage
const agent = createDreams({
  storage: {
    adapter: new RedisStorageAdapter({
      host: 'localhost',
      port: 6379,
    }),
    serializer: new MessagePackSerializer(),
  },
  // Other config...
});

// Direct storage access
const storage = agent.storage.adapter;
await storage.set('user:123', userData);
const user = await storage.get('user:123');

// Batch operations
const users = await storage.getBatch(['user:123', 'user:456']);
```

## References

- Redis command reference
- DynamoDB API patterns
- PostgreSQL client best practices