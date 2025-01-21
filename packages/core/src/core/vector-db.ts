import { ChromaClient, OpenAIEmbeddingFunction } from "chromadb";
import { env } from "./env";
import { Logger } from "./logger";
import { Room } from "./room";
import { LogLevel, type SearchResult } from "../types";

export interface VectorDB {
  findSimilar(
    content: string,
    limit?: number,
    metadata?: Record<string, any>
  ): Promise<SearchResult[]>;
  store(content: string, metadata?: Record<string, any>): Promise<void>;
  delete(id: string): Promise<void>;
  storeInRoom?(
    content: string,
    roomId: string,
    metadata?: Record<string, any>
  ): Promise<void>;
  findSimilarInRoom?(
    content: string,
    roomId: string,
    limit?: number,
    metadata?: Record<string, any>
  ): Promise<SearchResult[]>;
  storeSystemMetadata(key: string, value: Record<string, any>): Promise<void>;
  getSystemMetadata(key: string): Promise<Record<string, any> | null>;
  storeEpisode(memory: Omit<EpisodicMemory, "id">): Promise<string>;
  findSimilarEpisodes(
    action: string,
    limit?: number
  ): Promise<EpisodicMemory[]>;
  getRecentEpisodes(limit?: number): Promise<EpisodicMemory[]>;
  storeDocument(doc: Omit<Documentation, "id">): Promise<string>;
  findSimilarDocuments(query: string, limit?: number): Promise<Documentation[]>;
  searchDocumentsByTag(
    tags: string[],
    limit?: number
  ): Promise<Documentation[]>;
  updateDocument(id: string, updates: Partial<Documentation>): Promise<void>;
}

interface Cluster {
  id: string;
  name: string;
  description: string;
  centroid?: number[];
  topics: string[];
  documentCount: number;
  lastUpdated: Date;
}

interface ClusterMetadata {
  clusterId: string;
  confidence: number;
  topics: string[];
}

export interface EpisodicMemory {
  id: string;
  timestamp: Date;
  action: string;
  outcome: string;
  context?: Record<string, any>;
  emotions?: string[];
  importance?: number;
}

export interface Documentation {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  lastUpdated: Date;
  source?: string;
  relatedIds?: string[];
}

// Helper function to check if value is valid for Date constructor
function isValidDateValue(value: unknown): value is string | number | Date {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    value instanceof Date
  );
}

export class ChromaVectorDB implements VectorDB {
  private client: ChromaClient;
  private embedder: OpenAIEmbeddingFunction;
  private logger: Logger;
  private collectionName: string;
  static readonly CLUSTER_COLLECTION = "clusters";
  static readonly SYSTEM_COLLECTION = "system_metadata";
  static readonly EPISODIC_COLLECTION = "episodic_memory";
  static readonly DOCUMENTATION_COLLECTION = "documentation";

  constructor(
    collectionName: string = "memories",
    config: {
      chromaUrl?: string;
      logLevel?: LogLevel;
    } = {}
  ) {
    this.collectionName = collectionName;
    this.logger = new Logger({
      level: config.logLevel || LogLevel.INFO,
      enableColors: true,
      enableTimestamp: true,
    });

    this.client = new ChromaClient({
      path: config.chromaUrl || "http://localhost:8000",
    });

    this.embedder = new OpenAIEmbeddingFunction({
      openai_api_key: env.OPENAI_API_KEY,
      openai_model: "text-embedding-3-small",
    });
  }

  public async getCollection() {
    return await this.client.getOrCreateCollection({
      name: this.collectionName,
      embeddingFunction: this.embedder,
      metadata: {
        description: "Memory storage for AI consciousness",
      },
    });
  }

  public async findSimilar(
    content: string,
    limit: number = 5,
    metadata?: Record<string, any>
  ): Promise<SearchResult[]> {
    try {
      this.logger.debug("ChromaVectorDB.findSimilar", "Searching for content", {
        contentLength: content.length,
        limit,
        metadata,
      });

      const collection = await this.getCollection();
      const results = await collection.query({
        queryTexts: [content],
        nResults: limit,
        where: metadata, // Using 'where' instead of 'whereDocument'
      });

      if (!results.ids.length || !results.distances?.length) {
        return [];
      }

      // Format results
      return results.ids[0].map((id: string, index: number) => ({
        id,
        content: results.documents[0][index] || "",
        similarity: 1 - (results.distances?.[0]?.[index] || 0),
        metadata: results.metadatas?.[0]?.[index] || undefined,
      }));
    } catch (error) {
      this.logger.error("ChromaVectorDB.findSimilar", "Search failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  public async store(
    content: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const collection = await this.getCollection();
      // Use deterministic ID for global memories too
      const id = Room.createDeterministicMemoryId("global", content);

      this.logger.debug("ChromaVectorDB.store", "Storing content", {
        id,
        contentLength: content.length,
        metadata,
      });

      await collection.add({
        ids: [id],
        documents: [content],
        metadatas: metadata ? [metadata] : undefined,
      });
    } catch (error) {
      this.logger.error("ChromaVectorDB.store", "Failed to store content", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  public async delete(id: string): Promise<void> {
    try {
      const collection = await this.getCollection();
      this.logger.debug("ChromaVectorDB.delete", "Deleting content", { id });
      await collection.delete({
        ids: [id],
      });
    } catch (error) {
      this.logger.error("ChromaVectorDB.delete", "Failed to delete content", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  // Additional utility methods
  public async count(): Promise<number> {
    const collection = await this.getCollection();
    const results = await collection.count();
    return results;
  }

  public async clear(): Promise<void> {
    const collection = await this.getCollection();
    await collection.delete();
  }

  public async peek(limit: number = 5): Promise<SearchResult[]> {
    const collection = await this.getCollection();
    const results = await collection.peek({ limit });
    return results.ids.map((id: string, index: number) => {
      const content = results.documents[index];
      if (content === null) {
        throw new Error(`Document content is null for id ${id}`);
      }
      return {
        id,
        content,
        similarity: 1,
        metadata: results.metadatas?.[index] ?? undefined,
      };
    });
  }

  public async getCollectionForRoom(roomId: string) {
    const collectionName = `room_${roomId}`;
    return await this.client.getOrCreateCollection({
      name: collectionName,
      embeddingFunction: this.embedder,
      metadata: {
        description: "Room-specific memory storage",
        roomId,
        platform: roomId.split("_")[0],
        platformId: roomId.split("_")[1],
        created: new Date().toISOString(),
        lastActive: new Date().toISOString(),
      },
    });
  }

  private async getClusterCollection() {
    return await this.client.getOrCreateCollection({
      name: ChromaVectorDB.CLUSTER_COLLECTION,
      embeddingFunction: this.embedder,
      metadata: {
        description: "Cluster centroids for hierarchical memory organization",
      },
    });
  }

  private async findOrCreateCluster(
    content: string,
    metadata: Record<string, any>
  ): Promise<ClusterMetadata> {
    const clusterCollection = await this.getClusterCollection();

    // Find most relevant cluster
    const results = await clusterCollection.query({
      queryTexts: [content],
      nResults: 1,
    });

    if (results.distances?.[0]?.[0] && results.distances[0][0] < 0.3) {
      // Use existing cluster if similarity is high
      const topics = ((results.metadatas?.[0]?.[0]?.topics as string) || "")
        .split(",")
        .filter(Boolean);

      return {
        clusterId: results.ids[0][0],
        confidence: 1 - (results.distances[0][0] || 0),
        topics,
      };
    }

    // Create new cluster if no good match
    const clusterId = crypto.randomUUID();
    const topics = Array.isArray(metadata.topics) ? metadata.topics : [];

    await clusterCollection.add({
      ids: [clusterId],
      documents: [content],
      metadatas: [
        {
          topics: topics.join(","),
          documentCount: 1,
          lastUpdated: new Date().toISOString(),
        },
      ],
    });

    return {
      clusterId,
      confidence: 1,
      topics,
    };
  }

  public async storeInRoom(
    content: string,
    roomId: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      const collection = await this.getCollectionForRoom(roomId);
      const id = Room.createDeterministicMemoryId(roomId, content);
      const timestamp = new Date(metadata?.timestamp || Date.now());

      const clusterInfo = await this.findOrCreateCluster(
        content,
        metadata || {}
      );

      await collection.modify({
        metadata: {
          ...collection.metadata,
          lastActive: new Date().toISOString(),
        },
      });

      // Store with cluster information, converting arrays to strings
      await collection.add({
        ids: [id],
        documents: [content],
        metadatas: [
          {
            ...metadata,
            roomId,
            clusterId: clusterInfo.clusterId,
            clusterConfidence: clusterInfo.confidence,
            clusterTopics: clusterInfo.topics.join(","),
            timestamp: timestamp.toISOString(),
          },
        ],
      });

      this.logger.debug("ChromaVectorDB.storeInRoom", "Stored content", {
        roomId,
        contentLength: content.length,
        memoryId: id,
        clusterId: clusterInfo.clusterId,
        clusterConfidence: clusterInfo.confidence,
      });
    } catch (error) {
      this.logger.error("ChromaVectorDB.storeInRoom", "Storage failed", {
        error: error instanceof Error ? error.message : String(error),
        roomId,
      });
      throw error;
    }
  }

  public async findSimilarInRoom(
    content: string,
    roomId: string,
    limit: number = 5,
    metadata?: Record<string, any>
  ): Promise<SearchResult[]> {
    try {
      const collection = await this.getCollectionForRoom(roomId);
      const clusterInfo = await this.findOrCreateCluster(
        content,
        metadata || {}
      );

      const results = await collection.query({
        queryTexts: [content],
        nResults: limit * 2,
        where: {
          ...metadata,
          clusterId: clusterInfo.clusterId,
        },
      });

      if (!results.ids.length || !results.distances?.length) {
        return this.findSimilarInRoomGlobal(content, roomId, limit, metadata);
      }

      // Process and rank results with proper timestamp handling
      const processedResults = results.ids[0].map(
        (id: string, index: number) => {
          const metadata = results.metadatas?.[0]?.[index];
          const timestamp =
            metadata?.timestamp && isValidDateValue(metadata.timestamp)
              ? new Date(metadata.timestamp)
              : new Date();

          return {
            id,
            content: results.documents[0][index] || "",
            similarity: 1 - (results.distances?.[0]?.[index] || 0),
            metadata: {
              ...metadata,
              timestamp: timestamp.toISOString(),
            },
          };
        }
      );

      return processedResults
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);
    } catch (error) {
      this.logger.error("ChromaVectorDB.findSimilarInRoom", "Search failed", {
        error: error instanceof Error ? error.message : String(error),
        roomId,
      });
      return [];
    }
  }

  private async findSimilarInRoomGlobal(
    content: string,
    roomId: string,
    limit: number = 5,
    metadata?: Record<string, any>
  ): Promise<SearchResult[]> {
    const collection = await this.getCollectionForRoom(roomId);
    const results = await collection.query({
      queryTexts: [content],
      nResults: limit,
      where: metadata,
    });

    if (!results.ids.length || !results.distances?.length) {
      return [];
    }

    return results.ids[0].map((id: string, index: number) => {
      const metadata = results.metadatas?.[0]?.[index];
      const timestamp =
        metadata?.timestamp && isValidDateValue(metadata.timestamp)
          ? new Date(metadata.timestamp)
          : new Date();

      return {
        id,
        content: results.documents[0][index] || "",
        similarity: 1 - (results.distances?.[0]?.[index] || 0),
        metadata: {
          ...metadata,
          timestamp: timestamp.toISOString(),
        },
      };
    });
  }

  public async listRooms(): Promise<string[]> {
    const collections = await this.client.listCollections();
    return collections
      .filter((c: any) => c.startsWith("room_"))
      .map((c: any) => c.replace("room_", ""));
  }

  public async getRoomMemoryCount(roomId: string): Promise<number> {
    const collection = await this.getCollectionForRoom(roomId);
    return await collection.count();
  }

  public async deleteRoom(roomId: string): Promise<void> {
    try {
      await this.client.deleteCollection({ name: `room_${roomId}` });
      this.logger.info("ChromaVectorDB.deleteRoom", "Room deleted", { roomId });
    } catch (error) {
      this.logger.error("ChromaVectorDB.deleteRoom", "Deletion failed", {
        error: error instanceof Error ? error.message : String(error),
        roomId,
      });
      throw error;
    }
  }

  private async getSystemCollection() {
    return await this.client.getOrCreateCollection({
      name: ChromaVectorDB.SYSTEM_COLLECTION,
      embeddingFunction: this.embedder,
      metadata: {
        description: "System-wide metadata storage",
      },
    });
  }

  public async storeSystemMetadata(
    key: string,
    value: Record<string, any>
  ): Promise<void> {
    const collection = await this.getSystemCollection();
    const id = `metadata_${key}`;

    await collection.upsert({
      ids: [id],
      documents: [JSON.stringify(value)],
      metadatas: [
        {
          ...value,
          updatedAt: new Date().toISOString(),
          type: "system_metadata",
        },
      ],
    });
  }

  public async getSystemMetadata(
    key: string
  ): Promise<Record<string, any> | null> {
    const collection = await this.getSystemCollection();

    try {
      const result = await collection.get({
        ids: [`metadata_${key}`],
      });

      if (result.metadatas?.[0]) {
        return result.metadatas[0];
      }
    } catch (error) {
      this.logger.error(
        "ChromaVectorDB.getSystemMetadata",
        "Failed to get system metadata",
        {
          key,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }

    return null;
  }

  private async getEpisodicCollection() {
    return await this.client.getOrCreateCollection({
      name: ChromaVectorDB.EPISODIC_COLLECTION,
      embeddingFunction: this.embedder,
      metadata: {
        description: "Storage for agent's episodic memories and experiences",
      },
    });
  }

  private async getDocumentationCollection() {
    return await this.client.getOrCreateCollection({
      name: ChromaVectorDB.DOCUMENTATION_COLLECTION,
      embeddingFunction: this.embedder,
      metadata: {
        description: "Storage for documentation and learned information",
      },
    });
  }

  public async storeEpisode(
    memory: Omit<EpisodicMemory, "id">
  ): Promise<string> {
    const collection = await this.getEpisodicCollection();
    const id = crypto.randomUUID();
    const content = `Action: ${memory.action}\nOutcome: ${memory.outcome}`;

    await collection.add({
      ids: [id],
      documents: [content],
      metadatas: [
        {
          ...memory,
          context: memory.context ? JSON.stringify(memory.context) : "",
          emotions: memory.emotions?.join(",") || "",
          timestamp: memory.timestamp.toISOString(),
          type: "episode",
        },
      ],
    });

    return id;
  }

  public async findSimilarEpisodes(
    action: string,
    limit: number = 5
  ): Promise<EpisodicMemory[]> {
    const collection = await this.getEpisodicCollection();
    const results = await collection.query({
      queryTexts: [action],
      nResults: limit,
      where: { type: "episode" },
    });

    return results.ids[0].map((id: string, index: number) => ({
      id,
      action: String(results.metadatas[0][index]?.action),
      outcome: String(results.metadatas[0][index]?.outcome),
      context: results.metadatas[0][index]?.context
        ? JSON.parse(results.metadatas[0][index].context as string)
        : undefined,
      emotions:
        (results.metadatas[0][index]?.emotions as string)?.split(",") || [],
      timestamp: new Date(String(results.metadatas[0][index]?.timestamp)),
    }));
  }

  public async getRecentEpisodes(
    limit: number = 10
  ): Promise<EpisodicMemory[]> {
    const collection = await this.getEpisodicCollection();
    const results = await collection.peek({ limit });

    return results.ids.map((id: string, index: number) => ({
      id,
      action: String(results.metadatas[index]?.action),
      outcome: String(results.metadatas[index]?.outcome),
      context: results.metadatas[index]?.context
        ? JSON.parse(results.metadatas[index].context as string)
        : undefined,
      emotions:
        (results.metadatas[index]?.emotions as string)?.split(",") || [],
      timestamp: new Date(String(results.metadatas[index]?.timestamp)),
    }));
  }

  public async storeDocument(doc: Omit<Documentation, "id">): Promise<string> {
    const collection = await this.getDocumentationCollection();
    const id = crypto.randomUUID();

    await collection.add({
      ids: [id],
      documents: [doc.content],
      metadatas: [
        {
          title: doc.title,
          category: doc.category,
          tags: doc.tags.join(","),
          lastUpdated: doc.lastUpdated.toISOString(),
          source: doc.source || "",
          relatedIds: doc.relatedIds?.join(",") || "",
          type: "documentation",
        },
      ],
    });

    return id;
  }

  public async findSimilarDocuments(
    query: string,
    limit: number = 5
  ): Promise<Documentation[]> {
    const collection = await this.getDocumentationCollection();
    const results = await collection.query({
      queryTexts: [query],
      nResults: limit,
      where: { type: "documentation" },
    });

    return results.ids[0].map((id: string, index: number) => ({
      id,
      title: String(results.metadatas[0][index]?.title),
      category: String(results.metadatas[0][index]?.category),
      content: results.documents[0][index] || "",
      tags: (results.metadatas[0][index]?.tags as string)?.split(",") || [],
      lastUpdated: new Date(String(results.metadatas[0][index]?.lastUpdated)),
      relatedIds:
        (results.metadatas[0][index]?.relatedIds as string)?.split(",") || [],
    }));
  }

  public async searchDocumentsByTag(
    tags: string[],
    limit: number = 5
  ): Promise<Documentation[]> {
    const collection = await this.getDocumentationCollection();
    const results = await collection.get({
      where: {
        type: "documentation",
        tags: { $eq: tags.join(",") },
      },
      limit,
    });

    return results.ids.map((id: string, index: number) => ({
      id,
      content: results.documents[index] || "",
      title: String(results.metadatas[index]?.title),
      category: String(results.metadatas[index]?.category),
      tags: (results.metadatas[index]?.tags as string)?.split(",") || [],
      lastUpdated: new Date(String(results.metadatas[index]?.lastUpdated)),
      relatedIds:
        (results.metadatas[index]?.relatedIds as string)?.split(",") || [],
    }));
  }

  public async updateDocument(
    id: string,
    updates: Partial<Documentation>
  ): Promise<void> {
    const collection = await this.getDocumentationCollection();
    const existing = await collection.get({ ids: [id] });

    if (!existing.ids.length) {
      throw new Error(`Document with id ${id} not found`);
    }

    const currentMetadata = existing.metadatas[0];
    const updatedMetadata = {
      ...currentMetadata,
      title: updates.title || currentMetadata?.title || "",
      category: updates.category || currentMetadata?.category || "",
      source: updates.source || currentMetadata?.source || "",
      lastUpdated: new Date().toISOString(),
      tags: updates.tags?.join(",") ?? currentMetadata?.tags ?? "",
      relatedIds:
        updates.relatedIds?.join(",") ?? currentMetadata?.relatedIds ?? "",
      type: currentMetadata?.type || "documentation",
    };

    await collection.update({
      ids: [id],
      documents: updates.content ? [updates.content] : undefined,
      metadatas: [updatedMetadata],
    });
  }
}
