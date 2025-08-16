import type { LanguageModel } from "ai";
import type { Memory } from "../types";
import { KnowledgeExtractor } from "../knowledge-extractor";
import type { KnowledgeSchema } from "../knowledge-schema";

export interface KnowledgeServiceConfig {
  enabled: boolean;
  model?: LanguageModel;
  schema?: KnowledgeSchema;
  extraction?: {
    maxTokens?: number;
    temperature?: number;
    minConfidence?: number;
    usePatternFallback?: boolean;
  };
}

/**
 * Knowledge Service - handles entity and relationship extraction
 * 
 * This service is responsible for:
 * - LLM-powered entity and relationship extraction from text
 * - Schema-based knowledge graph construction
 * - Integration with memory storage
 */
export class KnowledgeService {
  private extractor?: KnowledgeExtractor;

  constructor(
    private memory: Memory,
    private config: KnowledgeServiceConfig,
    private logger?: any
  ) {
    if (config.enabled && config.model && config.schema) {
      this.extractor = new KnowledgeExtractor(
        config.model,
        config.extraction
      );
    }
  }

  /**
   * Extract entities and relationships from text content
   */
  async extractKnowledge(
    content: string,
    contextId?: string,
    userId?: string
  ): Promise<{
    entities: any[];
    relationships: any[];
    confidence: number;
  }> {
    if (!this.extractor || !this.config.schema) {
      return { entities: [], relationships: [], confidence: 0 };
    }

    try {
      const result = await this.extractor.extract(
        content,
        this.config.schema,
        contextId
      );

      const minConfidence = this.config.extraction?.minConfidence || 0.5;
      
      // Filter and format entities
      const entities = result.entities
        .filter(e => e.confidence >= minConfidence)
        .map(e => ({
          ...e.entity,
          id: `${e.entity.type.toLowerCase()}:${Date.now()}-${Math.random().toString(36).slice(2)}`,
        }));

      // Filter and format relationships
      const relationships = result.relationships
        .filter(r => r.confidence >= minConfidence)
        .map(r => {
          const fromEntity = entities.find(e => e.name === r.relationship.from);
          const toEntity = entities.find(e => e.name === r.relationship.to);
          
          if (fromEntity && toEntity) {
            return {
              ...r.relationship,
              id: `${r.relationship.type.toLowerCase()}:${Date.now()}-${Math.random().toString(36).slice(2)}`,
              from: fromEntity.id,
              to: toEntity.id,
              semantics: {
                ...r.relationship.semantics,
                confidence: r.confidence,
                inferred: r.extractionMethod !== 'manual',
              },
            };
          }
          return null;
        })
        .filter(r => r !== null);

      if (this.logger) {
        this.logger.debug("knowledge:extract", "Knowledge extraction completed", {
          entities: entities.length,
          relationships: relationships.length,
          confidence: result.overallConfidence,
        });
      }

      return {
        entities,
        relationships,
        confidence: result.overallConfidence,
      };
    } catch (error) {
      if (this.logger) {
        this.logger.warn("knowledge:extract", "Knowledge extraction failed", {
          error: error instanceof Error ? error.message : error,
        });
      }
      return { entities: [], relationships: [], confidence: 0 };
    }
  }

  /**
   * Process and store extracted knowledge
   */
  async processAndStore(
    content: string,
    options?: {
      contextId?: string;
      userId?: string;
      scope?: "context" | "user" | "global";
    }
  ): Promise<void> {
    const { entities, relationships } = await this.extractKnowledge(
      content,
      options?.contextId,
      options?.userId
    );

    if (entities.length > 0 || relationships.length > 0) {
      await this.memory.remember(
        { entities, relationships },
        {
          scope: options?.scope || "global", // Knowledge is usually global
          contextId: options?.contextId,
          userId: options?.userId,
          type: "knowledge",
          metadata: {
            extractedAt: Date.now(),
            sourceContent: content.slice(0, 200), // First 200 chars for reference
          },
        }
      );
    }
  }

  /**
   * Check if knowledge service is enabled and configured
   */
  isEnabled(): boolean {
    return this.config.enabled && !!this.extractor && !!this.config.schema;
  }
}