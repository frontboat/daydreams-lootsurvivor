# Memory Framework Integration: How Memory Powers Daydreams

## Overview

This document details how the unified Memory API is utilized throughout the Daydreams framework, showing the deep integration between memory operations and agent execution.

## Memory Integration Points

### 1. Agent Initialization

```typescript
// packages/core/src/dreams.ts

export async function createDreams(config: DreamsConfig): Promise<Agent> {
  // Initialize memory system
  const memory = config.memory || new MemorySystem({
    providers: {
      kv: new InMemoryProvider(),
      vector: new NoOpVectorProvider()
    }
  });
  
  await memory.initialize();
  
  const agent = {
    memory,
    // ... other properties
  };
  
  // Load persistent agent state
  const agentState = await memory.facts.get('agent:state');
  if (agentState) {
    agent.contextIds = new Set(agentState.contextIds);
    agent.settings = { ...agent.settings, ...agentState.settings };
  }
  
  // Setup memory lifecycle hooks
  memory.lifecycle.on('context.created', async (context) => {
    await memory.facts.store({
      id: `context:${context.id}:created`,
      type: 'event',
      content: `Context ${context.id} created`,
      timestamp: Date.now(),
      metadata: { contextType: context.type }
    });
  });
  
  return agent;
}
```

### 2. Context Management

```typescript
// packages/core/src/context.ts

export async function getContext(
  agent: Agent,
  type: string,
  key?: string,
  options?: ContextOptions
): Promise<ContextState> {
  const id = createContextId(type, key);
  
  // Check if context exists in memory
  let contextState = await agent.memory.working.getContext(id);
  
  if (!contextState) {
    // Create new context
    const contextDef = agent.registry.contexts.get(type);
    
    // Load or create context memory
    const contextMemory = contextDef.load
      ? await contextDef.load(id, { options, settings })
      : await agent.memory.facts.get(`context:${id}:memory`);
    
    // Initialize working memory
    const workingMemory = await agent.memory.working.create(id);
    
    contextState = {
      id,
      type,
      memory: contextMemory || await contextDef.create?.({ key, args, id }),
      workingMemory,
      settings: options?.settings || {}
    };
    
    // Store in memory
    await agent.memory.working.setContext(id, contextState);
    await agent.memory.facts.store({
      id: `context:${id}:state`,
      type: 'context',
      content: contextState,
      metadata: { type, key }
    });
    
    // Run setup hook
    await contextDef.setup?.(contextState, agent);
  }
  
  return contextState;
}
```

### 3. Input Processing with Memory Recall

```typescript
// packages/core/src/engine.ts

export class Engine {
  async process(input: InputRef, context: ContextState): Promise<void> {
    // 1. Recall relevant memories before processing
    const relevantMemories = await this.agent.memory.recall(input.content, {
      context: context.id,
      types: ['fact', 'episode', 'preference'],
      limit: 10,
      minRelevance: 0.7
    });
    
    // 2. Add to working memory for prompt context
    context.workingMemory.relevantMemories = relevantMemories;
    
    // 3. Check for similar past interactions
    const similarEpisodes = await this.agent.memory.episodes.findSimilar(
      context.id,
      input.content,
      { limit: 5 }
    );
    
    // 4. Update prompt with memory context
    const prompt = this.buildPromptWithMemory(
      input,
      relevantMemories,
      similarEpisodes,
      context
    );
    
    // 5. Process with LLM
    const response = await this.llm.generate(prompt);
    
    // 6. Extract and store new memories from response
    await this.extractAndStoreMemories(response, context);
  }
  
  private async extractAndStoreMemories(
    response: LLMResponse,
    context: ContextState
  ): Promise<void> {
    // Extract different types of information
    const extracted = await this.agent.memory.extract(response.content, {
      context: context.id,
      types: ['fact', 'preference', 'entity', 'event']
    });
    
    // Store extracted memories
    await this.agent.memory.remember(extracted, {
      source: 'llm_response',
      confidence: 0.8,
      context: context.id
    });
  }
}
```

### 4. Working Memory Management

```typescript
// packages/core/src/working-memory.ts

export class WorkingMemoryManager {
  constructor(
    private memory: Memory,
    private options: WorkingMemoryOptions
  ) {}
  
  async push(
    contextId: string,
    entry: AnyRef,
    memoryManager?: MemoryManager
  ): Promise<void> {
    const workingMemory = await this.memory.working.get(contextId);
    
    // Check memory pressure
    if (memoryManager?.shouldPrune) {
      const shouldPrune = await memoryManager.shouldPrune(
        workingMemory,
        entry,
        this.memory
      );
      
      if (shouldPrune) {
        await this.handleMemoryPressure(contextId, workingMemory, memoryManager);
      }
    }
    
    // Add entry to appropriate array
    this.addToWorkingMemory(workingMemory, entry);
    
    // Save updated working memory
    await this.memory.working.set(contextId, workingMemory);
    
    // Emit event for middleware
    await this.memory.lifecycle.emit('workingMemory.updated', {
      contextId,
      entry,
      size: this.calculateSize(workingMemory)
    });
  }
  
  private async handleMemoryPressure(
    contextId: string,
    workingMemory: WorkingMemory,
    manager: MemoryManager
  ): Promise<void> {
    if (manager.strategy === 'smart' && manager.compress) {
      // Use AI to create summary of removed entries
      const entriesToCompress = this.selectEntriesToCompress(workingMemory);
      const summary = await manager.compress(entriesToCompress, this.memory);
      
      // Store compressed memory as episodic memory
      await this.memory.episodes.store({
        id: `compression:${contextId}:${Date.now()}`,
        type: 'compression',
        content: summary,
        metadata: {
          originalCount: entriesToCompress.length,
          compressionRatio: this.calculateCompressionRatio(entriesToCompress, summary)
        }
      });
    }
    
    // Apply pruning strategy
    const pruned = await manager.onMemoryPressure(workingMemory, this.memory);
    Object.assign(workingMemory, pruned);
  }
}
```

### 5. Action Execution with Memory

```typescript
// packages/core/src/handlers.ts

export async function executeAction(
  call: ActionCall,
  context: ContextState,
  agent: Agent
): Promise<ActionResult> {
  const action = agent.registry.actions.get(call.name);
  
  // Create action context with memory access
  const actionContext: ActionCallContext = {
    agent,
    context,
    call,
    memory: {
      // Direct memory access
      get: (key: string) => agent.memory.kv.get(`action:${action.name}:${key}`),
      set: (key: string, value: any) => agent.memory.kv.set(`action:${action.name}:${key}`, value),
      
      // Semantic memory access
      recall: (query: string) => agent.memory.recall(query, {
        context: context.id,
        namespace: `action:${action.name}`
      }),
      
      // Facts relevant to this action
      facts: () => agent.memory.facts.getByTag('action', action.name)
    }
  };
  
  // Load action-specific memory if defined
  if (action.memory) {
    actionContext.actionMemory = await agent.memory.kv.get(action.memory.key) 
      || await action.memory.create();
  }
  
  // Execute action
  const result = await action.handler(actionContext);
  
  // Save action memory
  if (actionContext.actionMemory && action.memory) {
    await agent.memory.kv.set(action.memory.key, actionContext.actionMemory);
  }
  
  // Create episodic memory from action execution
  if (agent.config.memory?.generateEpisodes) {
    await agent.memory.episodes.store({
      id: `action:${call.id}`,
      type: 'action_execution',
      content: {
        action: call.name,
        input: call.input,
        result: result.data,
        success: !result.error
      },
      metadata: {
        contextId: context.id,
        duration: result.duration,
        timestamp: Date.now()
      }
    });
  }
  
  return result;
}
```

### 6. Semantic Learning and Evolution

```typescript
// packages/core/src/memory-evolution.ts

export class MemoryEvolutionService {
  constructor(private memory: Memory, private agent: Agent) {
    // Run evolution periodically
    setInterval(() => this.evolve(), this.agent.config.memory?.evolutionInterval || 3600000);
  }
  
  async evolve(): Promise<void> {
    // Get all contexts that have been active
    const activeContexts = await this.memory.facts.query({
      type: 'context',
      filter: { lastActive: { $gt: Date.now() - 86400000 } } // Last 24 hours
    });
    
    for (const contextData of activeContexts) {
      await this.evolveContext(contextData.content);
    }
    
    // Global evolution across all contexts
    await this.globalEvolution();
  }
  
  private async evolveContext(context: ContextState): Promise<void> {
    // 1. Consolidate similar facts
    const facts = await this.memory.facts.getByContext(context.id);
    const consolidated = await this.consolidateFacts(facts);
    
    // 2. Extract patterns from episodes
    const episodes = await this.memory.episodes.getByContext(context.id);
    const patterns = await this.extractPatterns(episodes);
    
    // 3. Update semantic memory with learned concepts
    for (const pattern of patterns) {
      await this.memory.semantic.store({
        id: `pattern:${pattern.id}`,
        type: 'learned_pattern',
        content: pattern.description,
        confidence: pattern.confidence,
        examples: pattern.examples,
        metadata: {
          contextId: context.id,
          discoveredAt: Date.now()
        }
      });
    }
    
    // 4. Update user/context profile
    await this.updateProfile(context.id, {
      facts: consolidated,
      patterns,
      lastEvolved: Date.now()
    });
  }
  
  private async globalEvolution(): Promise<void> {
    // Cross-context learning
    const allPatterns = await this.memory.semantic.query({ type: 'learned_pattern' });
    
    // Find meta-patterns across contexts
    const metaPatterns = await this.findMetaPatterns(allPatterns);
    
    // Store global insights
    for (const metaPattern of metaPatterns) {
      await this.memory.semantic.store({
        id: `meta:${metaPattern.id}`,
        type: 'meta_pattern',
        content: metaPattern.insight,
        contexts: metaPattern.contexts,
        confidence: metaPattern.confidence
      });
    }
  }
}
```

### 7. Memory-Aware Prompt Generation

```typescript
// packages/core/src/prompt-builder.ts

export class MemoryAwarePromptBuilder {
  constructor(private memory: Memory) {}
  
  async buildPrompt(
    input: InputRef,
    context: ContextState,
    options: PromptOptions
  ): Promise<string> {
    // 1. Get relevant memories
    const memories = await this.memory.recall(input.content, {
      context: context.id,
      types: ['fact', 'preference', 'episode'],
      limit: 20
    });
    
    // 2. Get recent working memory
    const recentMemory = this.summarizeWorkingMemory(context.workingMemory, 10);
    
    // 3. Get learned patterns
    const patterns = await this.memory.semantic.getRelevantPatterns(input.content);
    
    // 4. Build memory context section
    const memoryContext = this.formatMemoryContext({
      facts: memories.filter(m => m.type === 'fact'),
      preferences: memories.filter(m => m.type === 'preference'),
      episodes: memories.filter(m => m.type === 'episode'),
      patterns,
      recent: recentMemory
    });
    
    // 5. Construct full prompt
    return `
${options.systemPrompt}

## Memory Context
${memoryContext}

## Current Conversation
${this.formatConversation(context.workingMemory)}

## User Input
${input.content}

Remember to consider the memory context when responding.
`;
  }
  
  private formatMemoryContext(memories: MemoryGroups): string {
    let context = '';
    
    if (memories.facts.length > 0) {
      context += '### Known Facts\n';
      context += memories.facts.map(f => `- ${f.content}`).join('\n');
      context += '\n\n';
    }
    
    if (memories.preferences.length > 0) {
      context += '### User Preferences\n';
      context += memories.preferences.map(p => `- ${p.content}`).join('\n');
      context += '\n\n';
    }
    
    if (memories.episodes.length > 0) {
      context += '### Relevant Past Experiences\n';
      context += memories.episodes.map(e => `- ${e.summary}`).join('\n');
      context += '\n\n';
    }
    
    if (memories.patterns.length > 0) {
      context += '### Learned Patterns\n';
      context += memories.patterns.map(p => `- ${p.description}`).join('\n');
      context += '\n\n';
    }
    
    return context;
  }
}
```

### 8. Memory Persistence and Recovery

```typescript
// packages/core/src/agent-lifecycle.ts

export class AgentLifecycle {
  constructor(private agent: Agent) {}
  
  async shutdown(): Promise<void> {
    // Save agent state
    await this.agent.memory.facts.store({
      id: 'agent:state',
      type: 'system',
      content: {
        contextIds: Array.from(this.agent.contextIds),
        settings: this.agent.settings,
        stats: await this.gatherStats()
      }
    });
    
    // Save all active contexts
    for (const [contextId, context] of this.agent.contexts) {
      await this.saveContext(context);
    }
    
    // Trigger final memory evolution
    await this.agent.memory.evolve();
    
    // Close memory providers
    await this.agent.memory.close();
  }
  
  async recover(): Promise<void> {
    // Load agent state
    const agentState = await this.agent.memory.facts.get('agent:state');
    if (!agentState) return;
    
    // Restore contexts
    for (const contextId of agentState.content.contextIds) {
      const contextData = await this.agent.memory.facts.get(`context:${contextId}:state`);
      if (contextData) {
        const context = await this.restoreContext(contextData.content);
        this.agent.contexts.set(contextId, context);
      }
    }
    
    // Restore settings
    Object.assign(this.agent.settings, agentState.content.settings);
    
    console.log(`Recovered ${agentState.content.contextIds.length} contexts`);
  }
}
```

## Memory Utilization Summary

### Automatic Operations

1. **Input Processing**: Relevant memories automatically recalled
2. **Response Generation**: Memory context included in prompts
3. **Learning**: New facts, preferences, and patterns extracted
4. **Evolution**: Memories consolidated and patterns discovered
5. **Persistence**: State saved continuously

### Manual Operations

1. **Direct Storage**: `agent.memory.remember()`
2. **Direct Recall**: `agent.memory.recall()`
3. **Fact Verification**: `agent.memory.facts.verify()`
4. **Episode Timeline**: `agent.memory.episodes.getTimeline()`
5. **Graph Traversal**: `agent.memory.graph.findConnections()`

### Middleware Integration

Memory middleware can intercept and enhance all operations:

```typescript
class UserProfileMiddleware implements MemoryMiddleware {
  async afterRemember(ctx: MemoryContext): Promise<void> {
    // Update user profile based on new memories
    if (ctx.content.type === 'preference') {
      await this.updateUserProfile(ctx.userId, ctx.content);
    }
  }
  
  async beforeRecall(ctx: MemoryContext): Promise<void> {
    // Personalize recall based on user profile
    const profile = await this.getUserProfile(ctx.userId);
    ctx.options.boost = profile.interests;
  }
}
```

This deep integration ensures that memory isn't just storage, but an active participant in making agents more intelligent, context-aware, and capable of true learning.