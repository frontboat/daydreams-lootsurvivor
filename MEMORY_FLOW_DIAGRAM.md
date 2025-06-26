# Memory Flow in Daydreams Framework

## Visual Memory Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AGENT LIFECYCLE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. INITIALIZATION                                                   │
│  ┌────────────┐        ┌─────────────┐        ┌──────────────┐     │
│  │   Agent    │───────▶│   Memory    │───────▶│  Load State  │     │
│  │  Creation  │        │   System    │        │  & Contexts  │     │
│  └────────────┘        └─────────────┘        └──────────────┘     │
│                                                                      │
│  2. INPUT PROCESSING                                                 │
│  ┌────────────┐        ┌─────────────┐        ┌──────────────┐     │
│  │User Input  │───────▶│   Recall    │───────▶│Add to Working│     │
│  │            │        │  Memories   │        │   Memory     │     │
│  └────────────┘        └─────────────┘        └──────────────┘     │
│         │                                              │             │
│         ▼                                              ▼             │
│  ┌────────────┐        ┌─────────────┐        ┌──────────────┐     │
│  │  Similar   │        │   Build     │        │     LLM      │     │
│  │  Episodes  │───────▶│   Prompt    │───────▶│  Processing  │     │
│  └────────────┘        └─────────────┘        └──────────────┘     │
│                                                        │             │
│  3. MEMORY EXTRACTION                                  ▼             │
│  ┌────────────┐        ┌─────────────┐        ┌──────────────┐     │
│  │    LLM     │───────▶│  Extract    │───────▶│  Classify &  │     │
│  │  Response  │        │  Memories   │        │    Store     │     │
│  └────────────┘        └─────────────┘        └──────────────┘     │
│                                                        │             │
│  4. WORKING MEMORY MANAGEMENT                          ▼             │
│  ┌────────────┐        ┌─────────────┐        ┌──────────────┐     │
│  │   Push to  │───────▶│   Check     │───────▶│   Prune if   │     │
│  │   Working  │        │  Pressure   │        │  Necessary   │     │
│  │   Memory   │        └─────────────┘        └──────────────┘     │
│  └────────────┘                                        │             │
│                                                        ▼             │
│  5. PERSISTENCE                                ┌──────────────┐     │
│  ┌────────────┐        ┌─────────────┐        │  Compressed  │     │
│  │   After    │───────▶│Save Context │───────▶│   Episode    │     │
│  │   Step     │        │  & Working  │        │  (if smart)  │     │
│  └────────────┘        │   Memory    │        └──────────────┘     │
│                        └─────────────┘                              │
│                                                                      │
│  6. EVOLUTION (PERIODIC)                                             │
│  ┌────────────┐        ┌─────────────┐        ┌──────────────┐     │
│  │   Timer    │───────▶│Consolidate  │───────▶│   Extract    │     │
│  │  Trigger   │        │   Facts     │        │  Patterns    │     │
│  └────────────┘        └─────────────┘        └──────────────┘     │
│                                                        │             │
│                                                        ▼             │
│                                                ┌──────────────┐     │
│                                                │Update Semantic│     │
│                                                │    Memory    │     │
│                                                └──────────────┘     │
└─────────────────────────────────────────────────────────────────────┘
```

## Memory Types and Their Roles

```
┌─────────────────────────────────────────────────────────────────────┐
│                          MEMORY SYSTEM                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │ WORKING MEMORY  │  │ FACTUAL MEMORY  │  │EPISODIC MEMORY  │    │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤    │
│  │ • Current       │  │ • Verified      │  │ • Past events   │    │
│  │   conversation  │  │   facts         │  │ • Experiences   │    │
│  │ • Recent I/O    │  │ • User info     │  │ • Compressed    │    │
│  │ • Action calls  │  │ • Preferences   │  │   memories      │    │
│  │ • Temporary     │  │ • Persistent    │  │ • Timeline      │    │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘    │
│           │                     │                     │              │
│           └─────────────────────┼─────────────────────┘              │
│                                 ▼                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │
│  │ SEMANTIC MEMORY │  │  GRAPH MEMORY   │  │ VECTOR MEMORY   │    │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤    │
│  │ • Concepts      │  │ • Entities      │  │ • Embeddings    │    │
│  │ • Patterns      │  │ • Relations     │  │ • Similarity    │    │
│  │ • Meta-learning │  │ • Connections   │  │ • Semantic      │    │
│  │ • Insights      │  │ • Networks      │  │   search        │    │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘    │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Memory Operations During Execution

```
┌─────────────────────────────────────────────────────────────────────┐
│                     SINGLE INTERACTION FLOW                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  User: "What's my favorite color?"                                  │
│                                                                      │
│  1. MEMORY RECALL                                                    │
│  ┌─────────────────────────────────────────┐                       │
│  │ memory.recall("favorite color")         │                       │
│  │ ├─ Facts: "User prefers blue"          │                       │
│  │ ├─ Episodes: "User mentioned blue 3x"   │                       │
│  │ └─ Patterns: "Color preferences stable" │                       │
│  └─────────────────────────────────────────┘                       │
│                      │                                               │
│  2. PROMPT ENHANCEMENT                                               │
│  ┌─────────────────▼───────────────────────┐                       │
│  │ System: You have access to memories...   │                       │
│  │ Facts: User prefers blue                 │                       │
│  │ Episodes: Mentioned 3 times previously   │                       │
│  │ Recent: [last 5 interactions]           │                       │
│  │ User: "What's my favorite color?"       │                       │
│  └─────────────────────────────────────────┘                       │
│                      │                                               │
│  3. LLM RESPONSE                                                     │
│  ┌─────────────────▼───────────────────────┐                       │
│  │ "Your favorite color is blue! You've    │                       │
│  │  mentioned it several times."           │                       │
│  └─────────────────────────────────────────┘                       │
│                      │                                               │
│  4. MEMORY EXTRACTION & STORAGE                                      │
│  ┌─────────────────▼───────────────────────┐                       │
│  │ memory.remember({                        │                       │
│  │   type: 'interaction',                   │                       │
│  │   query: 'color preference',             │                       │
│  │   response: 'confirmed blue',            │                       │
│  │   confidence: 0.95                       │                       │
│  │ })                                       │                       │
│  └─────────────────────────────────────────┘                       │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Memory Provider Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MEMORY PROVIDERS                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────┐                      ┌──────────────────┐     │
│  │   Memory API    │                      │   Middleware     │     │
│  │                 │                      │                  │     │
│  │  remember()     │◄────────────────────▶│ • Cache         │     │
│  │  recall()       │                      │ • Encrypt       │     │
│  │  forget()       │                      │ • Compress      │     │
│  └────────┬────────┘                      │ • Evolve        │     │
│           │                               └──────────────────┘     │
│           ▼                                                         │
│  ┌─────────────────────────────────────────────────────────┐      │
│  │                    PROVIDERS                             │      │
│  ├─────────────────┬──────────────────┬───────────────────┤      │
│  │  KeyValue       │   Vector         │   Graph           │      │
│  │  Provider       │   Provider       │   Provider        │      │
│  ├─────────────────┼──────────────────┼───────────────────┤      │
│  │ • Redis         │ • Chroma         │ • Neo4j           │      │
│  │ • PostgreSQL    │ • Pinecone       │ • ArangoDB        │      │
│  │ • DynamoDB      │ • Weaviate       │ • Neptune         │      │
│  │ • In-Memory     │ • Qdrant         │ • In-Memory       │      │
│  └─────────────────┴──────────────────┴───────────────────┘      │
│                                                                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Memory Lifecycle Hooks

```
┌─────────────────────────────────────────────────────────────────────┐
│                      LIFECYCLE INTEGRATION                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Agent Event          Memory Operation          Result              │
│  ─────────────────────────────────────────────────────────────     │
│                                                                      │
│  agent.start()    →   memory.initialize()   →   Load state         │
│                       memory.recover()           contexts           │
│                                                                      │
│  input.pre        →   memory.recall()       →   Relevant           │
│                                                  memories           │
│                                                                      │
│  step.post        →   memory.remember()     →   Store step         │
│                       memory.working.push()      results            │
│                                                                      │
│  action.pre       →   memory.facts.get()    →   Action             │
│                                                  context            │
│                                                                      │
│  action.post      →   memory.episodes.store() → Episode            │
│                                                  created            │
│                                                                      │
│  context.save     →   memory.persist()      →   State              │
│                                                  saved              │
│                                                                      │
│  error            →   memory.remember()     →   Error              │
│                                                  logged             │
│                                                                      │
│  shutdown         →   memory.evolve()       →   Final              │
│                       memory.close()             cleanup            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Key Insights

1. **Memory is Pervasive**: Every major operation involves memory
2. **Automatic Integration**: Memory operations happen without explicit calls
3. **Multiple Layers**: Different memory types serve different purposes
4. **Intelligent Management**: Pruning, compression, and evolution happen automatically
5. **Provider Flexibility**: Storage backends can be mixed and matched
6. **Middleware Power**: Cross-cutting concerns handled consistently

This architecture ensures memory isn't just a storage system, but the foundation that enables agents to learn, adapt, and provide intelligent responses based on past experiences.