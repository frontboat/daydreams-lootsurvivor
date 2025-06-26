# Memory Provider Implementation Example

## Complete Redis Provider Implementation

This example shows how to implement a KeyValueProvider for the new Memory API.

```typescript
// packages/redis/src/redis-provider.ts

import { Redis } from 'ioredis';
import { KeyValueProvider, SetOptions, HealthStatus } from '@daydreams/core';

export interface RedisProviderConfig {
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  keyPrefix?: string;
  connectionTimeout?: number;
  maxRetries?: number;
}

export class RedisProvider implements KeyValueProvider {
  private client: Redis;
  private prefix: string;
  private isConnected: boolean = false;

  constructor(private config: RedisProviderConfig = {}) {
    this.prefix = config.keyPrefix || 'daydreams:';
  }

  async initialize(): Promise<void> {
    try {
      // Create Redis client
      this.client = new Redis({
        ...(this.config.url ? { url: this.config.url } : {
          host: this.config.host || 'localhost',
          port: this.config.port || 6379,
          password: this.config.password
        }),
        connectTimeout: this.config.connectionTimeout || 10000,
        maxRetriesPerRequest: this.config.maxRetries || 3,
        retryStrategy: (times) => Math.min(times * 50, 2000)
      });

      // Wait for connection
      await new Promise<void>((resolve, reject) => {
        this.client.once('ready', () => {
          this.isConnected = true;
          resolve();
        });
        this.client.once('error', reject);
      });

      // Set up error handlers
      this.client.on('error', (err) => {
        console.error('Redis provider error:', err);
        this.isConnected = false;
      });

      this.client.on('reconnecting', () => {
        console.log('Redis provider reconnecting...');
      });

    } catch (error) {
      throw new Error(`Failed to initialize Redis provider: ${error.message}`);
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.isConnected = false;
    }
  }

  async health(): Promise<HealthStatus> {
    try {
      if (!this.isConnected) {
        return {
          status: 'unhealthy',
          message: 'Not connected to Redis',
          details: { connected: false }
        };
      }

      // Ping to check connection
      const start = Date.now();
      await this.client.ping();
      const latency = Date.now() - start;

      // Get memory usage
      const info = await this.client.info('memory');
      const usedMemory = parseInt(info.match(/used_memory:(\d+)/)?.[1] || '0');

      return {
        status: 'healthy',
        message: 'Redis provider is operational',
        details: {
          connected: true,
          latency: `${latency}ms`,
          memoryUsage: `${(usedMemory / 1024 / 1024).toFixed(2)}MB`,
          keyPrefix: this.prefix
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Health check failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  async get<T>(key: string): Promise<T | null> {
    this.ensureConnected();
    
    const fullKey = this.prefix + key;
    const value = await this.client.get(fullKey);
    
    if (!value) return null;
    
    try {
      return JSON.parse(value);
    } catch {
      // Return as string if not valid JSON
      return value as unknown as T;
    }
  }

  async set<T>(key: string, value: T, options?: SetOptions): Promise<void> {
    this.ensureConnected();
    
    const fullKey = this.prefix + key;
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    
    // Handle different set options
    if (options?.ttl) {
      await this.client.setex(fullKey, options.ttl, serialized);
    } else if (options?.ifNotExists) {
      const result = await this.client.setnx(fullKey, serialized);
      if (result === 0) {
        throw new Error(`Key ${key} already exists`);
      }
    } else {
      await this.client.set(fullKey, serialized);
    }
    
    // Handle tags if supported (using Redis sets)
    if (options?.tags) {
      await this.setTags(key, options.tags);
    }
  }

  async delete(key: string): Promise<boolean> {
    this.ensureConnected();
    
    const fullKey = this.prefix + key;
    const result = await this.client.del(fullKey);
    
    // Clean up tags
    await this.deleteTags(key);
    
    return result > 0;
  }

  async *scan(pattern: string = '*'): AsyncIterator<[string, any]> {
    this.ensureConnected();
    
    const fullPattern = this.prefix + pattern;
    const stream = this.client.scanStream({
      match: fullPattern,
      count: 100
    });
    
    for await (const keys of stream) {
      for (const fullKey of keys) {
        const key = fullKey.slice(this.prefix.length);
        const value = await this.get(key);
        if (value !== null) {
          yield [key, value];
        }
      }
    }
  }

  async keys(pattern: string = '*'): Promise<string[]> {
    this.ensureConnected();
    
    const fullPattern = this.prefix + pattern;
    const fullKeys = await this.client.keys(fullPattern);
    
    // Remove prefix from keys
    return fullKeys.map(key => key.slice(this.prefix.length));
  }

  async count(pattern: string = '*'): Promise<number> {
    const keys = await this.keys(pattern);
    return keys.length;
  }

  // Batch operations with optimizations
  async getBatch<T>(keys: string[]): Promise<Map<string, T>> {
    this.ensureConnected();
    
    if (keys.length === 0) return new Map();
    
    // Use MGET for efficiency
    const fullKeys = keys.map(key => this.prefix + key);
    const values = await this.client.mget(...fullKeys);
    
    const results = new Map<string, T>();
    keys.forEach((key, index) => {
      const value = values[index];
      if (value) {
        try {
          results.set(key, JSON.parse(value));
        } catch {
          results.set(key, value as unknown as T);
        }
      }
    });
    
    return results;
  }

  async setBatch<T>(entries: Map<string, T>, options?: SetOptions): Promise<void> {
    this.ensureConnected();
    
    if (entries.size === 0) return;
    
    // Use pipeline for efficiency
    const pipeline = this.client.pipeline();
    
    for (const [key, value] of entries) {
      const fullKey = this.prefix + key;
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      
      if (options?.ttl) {
        pipeline.setex(fullKey, options.ttl, serialized);
      } else if (options?.ifNotExists) {
        pipeline.setnx(fullKey, serialized);
      } else {
        pipeline.set(fullKey, serialized);
      }
    }
    
    await pipeline.exec();
    
    // Handle tags in batch
    if (options?.tags) {
      const tagPipeline = this.client.pipeline();
      for (const key of entries.keys()) {
        await this.setTags(key, options.tags, tagPipeline);
      }
      await tagPipeline.exec();
    }
  }

  async deleteBatch(keys: string[]): Promise<number> {
    this.ensureConnected();
    
    if (keys.length === 0) return 0;
    
    const fullKeys = keys.map(key => this.prefix + key);
    const result = await this.client.del(...fullKeys);
    
    // Clean up tags
    const pipeline = this.client.pipeline();
    for (const key of keys) {
      await this.deleteTags(key, pipeline);
    }
    await pipeline.exec();
    
    return result;
  }

  // Private helper methods
  private ensureConnected(): void {
    if (!this.isConnected) {
      throw new Error('Redis provider not connected. Call initialize() first.');
    }
  }

  private async setTags(key: string, tags: Record<string, string>, pipeline?: any): Promise<void> {
    const pipe = pipeline || this.client.pipeline();
    
    for (const [tagKey, tagValue] of Object.entries(tags)) {
      const tagSetKey = `${this.prefix}tags:${tagKey}:${tagValue}`;
      pipe.sadd(tagSetKey, key);
      
      // Store reverse mapping for cleanup
      pipe.sadd(`${this.prefix}key-tags:${key}`, `${tagKey}:${tagValue}`);
    }
    
    if (!pipeline) {
      await pipe.exec();
    }
  }

  private async deleteTags(key: string, pipeline?: any): Promise<void> {
    const pipe = pipeline || this.client.pipeline();
    
    // Get all tags for this key
    const tagSetKey = `${this.prefix}key-tags:${key}`;
    const tags = await this.client.smembers(tagSetKey);
    
    // Remove key from each tag set
    for (const tag of tags) {
      const [tagKey, tagValue] = tag.split(':');
      pipe.srem(`${this.prefix}tags:${tagKey}:${tagValue}`, key);
    }
    
    // Remove the key-tags mapping
    pipe.del(tagSetKey);
    
    if (!pipeline) {
      await pipe.exec();
    }
  }

  // Additional Redis-specific methods
  async findByTag(tagKey: string, tagValue: string): Promise<string[]> {
    this.ensureConnected();
    
    const tagSetKey = `${this.prefix}tags:${tagKey}:${tagValue}`;
    return await this.client.smembers(tagSetKey);
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    this.ensureConnected();
    
    const fullKey = this.prefix + key;
    const result = await this.client.expire(fullKey, seconds);
    return result === 1;
  }

  async ttl(key: string): Promise<number> {
    this.ensureConnected();
    
    const fullKey = this.prefix + key;
    return await this.client.ttl(fullKey);
  }
}

// Extension registration
export function createRedisMemory(config: RedisProviderConfig) {
  return {
    name: 'redis-memory',
    install: async (agent) => {
      const provider = new RedisProvider(config);
      await provider.initialize();
      
      // Register as the KV provider
      agent.memory.registerProvider('kv', provider);
    }
  };
}
```

## Usage Example

```typescript
import { createDreams, MemorySystem } from '@daydreams/core';
import { RedisProvider } from '@daydreams/redis';
import { ChromaProvider } from '@daydreams/chroma';

const agent = createDreams({
  memory: new MemorySystem({
    providers: {
      kv: new RedisProvider({
        url: 'redis://localhost:6379',
        keyPrefix: 'myapp:',
        connectionTimeout: 5000
      }),
      vector: new ChromaProvider({
        url: 'http://localhost:8000'
      })
    },
    middleware: [
      new CacheMiddleware({ ttl: 300 }),
      new CompressionMiddleware({ threshold: 1024 })
    ]
  })
});

// The agent now uses Redis for all KV operations
await agent.start();

// Direct usage
await agent.memory.kv.set('user:123', { name: 'Alice', preferences: {} });
const user = await agent.memory.kv.get('user:123');

// With tags
await agent.memory.kv.set('session:456', sessionData, {
  ttl: 3600,
  tags: { userId: '123', type: 'web' }
});

// Find by tag
const userSessions = await (agent.memory.kv as RedisProvider).findByTag('userId', '123');
```

## Key Implementation Points

1. **Interface Compliance**: Implements all required `KeyValueProvider` methods
2. **Connection Management**: Proper initialization and cleanup
3. **Error Handling**: Graceful handling of connection issues
4. **Performance**: Uses Redis-specific optimizations (MGET, pipelines)
5. **Health Monitoring**: Detailed health check implementation
6. **Extra Features**: Tags support using Redis sets
7. **Type Safety**: Proper TypeScript types throughout

This example shows how providers can leverage backend-specific features while maintaining a consistent interface for the Memory API.