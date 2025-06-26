# Memory System Integration Plan (Clean Break)

## Overview

This document outlines a direct replacement approach for integrating the unified Memory API into Daydreams, with no backwards compatibility.

## Clean Architecture Approach

### Remove
```typescript
// These interfaces and types will be deleted
- MemoryStore
- VectorStore  
- BaseMemory
- All legacy memory code
```

### Replace With
```typescript
// Single unified Memory API
interface Memory {
  working: WorkingMemory;
  kv: KeyValueMemory;
  vector: VectorMemory;
  facts: FactualMemory;
  episodes: EpisodicMemory;
  semantic: SemanticMemory;
  graph: GraphMemory;
  
  remember(content: any): Promise<void>;
  recall(query: string): Promise<MemoryResult[]>;
  
  lifecycle: MemoryLifecycle;
}
```

## Implementation Phases

### Phase 1: Core Memory System (Week 1)

#### 1.1 Create New Memory Structure
```typescript
// packages/core/src/memory/types.ts
export interface Memory {
  // Core memory types - all required
  working: WorkingMemory;
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
  extract(content: any, context: ContextState): Promise<ExtractedMemories>;
  evolve(): Promise<void>;
  
  // Lifecycle
  lifecycle: MemoryLifecycle;
  
  // System
  initialize(): Promise<void>;
  close(): Promise<void>;
}
```

#### 1.2 Remove Old Interfaces
```bash
# Delete old memory files
rm packages/core/src/types/memory.ts
rm packages/core/src/memory/base.ts

# Remove from exports
# Update packages/core/src/types.ts to remove MemoryStore, VectorStore, BaseMemory
```

#### 1.3 Implement MemorySystem
```typescript
// packages/core/src/memory/memory-system.ts
export class MemorySystem implements Memory {
  public working: WorkingMemory;
  public kv: KeyValueMemory;
  public vector: VectorMemory;
  public facts: FactualMemory;
  public episodes: EpisodicMemory;
  public semantic: SemanticMemory;
  public graph: GraphMemory;
  public lifecycle: MemoryLifecycle;
  
  constructor(config: MemoryConfig) {
    // Initialize all memory types - no optionals
    this.lifecycle = new MemoryLifecycle();
    this.kv = new KeyValueMemoryImpl(config.providers.kv);
    this.vector = new VectorMemoryImpl(config.providers.vector);
    this.graph = new GraphMemoryImpl(config.providers.graph);
    
    // Higher-level memory types that use the base providers
    this.working = new WorkingMemoryImpl(this);
    this.facts = new FactualMemoryImpl(this);
    this.episodes = new EpisodicMemoryImpl(this);
    this.semantic = new SemanticMemoryImpl(this);
    
    // Setup middleware
    this.setupMiddleware(config.middleware || []);
  }
  
  async initialize(): Promise<void> {
    // Initialize all providers
    await Promise.all([
      this.kv.provider.initialize(),
      this.vector.provider.initialize(),
      this.graph.provider.initialize()
    ]);
    
    // Initialize memory types
    await Promise.all([
      this.working.initialize(),
      this.facts.initialize(),
      this.episodes.initialize(),
      this.semantic.initialize()
    ]);
    
    this.lifecycle.emit('initialized');
  }
}
```

### Phase 2: Update Core Components (Week 2)

#### 2.1 Update Agent Interface
```typescript
// packages/core/src/types/agent.ts
export interface Agent {
  id: string;
  model: LanguageModelV1;
  memory: Memory; // Required, not optional
  container: Container;
  runner: TaskRunner;
  logger: Logger;
  // Remove old memory property
}
```

#### 2.2 Update Agent Creation
```typescript
// packages/core/src/dreams.ts
export interface DreamsConfig {
  model: LanguageModelV1;
  memory: MemoryConfig; // Required configuration
  extensions?: Extension[];
  // Remove old memory option
}

export async function createDreams(config: DreamsConfig): Promise<Agent> {
  // Memory is required
  if (!config.memory) {
    throw new Error('Memory configuration is required');
  }
  
  // Create memory system
  const memory = new MemorySystem(config.memory);
  await memory.initialize();
  
  // Create agent
  const agent: Agent = {
    id: generateId(),
    model: config.model,
    memory, // Single memory property
    container: new Container(),
    runner: new TaskRunner(),
    logger: createLogger(),
    // ... other properties
  };
  
  // Setup lifecycle hooks
  setupMemoryLifecycle(agent);
  
  // Load saved state
  await loadAgentState(agent);
  
  return agent;
}
```

#### 2.3 Update Context Management
```typescript
// packages/core/src/context.ts
export async function getContext(
  agent: Agent,
  type: string,
  key?: string,
  options?: ContextOptions
): Promise<ContextState> {
  const id = createContextId(type, key);
  
  // Use new memory API directly
  const existingState = await agent.memory.kv.get<ContextMetadata>(`context:${id}`);
  
  if (existingState) {
    // Restore full context
    const workingMemory = await agent.memory.working.get(id);
    const contextMemory = await agent.memory.kv.get(`memory:${id}`);
    
    return {
      id,
      type: existingState.type,
      memory: contextMemory,
      workingMemory,
      settings: existingState.settings
    };
  }
  
  // Create new context
  const contextDef = agent.registry.contexts.get(type);
  if (!contextDef) {
    throw new Error(`Context type '${type}' not found`);
  }
  
  // Initialize context memory
  const contextMemory = contextDef.create 
    ? await contextDef.create({ key, args: options?.args, id })
    : {};
    
  const workingMemory = await agent.memory.working.create(id);
  
  const state: ContextState = {
    id,
    type,
    memory: contextMemory,
    workingMemory,
    settings: options?.settings || {}
  };
  
  // Store in memory
  await agent.memory.kv.set(`context:${id}`, {
    id,
    type,
    settings: state.settings,
    created: Date.now()
  });
  await agent.memory.kv.set(`memory:${id}`, contextMemory);
  await agent.memory.working.set(id, workingMemory);
  
  // Record in facts
  await agent.memory.facts.store({
    id: `context-created-${id}`,
    statement: `Context ${id} of type ${type} was created`,
    confidence: 1.0,
    source: 'system',
    timestamp: Date.now()
  });
  
  return state;
}

export async function saveContext(
  agent: Agent,
  state: ContextState
): Promise<void> {
  // Save all context data
  await Promise.all([
    agent.memory.kv.set(`context:${state.id}`, {
      id: state.id,
      type: state.type,
      settings: state.settings,
      lastSaved: Date.now()
    }),
    agent.memory.kv.set(`memory:${state.id}`, state.memory),
    agent.memory.working.set(state.id, state.workingMemory)
  ]);
  
  // Emit event
  await agent.memory.lifecycle.emit('context.saved', state);
}
```

### Phase 3: Engine Integration (Week 3)

#### 3.1 Update Engine for Memory
```typescript
// packages/core/src/engine.ts
export class Engine {
  constructor(
    private agent: Agent,
    private model: LanguageModelV1
  ) {}
  
  async process(
    input: InputRef,
    context: ContextState
  ): Promise<EngineResult> {
    // Recall relevant memories before processing
    const memories = await this.agent.memory.recall(input.content, {
      context: context.id,
      types: ['fact', 'episode', 'preference', 'pattern'],
      limit: 20,
      minRelevance: 0.7
    });
    
    // Add to working memory
    context.workingMemory.relevantMemories = memories;
    
    // Find similar past interactions
    const similarEpisodes = await this.agent.memory.episodes.findSimilar(
      context.id,
      input.content,
      5
    );
    
    // Build memory-enhanced prompt
    const prompt = await this.buildPrompt(input, context, {
      memories,
      similarEpisodes,
      recentInteractions: this.getRecentInteractions(context.workingMemory)
    });
    
    // Generate response
    const response = await this.model.generate(prompt);
    
    // Extract and store new information
    await this.processResponse(response, context);
    
    return {
      response,
      memoriesUsed: memories.length,
      memoriesCreated: await this.getMemoriesCreated()
    };
  }
  
  private async processResponse(
    response: LLMResponse,
    context: ContextState
  ): Promise<void> {
    // Extract different types of information
    const extracted = await this.agent.memory.extract(response.content, context);
    
    // Store facts
    if (extracted.facts.length > 0) {
      await this.agent.memory.facts.store(extracted.facts);
    }
    
    // Store preferences
    if (extracted.preferences.length > 0) {
      for (const pref of extracted.preferences) {
        await this.agent.memory.remember({
          type: 'preference',
          content: pref,
          context: context.id,
          confidence: 0.8
        });
      }
    }
    
    // Update entities in graph
    if (extracted.entities.length > 0) {
      await this.agent.memory.graph.addNodes(extracted.entities);
    }
    
    // Create episode for this interaction
    await this.agent.memory.episodes.store({
      id: `interaction-${Date.now()}`,
      type: 'conversation',
      input: response.input,
      output: response.content,
      context: context.id,
      timestamp: Date.now(),
      metadata: {
        tokensUsed: response.usage?.totalTokens,
        model: this.model.modelId
      }
    });
  }
}
```

#### 3.2 Update Prompt Builder
```typescript
// packages/core/src/prompt-builder.ts
export class PromptBuilder {
  constructor(private memory: Memory) {}
  
  async build(
    input: InputRef,
    context: ContextState,
    options: PromptOptions
  ): Promise<Messages> {
    const messages: Messages = [];
    
    // System message with memory context
    const memoryContext = await this.buildMemoryContext(context);
    messages.push({
      role: 'system',
      content: `${options.systemPrompt}\n\n${memoryContext}`
    });
    
    // Add conversation history
    const history = this.formatWorkingMemory(context.workingMemory);
    messages.push(...history);
    
    // Add user input
    messages.push({
      role: 'user',
      content: input.content
    });
    
    return messages;
  }
  
  private async buildMemoryContext(context: ContextState): Promise<string> {
    const memories = context.workingMemory.relevantMemories || [];
    let sections: string[] = [];
    
    // Facts section
    const facts = memories.filter(m => m.type === 'fact');
    if (facts.length > 0) {
      sections.push('## Known Facts\n' + 
        facts.map(f => `- ${f.content} (confidence: ${f.confidence})`).join('\n')
      );
    }
    
    // Preferences section
    const preferences = memories.filter(m => m.type === 'preference');
    if (preferences.length > 0) {
      sections.push('## User Preferences\n' + 
        preferences.map(p => `- ${p.content}`).join('\n')
      );
    }
    
    // Patterns section
    const patterns = await this.memory.semantic.getRelevantPatterns(context.id);
    if (patterns.length > 0) {
      sections.push('## Learned Patterns\n' + 
        patterns.map(p => `- ${p.description} (observed ${p.occurrences} times)`).join('\n')
      );
    }
    
    return sections.join('\n\n');
  }
}
```

### Phase 4: Memory Types Implementation (Week 4)

#### 4.1 Working Memory
```typescript
// packages/core/src/memory/working-memory.ts
export class WorkingMemoryImpl implements WorkingMemory {
  constructor(private memory: Memory) {}
  
  async create(contextId: string): Promise<WorkingMemoryData> {
    const data: WorkingMemoryData = {
      inputs: [],
      outputs: [],
      thoughts: [],
      calls: [],
      results: [],
      events: [],
      steps: [],
      runs: [],
      relevantMemories: []
    };
    
    await this.memory.kv.set(`working-memory:${contextId}`, data);
    return data;
  }
  
  async get(contextId: string): Promise<WorkingMemoryData> {
    const data = await this.memory.kv.get<WorkingMemoryData>(
      `working-memory:${contextId}`
    );
    
    if (!data) {
      throw new Error(`Working memory not found for context ${contextId}`);
    }
    
    return data;
  }
  
  async push(
    contextId: string,
    entry: AnyRef,
    options?: PushOptions
  ): Promise<void> {
    const data = await this.get(contextId);
    
    // Add to appropriate array
    switch (entry.ref) {
      case 'input':
        data.inputs.push(entry);
        break;
      case 'output':
        data.outputs.push(entry);
        break;
      case 'thought':
        data.thoughts.push(entry);
        break;
      case 'call':
        data.calls.push(entry);
        break;
      case 'result':
        data.results.push(entry);
        break;
      default:
        data.events.push(entry);
    }
    
    // Handle memory pressure
    if (options?.memoryManager) {
      await this.handleMemoryPressure(contextId, data, options.memoryManager);
    }
    
    // Save updated data
    await this.set(contextId, data);
    
    // Emit event
    await this.memory.lifecycle.emit('workingMemory.updated', {
      contextId,
      entry,
      size: this.calculateSize(data)
    });
  }
}
```

#### 4.2 Factual Memory
```typescript
// packages/core/src/memory/factual-memory.ts
export class FactualMemoryImpl implements FactualMemory {
  constructor(private memory: Memory) {}
  
  async store(facts: Fact | Fact[]): Promise<void> {
    const factArray = Array.isArray(facts) ? facts : [facts];
    
    // Validate and deduplicate
    const validated = await this.validateFacts(factArray);
    
    // Store in KV
    await Promise.all(validated.map(fact =>
      this.memory.kv.set(`fact:${fact.id}`, fact)
    ));
    
    // Index in vector store
    const documents = validated.map(fact => ({
      id: fact.id,
      content: fact.statement,
      metadata: {
        type: 'fact',
        confidence: fact.confidence,
        source: fact.source,
        entities: fact.entities,
        timestamp: fact.timestamp
      }
    }));
    
    await this.memory.vector.index(documents);
    
    // Update graph with entities
    for (const fact of validated) {
      if (fact.entities && fact.entities.length > 0) {
        await this.updateEntityGraph(fact);
      }
    }
    
    // Emit event
    await this.memory.lifecycle.emit('facts.stored', validated);
  }
  
  async verify(factId: string): Promise<FactVerification> {
    const fact = await this.memory.kv.get<Fact>(`fact:${factId}`);
    if (!fact) {
      throw new Error(`Fact ${factId} not found`);
    }
    
    // Find related facts
    const related = await this.memory.vector.search({
      query: fact.statement,
      filter: { type: 'fact' },
      limit: 20
    });
    
    // Check for conflicts
    const conflicts = await this.findConflicts(fact, related);
    
    // Calculate verification score
    const verification: FactVerification = {
      factId,
      verified: conflicts.length === 0,
      confidence: this.calculateConfidence(fact, related, conflicts),
      supportingFacts: related.filter(r => r.score > 0.8).map(r => r.id),
      conflictingFacts: conflicts.map(c => c.id),
      lastVerified: Date.now()
    };
    
    // Update fact with verification
    fact.verification = verification;
    await this.memory.kv.set(`fact:${factId}`, fact);
    
    return verification;
  }
}
```

### Phase 5: Lifecycle Integration (Week 5)

#### 5.1 Setup Lifecycle Hooks
```typescript
// packages/core/src/memory/lifecycle.ts
export function setupMemoryLifecycle(agent: Agent): void {
  // Before input processing
  agent.on('input.pre', async (input, context) => {
    // Automatic memory recall
    const memories = await agent.memory.recall(input.content, {
      context: context.id,
      types: ['fact', 'episode', 'preference', 'pattern'],
      boost: {
        recent: 2.0,
        contextual: 1.5
      }
    });
    
    context.workingMemory.relevantMemories = memories;
  });
  
  // After each step
  agent.on('step.post', async (step, context) => {
    // Push to working memory
    await agent.memory.working.push(context.id, step);
    
    // Extract memories from step
    if (step.ref === 'output' || step.ref === 'thought') {
      const extracted = await agent.memory.extract(step.content, context);
      
      // Store extracted memories
      if (extracted.facts.length > 0) {
        await agent.memory.facts.store(extracted.facts);
      }
      
      if (extracted.preferences.length > 0) {
        await agent.memory.remember({
          type: 'preferences',
          items: extracted.preferences,
          context: context.id
        });
      }
    }
  });
  
  // After action execution
  agent.on('action.post', async (action, result, context) => {
    // Create episodic memory
    await agent.memory.episodes.store({
      id: `action:${action.id}`,
      type: 'action_execution',
      action: action.name,
      input: action.input,
      result: result.data,
      error: result.error,
      context: context.id,
      duration: result.duration,
      timestamp: Date.now()
    });
    
    // Learn from action results
    if (!result.error && agent.config.memory.learning) {
      await agent.memory.semantic.learnFromAction(action, result);
    }
  });
  
  // Periodic evolution
  if (agent.config.memory.evolution?.enabled) {
    setInterval(
      () => agent.memory.evolve(),
      agent.config.memory.evolution.interval || 3600000 // 1 hour default
    );
  }
  
  // On shutdown
  agent.on('shutdown', async () => {
    // Final evolution
    await agent.memory.evolve();
    
    // Save agent state
    await agent.memory.facts.store({
      id: 'agent:final-state',
      statement: 'Agent shutdown gracefully',
      metadata: {
        uptime: process.uptime(),
        memoriesCreated: await agent.memory.kv.count('*'),
        contextsActive: agent.contexts.size
      }
    });
    
    // Close memory system
    await agent.memory.close();
  });
}
```

### Phase 6: Update All Storage Extensions (Week 6)

#### 6.1 Update Redis Extension
```typescript
// packages/redis/src/index.ts
import { KeyValueProvider, VectorProvider, GraphProvider } from '@daydreams/core';

export class RedisProvider implements KeyValueProvider {
  // Implement all required methods
  // No optional methods - everything is required
}

export function createRedisMemory(config: RedisConfig) {
  return {
    kv: new RedisProvider(config),
    // Redis doesn't support vector/graph natively
    // User must provide these separately
  };
}
```

#### 6.2 Update Other Extensions
- ChromaDB → Implements VectorProvider
- Neo4j → Implements GraphProvider
- PostgreSQL → Can implement both KeyValueProvider and VectorProvider (with pgvector)
- MongoDB → Implements KeyValueProvider

### Phase 7: Testing and Documentation (Week 7)

#### 7.1 Comprehensive Tests
```typescript
// packages/core/src/memory/__tests__/memory-system.test.ts
describe('MemorySystem', () => {
  let memory: Memory;
  
  beforeEach(async () => {
    memory = new MemorySystem({
      providers: {
        kv: new InMemoryProvider(),
        vector: new InMemoryVectorProvider(),
        graph: new InMemoryGraphProvider()
      }
    });
    await memory.initialize();
  });
  
  describe('unified operations', () => {
    it('should remember and recall', async () => {
      await memory.remember({
        type: 'fact',
        content: 'The sky is blue',
        confidence: 0.95
      });
      
      const results = await memory.recall('sky color');
      expect(results).toHaveLength(1);
      expect(results[0].content).toContain('blue');
    });
  });
  
  describe('memory types', () => {
    it('should store and verify facts', async () => {
      const fact = {
        id: 'fact-1',
        statement: 'Water boils at 100°C',
        confidence: 1.0,
        source: 'science'
      };
      
      await memory.facts.store(fact);
      const verification = await memory.facts.verify('fact-1');
      
      expect(verification.verified).toBe(true);
      expect(verification.confidence).toBeGreaterThan(0.9);
    });
  });
});
```

## Final Steps

### 1. Update All Imports
```typescript
// Before
import { MemoryStore, VectorStore } from '@daydreams/core';

// After
import { Memory, KeyValueProvider, VectorProvider } from '@daydreams/core';
```

### 2. Update All Documentation
- Remove all references to old memory system
- Document new Memory API
- Provide migration examples

### 3. Update Examples
```typescript
// examples/basic/src/index.ts
const agent = createDreams({
  model: 'gpt-4',
  memory: {
    providers: {
      kv: new RedisProvider({ url: 'redis://localhost' }),
      vector: new ChromaProvider({ url: 'http://localhost:8000' }),
      graph: new Neo4jProvider({ uri: 'bolt://localhost' })
    },
    middleware: [
      new CacheMiddleware({ ttl: 300 }),
      new EvolutionMiddleware({ interval: 3600000 })
    ],
    options: {
      evolution: { enabled: true },
      learning: { enabled: true },
      compression: { enabled: true, threshold: 1000 }
    }
  }
});
```

## Summary

This clean break approach:

1. **No Legacy Code**: Complete removal of old system
2. **Required Memory**: Memory is no longer optional
3. **Rich by Default**: All memory types included
4. **Type Safe**: Full TypeScript coverage
5. **Clean Architecture**: No compatibility layers

The implementation is simpler without backwards compatibility, allowing us to build the ideal memory system from the ground up.