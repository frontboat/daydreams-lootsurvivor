# Vector Storage in the New Persistence Strategy

## Overview

Vector storage serves a distinct purpose in Daydreams - enabling semantic similarity search for episodic memory and learning from past experiences. It should remain separate from regular key-value storage while being easily integrated when needed.

## Design Decisions

### 1. Separate but Complementary

Vector storage and regular storage serve different purposes:
- **StorageAdapter**: Structured data, exact lookups, transactions
- **VectorAdapter**: Unstructured data, similarity search, embeddings

### 2. Proposed Architecture

```typescript
// Core storage for structured data
interface StorageAdapter<T = any> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T): Promise<void>;
  delete(key: string): Promise<boolean>;
  query(filter: QueryFilter): Promise<T[]>;
  transaction<R>(fn: (tx: Transaction) => Promise<R>): Promise<R>;
}

// Vector storage for semantic search
interface VectorAdapter {
  // Core operations
  upsert(namespace: string, documents: VectorDocument[]): Promise<void>;
  search(namespace: string, query: VectorQuery): Promise<VectorResult[]>;
  delete(namespace: string, ids: string[]): Promise<void>;
  
  // Management
  createNamespace?(name: string, config?: NamespaceConfig): Promise<void>;
  deleteNamespace?(name: string): Promise<void>;
  
  // Capabilities
  readonly capabilities: VectorCapabilities;
}

interface VectorDocument {
  id: string;
  content: string;
  embedding?: number[];
  metadata?: Record<string, any>;
}

interface VectorQuery {
  query: string;
  embedding?: number[];
  topK?: number;
  filter?: Record<string, any>;
  includeMetadata?: boolean;
  includeContent?: boolean;
}

interface VectorResult {
  id: string;
  score: number;
  content?: string;
  metadata?: Record<string, any>;
}

interface VectorCapabilities {
  maxDimensions: number;
  supportsMetadataFiltering: boolean;
  supportsHybridSearch: boolean;
  requiresEmbedding: boolean;
}
```

### 3. Unified Memory Interface

```typescript
// Combines both storage types for agent use
interface Memory {
  storage: StorageAdapter;
  vectors?: VectorAdapter;
  embedder?: EmbeddingProvider;
}

interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  dimensions: number;
}

// Agent configuration
interface DreamsConfig {
  memory: {
    storage: StorageAdapter;
    vectors?: VectorAdapter;
    embedder?: EmbeddingProvider;
  };
}
```

### 4. Episodic Memory Integration

```typescript
// High-level episodic memory operations
class EpisodicMemoryManager {
  constructor(
    private storage: StorageAdapter,
    private vectors: VectorAdapter,
    private embedder: EmbeddingProvider
  ) {}
  
  async saveEpisode(contextId: string, episode: Episode): Promise<void> {
    // Save structured data
    await this.storage.set(`episode:${contextId}:${episode.id}`, episode);
    
    // Generate embedding if not provided
    const embedding = episode.embedding || 
      await this.embedder.embed(episode.content);
    
    // Save to vector store
    await this.vectors.upsert(contextId, [{
      id: episode.id,
      content: episode.content,
      embedding,
      metadata: {
        timestamp: episode.timestamp,
        type: episode.type,
        outcome: episode.outcome
      }
    }]);
  }
  
  async findSimilar(
    contextId: string, 
    query: string, 
    limit: number = 5
  ): Promise<Episode[]> {
    // Search vectors
    const results = await this.vectors.search(contextId, {
      query,
      topK: limit,
      includeMetadata: true
    });
    
    // Retrieve full episodes
    const episodes = await Promise.all(
      results.map(r => 
        this.storage.get<Episode>(`episode:${contextId}:${r.id}`)
      )
    );
    
    return episodes.filter(e => e !== null);
  }
}
```

### 5. Implementation Examples

#### ChromaDB Adapter
```typescript
class ChromaVectorAdapter implements VectorAdapter {
  private client: ChromaClient;
  
  async upsert(namespace: string, documents: VectorDocument[]): Promise<void> {
    const collection = await this.client.getOrCreateCollection({
      name: namespace,
      embeddingFunction: this.embeddingFunction
    });
    
    await collection.add({
      ids: documents.map(d => d.id),
      documents: documents.map(d => d.content),
      embeddings: documents.map(d => d.embedding).filter(e => e),
      metadatas: documents.map(d => d.metadata || {})
    });
  }
  
  async search(namespace: string, query: VectorQuery): Promise<VectorResult[]> {
    const collection = await this.client.getCollection({ name: namespace });
    
    const results = await collection.query({
      queryTexts: [query.query],
      nResults: query.topK || 10,
      where: query.filter
    });
    
    return results.ids[0].map((id, i) => ({
      id,
      score: results.distances?.[0][i] || 0,
      content: results.documents?.[0][i],
      metadata: results.metadatas?.[0][i]
    }));
  }
  
  get capabilities(): VectorCapabilities {
    return {
      maxDimensions: 1536,
      supportsMetadataFiltering: true,
      supportsHybridSearch: false,
      requiresEmbedding: false
    };
  }
}
```

#### Supabase Adapter (with pgvector)
```typescript
class SupabaseVectorAdapter implements VectorAdapter {
  constructor(
    private supabase: SupabaseClient,
    private tableName: string = 'vector_store'
  ) {}
  
  async upsert(namespace: string, documents: VectorDocument[]): Promise<void> {
    const rows = documents.map(doc => ({
      id: doc.id,
      namespace,
      content: doc.content,
      embedding: doc.embedding,
      metadata: doc.metadata || {}
    }));
    
    await this.supabase
      .from(this.tableName)
      .upsert(rows);
  }
  
  async search(namespace: string, query: VectorQuery): Promise<VectorResult[]> {
    // Generate embedding for query if not provided
    const queryEmbedding = query.embedding || 
      await this.embedder.embed(query.query);
    
    let queryBuilder = this.supabase
      .rpc('match_vectors', {
        query_embedding: queryEmbedding,
        match_threshold: 0.7,
        match_count: query.topK || 10,
        namespace_filter: namespace
      });
    
    // Apply metadata filters
    if (query.filter) {
      Object.entries(query.filter).forEach(([key, value]) => {
        queryBuilder = queryBuilder.filter(`metadata->${key}`, 'eq', value);
      });
    }
    
    const { data, error } = await queryBuilder;
    
    if (error) throw error;
    
    return data.map(row => ({
      id: row.id,
      score: row.similarity,
      content: query.includeContent ? row.content : undefined,
      metadata: query.includeMetadata ? row.metadata : undefined
    }));
  }
  
  get capabilities(): VectorCapabilities {
    return {
      maxDimensions: 2000,
      supportsMetadataFiltering: true,
      supportsHybridSearch: true,
      requiresEmbedding: true
    };
  }
}
```

### 6. Usage in Agents

```typescript
// Create agent with both storage types
const agent = createDreams({
  memory: {
    storage: new PostgreSQLAdapter(config),
    vectors: new ChromaVectorAdapter(chromaConfig),
    embedder: new OpenAIEmbedder({ model: 'text-embedding-ada-002' })
  }
});

// Agent automatically uses vectors for episodic memory if available
// Works without vectors - just no similarity search
```

### 7. Benefits of This Approach

1. **Separation of Concerns**: Vector and structured storage remain independent
2. **Optional Enhancement**: Agents work without vector storage
3. **Flexibility**: Easy to swap vector stores or embedding providers
4. **Type Safety**: Clear interfaces for both storage types
5. **Performance**: Can optimize each storage type independently
6. **Scalability**: Vector operations don't impact regular storage

### 8. Migration Considerations

Since we're not supporting backwards compatibility:
1. Remove VectorStore interface
2. Replace with VectorAdapter
3. Update all vector store implementations
4. Update agent initialization to use new structure
5. Provide clear migration examples in docs

This design maintains the benefits of vector storage while fitting cleanly into the new persistence architecture.