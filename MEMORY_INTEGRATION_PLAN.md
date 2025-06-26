# Memory System Integration Plan

## Overview

This document outlines a clean, phased approach to integrating the unified Memory API into Daydreams, replacing the current fragmented storage system.

## Current State Analysis

### What We Have
```typescript
// Current fragmented approach
interface BaseMemory {
  store: MemoryStore;    // Basic KV operations
  vector: VectorStore;   // Separate vector operations
}

// Limited integration points
- Basic get/set operations
- Manual memory management
- No lifecycle hooks
- No intelligent routing
```

### What We're Building
```typescript
// Unified Memory API
interface Memory {
  // Rich memory types
  working: WorkingMemory;
  facts: FactualMemory;
  episodes: EpisodicMemory;
  semantic: SemanticMemory;
  graph: GraphMemory;
  
  // Unified operations
  remember(content: any): Promise<void>;
  recall(query: string): Promise<MemoryResult[]>;
  
  // Lifecycle integration
  lifecycle: MemoryLifecycle;
}
```

## Integration Phases

### Phase 1: Core Memory System (Week 1-2)

#### 1.1 Define Core Interfaces
```typescript
// packages/core/src/memory/types.ts
export interface Memory {
  // Core memory types
  working: WorkingMemory;
  kv: KeyValueMemory;
  vector: VectorMemory;
  graph?: GraphMemory;
  
  // Unified operations
  remember(content: any, options?: RememberOptions): Promise<void>;
  recall(query: string, options?: RecallOptions): Promise<MemoryResult[]>;
  forget(criteria: ForgetCriteria): Promise<void>;
  
  // System operations
  initialize(): Promise<void>;
  close(): Promise<void>;
  
  // Lifecycle
  lifecycle: MemoryLifecycle;
}

// Provider interfaces
export interface MemoryProvider {
  initialize(): Promise<void>;
  close(): Promise<void>;
  health(): Promise<HealthStatus>;
}

export interface KeyValueProvider extends MemoryProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, options?: SetOptions): Promise<void>;
  delete(key: string): Promise<boolean>;
  scan(pattern: string): AsyncIterator<[string, any]>;
}
```

#### 1.2 Implement MemorySystem
```typescript
// packages/core/src/memory/memory-system.ts
export class MemorySystem implements Memory {
  constructor(config: MemoryConfig) {
    this.setupProviders(config.providers);
    this.setupMiddleware(config.middleware);
    this.setupLifecycle();
    this.initializeMemoryTypes();
  }
}
```

#### 1.3 Create Migration Adapter
```typescript
// packages/core/src/memory/migration-adapter.ts
// Temporary adapter to support existing code during migration
export class LegacyAdapter {
  constructor(private memory: Memory) {}
  
  // Map old interface to new
  get store() {
    return {
      get: (key: string) => this.memory.kv.get(key),
      set: (key: string, value: any) => this.memory.kv.set(key, value),
      // ... other methods
    };
  }
  
  get vector() {
    return {
      upsert: (id: string, data: any) => this.memory.vector.index(data),
      query: (id: string, q: string) => this.memory.vector.search({ query: q }),
      // ... other methods
    };
  }
}
```

### Phase 2: Update Core Components (Week 3-4)

#### 2.1 Update Agent Creation
```typescript
// packages/core/src/dreams.ts
export interface DreamsConfig {
  // Old (to be removed)
  memory?: BaseMemory;
  
  // New
  memorySystem?: Memory | MemoryConfig;
}

export async function createDreams(config: DreamsConfig): Promise<Agent> {
  // Support both during transition
  let memory: Memory;
  
  if (config.memorySystem) {
    memory = config.memorySystem instanceof MemorySystem 
      ? config.memorySystem 
      : new MemorySystem(config.memorySystem);
  } else if (config.memory) {
    // Use legacy adapter
    memory = new LegacyAdapter(config.memory);
    console.warn('Using legacy memory configuration. Please migrate to memorySystem.');
  } else {
    // Default memory
    memory = new MemorySystem({
      providers: {
        kv: new InMemoryProvider(),
        vector: new NoOpVectorProvider()
      }
    });
  }
  
  await memory.initialize();
  
  const agent = {
    memory,
    // ... rest of agent
  };
  
  // Setup lifecycle hooks
  setupMemoryLifecycleHooks(agent);
  
  return agent;
}
```

#### 2.2 Update Context Management
```typescript
// packages/core/src/context.ts
export async function getContext(
  agent: Agent,
  type: string,
  key?: string,
  options?: ContextOptions
): Promise<ContextState> {
  const id = createContextId(type, key);
  
  // Use new memory API
  const existingState = await agent.memory.kv.get<ContextState>(`context:${id}`);
  
  if (existingState) {
    // Restore working memory
    existingState.workingMemory = await agent.memory.working.get(id);
    return existingState;
  }
  
  // Create new context
  const contextDef = agent.registry.contexts.get(type);
  
  // Initialize memory
  const contextMemory = contextDef.load
    ? await contextDef.load(id, { options, settings })
    : await agent.memory.kv.get(`memory:${id}`) || {};
    
  const workingMemory = await agent.memory.working.create(id);
  
  const state = {
    id,
    type,
    memory: contextMemory || await contextDef.create?.({ key, args, id }),
    workingMemory,
    settings: options?.settings || {}
  };
  
  // Store with new API
  await agent.memory.kv.set(`context:${id}`, state);
  await agent.memory.working.set(id, workingMemory);
  
  return state;
}

export async function saveContext(
  agent: Agent,
  state: ContextState
): Promise<void> {
  // Use new memory API
  await agent.memory.kv.set(`context:${state.id}`, {
    id: state.id,
    type: state.type,
    memory: state.memory,
    settings: state.settings
  });
  
  await agent.memory.working.set(state.id, state.workingMemory);
  
  // Emit lifecycle event
  await agent.memory.lifecycle.emit('context.saved', state);
}
```

#### 2.3 Update Engine for Memory Integration
```typescript
// packages/core/src/engine.ts
export class Engine {
  async run(agent: Agent, chain: InputRef[]): Promise<EngineResult> {
    // ... existing setup ...
    
    // Add memory recall before processing
    for (const input of chain) {
      if (input.ref === 'input') {
        const memories = await agent.memory.recall(input.content, {
          context: context.id,
          limit: 10
        });
        
        // Add to working memory
        context.workingMemory.relevantMemories = memories;
      }
    }
    
    // ... rest of processing ...
    
    // Extract and store memories after response
    if (response) {
      await agent.memory.remember({
        type: 'interaction',
        input: input.content,
        response: response.content,
        context: context.id,
        timestamp: Date.now()
      });
    }
  }
}
```

### Phase 3: Implement Memory Types (Week 5-6)

#### 3.1 Working Memory Implementation
```typescript
// packages/core/src/memory/working-memory.ts
export class WorkingMemoryImpl implements WorkingMemory {
  constructor(
    private provider: KeyValueProvider,
    private options: WorkingMemoryOptions = {}
  ) {}
  
  async get(contextId: string): Promise<WorkingMemoryData> {
    const data = await this.provider.get<WorkingMemoryData>(
      `working-memory:${contextId}`
    );
    
    return data || this.createEmpty();
  }
  
  async push(
    contextId: string,
    entry: AnyRef,
    manager?: MemoryManager
  ): Promise<void> {
    const memory = await this.get(contextId);
    
    // Check memory pressure
    if (manager && await this.shouldPrune(memory, entry, manager)) {
      await this.handleMemoryPressure(contextId, memory, manager);
    }
    
    // Add entry
    this.addEntry(memory, entry);
    
    // Save
    await this.set(contextId, memory);
  }
}
```

#### 3.2 Factual Memory Implementation
```typescript
// packages/core/src/memory/factual-memory.ts
export class FactualMemoryImpl implements FactualMemory {
  constructor(
    private kv: KeyValueProvider,
    private vector: VectorProvider,
    private embedder?: EmbeddingProvider
  ) {}
  
  async store(fact: Fact | Fact[]): Promise<void> {
    const facts = Array.isArray(fact) ? fact : [fact];
    
    // Store in KV
    await Promise.all(facts.map(f => 
      this.kv.set(`fact:${f.id}`, f)
    ));
    
    // Index for semantic search if vector provider available
    if (this.vector && this.embedder) {
      const documents = await Promise.all(facts.map(async f => ({
        id: f.id,
        content: f.statement,
        embedding: await this.embedder!.embed(f.statement),
        metadata: {
          type: 'fact',
          confidence: f.confidence,
          source: f.source,
          timestamp: f.timestamp
        }
      })));
      
      await this.vector.index(documents);
    }
  }
  
  async verify(factId: string): Promise<FactVerification> {
    const fact = await this.kv.get<Fact>(`fact:${factId}`);
    if (!fact) throw new Error(`Fact ${factId} not found`);
    
    // Find conflicting facts
    const conflicts = await this.findConflicts(fact);
    
    // Calculate verification score
    return {
      factId,
      verified: conflicts.length === 0,
      confidence: this.calculateConfidence(fact, conflicts),
      conflicts,
      lastVerified: Date.now()
    };
  }
}
```

### Phase 4: Lifecycle Integration (Week 7-8)

#### 4.1 Memory Lifecycle Setup
```typescript
// packages/core/src/memory/lifecycle.ts
export function setupMemoryLifecycleHooks(agent: Agent): void {
  const memory = agent.memory;
  
  // Before input processing
  agent.on('input.pre', async (input, context) => {
    const memories = await memory.recall(input.content, {
      context: context.id,
      types: ['fact', 'episode', 'preference'],
      limit: 20
    });
    
    context.workingMemory.relevantMemories = memories;
    
    await memory.lifecycle.emit('memories.recalled', {
      input,
      context,
      memories
    });
  });
  
  // After step completion
  agent.on('step.post', async (step, context) => {
    // Save to working memory
    await memory.working.push(context.id, step);
    
    // Extract memories if intelligent
    if (agent.config.memorySystem?.intelligent) {
      const extracted = await memory.extract(step, context);
      await memory.remember(extracted);
    }
  });
  
  // After action execution
  agent.on('action.post', async (action, result, context) => {
    if (agent.config.memorySystem?.generateEpisodes) {
      await memory.episodes.store({
        id: `action:${action.id}`,
        type: 'action',
        action: action.name,
        input: action.input,
        result: result.data,
        context: context.id,
        timestamp: Date.now()
      });
    }
  });
  
  // On context save
  agent.on('context.save', async (context) => {
    await memory.lifecycle.emit('context.saving', context);
    
    // Persistence handled by saveContext
    
    await memory.lifecycle.emit('context.saved', context);
  });
  
  // On error
  agent.on('error', async (error, context) => {
    await memory.remember({
      type: 'error',
      error: error.message,
      stack: error.stack,
      context: context?.id,
      timestamp: Date.now()
    });
  });
}
```

#### 4.2 Prompt Builder Integration
```typescript
// packages/core/src/prompt-builder.ts
export async function buildPromptWithMemory(
  agent: Agent,
  input: InputRef,
  context: ContextState,
  options: PromptOptions
): Promise<string> {
  const memory = agent.memory;
  
  // Get relevant memories (already in working memory from lifecycle)
  const memories = context.workingMemory.relevantMemories || [];
  
  // Build memory context section
  let memoryContext = '';
  
  const facts = memories.filter(m => m.type === 'fact');
  if (facts.length > 0) {
    memoryContext += '## Known Facts\n';
    memoryContext += facts.map(f => `- ${f.content}`).join('\n');
    memoryContext += '\n\n';
  }
  
  const episodes = memories.filter(m => m.type === 'episode');
  if (episodes.length > 0) {
    memoryContext += '## Relevant Past Experiences\n';
    memoryContext += episodes.map(e => `- ${e.summary}`).join('\n');
    memoryContext += '\n\n';
  }
  
  // Build full prompt
  return `${options.systemPrompt}

${memoryContext}

## Current Conversation
${formatWorkingMemory(context.workingMemory)}

## User Input
${input.content}`;
}
```

### Phase 5: Provider Implementation (Week 9-10)

#### 5.1 Update Existing Providers
```typescript
// packages/redis/src/index.ts
import { KeyValueProvider } from '@daydreams/core';

export class RedisProvider implements KeyValueProvider {
  // Implementation as shown in MEMORY_PROVIDER_EXAMPLE.md
}

// packages/chroma/src/index.ts
import { VectorProvider } from '@daydreams/core';

export class ChromaProvider implements VectorProvider {
  // Updated implementation
}
```

#### 5.2 Create New Providers
```typescript
// packages/neo4j/src/index.ts
import { GraphProvider } from '@daydreams/core';

export class Neo4jProvider implements GraphProvider {
  // New graph provider
}
```

### Phase 6: Migration and Cleanup (Week 11-12)

#### 6.1 Remove Legacy Code
- Remove `MemoryStore` and `VectorStore` interfaces
- Remove `BaseMemory` type
- Update all imports and references

#### 6.2 Update Documentation
- API documentation for new Memory system
- Migration guide for extensions
- Example implementations

#### 6.3 Update Examples
```typescript
// examples/basic/src/index.ts
const agent = createDreams({
  model: 'gpt-4',
  memorySystem: {
    providers: {
      kv: new RedisProvider({ url: 'redis://localhost' }),
      vector: new ChromaProvider({ url: 'http://localhost:8000' })
    },
    middleware: [
      new CacheMiddleware({ ttl: 300 }),
      new EvolutionMiddleware({ interval: 3600000 })
    ]
  }
});
```

## Testing Strategy

### Unit Tests
```typescript
// packages/core/src/memory/__tests__/memory-system.test.ts
describe('MemorySystem', () => {
  it('should initialize providers', async () => {
    const memory = new MemorySystem({ providers: { kv: mockProvider } });
    await memory.initialize();
    expect(mockProvider.initialize).toHaveBeenCalled();
  });
  
  it('should route remember operations', async () => {
    const memory = new MemorySystem({ providers });
    await memory.remember({ type: 'fact', content: 'test' });
    expect(providers.kv.set).toHaveBeenCalled();
  });
});
```

### Integration Tests
```typescript
// packages/core/src/__tests__/memory-integration.test.ts
describe('Memory Integration', () => {
  it('should recall memories during input processing', async () => {
    const agent = await createDreams({ memorySystem: testMemory });
    await agent.memory.remember({ type: 'fact', content: 'User likes blue' });
    
    const response = await agent.send('What is my favorite color?');
    expect(response).toContain('blue');
  });
});
```

## Rollout Plan

### Week 1-2: Foundation
- [ ] Implement core Memory interfaces
- [ ] Create MemorySystem class
- [ ] Build legacy adapter
- [ ] Basic unit tests

### Week 3-4: Core Integration
- [ ] Update agent creation
- [ ] Update context management
- [ ] Update engine
- [ ] Integration tests

### Week 5-6: Memory Types
- [ ] Implement WorkingMemory
- [ ] Implement FactualMemory
- [ ] Implement EpisodicMemory
- [ ] Memory type tests

### Week 7-8: Lifecycle
- [ ] Setup lifecycle hooks
- [ ] Integrate with prompts
- [ ] Add memory middleware
- [ ] Lifecycle tests

### Week 9-10: Providers
- [ ] Update Redis provider
- [ ] Update vector providers
- [ ] Create graph provider
- [ ] Provider tests

### Week 11-12: Cleanup
- [ ] Remove legacy code
- [ ] Update documentation
- [ ] Update examples
- [ ] Final testing

## Success Criteria

1. **No Breaking Changes Initially**: Legacy adapter ensures existing code works
2. **Clean Migration Path**: Clear documentation and examples
3. **Performance**: No regression in operation speed
4. **Type Safety**: Full TypeScript coverage
5. **Test Coverage**: >90% coverage on memory system
6. **Documentation**: Complete API docs and guides

## Risk Mitigation

### Risk: Breaking Existing Extensions
**Mitigation**: 
- Legacy adapter provides compatibility
- Gradual deprecation with warnings
- Clear migration guides

### Risk: Performance Impact
**Mitigation**:
- Benchmark before/after
- Caching middleware by default
- Async operations where possible

### Risk: Complexity
**Mitigation**:
- Simple API surface
- Good defaults
- Progressive disclosure of features

## Conclusion

This plan provides a clean, systematic approach to integrating the unified Memory API while minimizing disruption. The phased approach allows for iterative development and testing, ensuring each component is solid before moving to the next.