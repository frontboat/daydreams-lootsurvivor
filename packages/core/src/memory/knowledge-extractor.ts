import type { LanguageModel } from "ai";
import { generateObject } from "ai";
import { z } from "zod";
import type {
  KnowledgeSchema,
  ExtractedEntity,
  ExtractedRelationship,
  ExtractionResult,
} from "./knowledge-schema";

/**
 * Configuration for knowledge extraction
 */
export interface ExtractionConfig {
  /** Maximum tokens for LLM calls */
  maxTokens?: number;
  /** Temperature for LLM generation */
  temperature?: number;
  /** Minimum confidence threshold */
  minConfidence?: number;
  /** Whether to use pattern matching as fallback */
  usePatternFallback?: boolean;
  /** Context window for extraction */
  contextWindow?: number;
}

/**
 * Knowledge extractor that combines LLM and pattern-based extraction
 */
export class KnowledgeExtractor {
  constructor(
    private model?: LanguageModel,
    private config: ExtractionConfig = {}
  ) {}

  /**
   * Extract entities and relationships from text using the provided schema
   */
  async extract(
    text: string,
    schema: KnowledgeSchema,
    contextId?: string
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    // Combine LLM and pattern-based extraction
    const [llmResults, patternResults] = await Promise.all([
      this.model
        ? this.extractWithLLM(text, schema)
        : { entities: [], relationships: [] },
      this.extractWithPatterns(text, schema),
    ]);

    // Merge and deduplicate results
    const mergedEntities = this.mergeEntities([
      ...llmResults.entities,
      ...patternResults.entities,
    ]);

    const mergedRelationships = this.mergeRelationships([
      ...llmResults.relationships,
      ...patternResults.relationships,
    ]);

    // Add contextId to entities
    const entitiesWithContext = mergedEntities.map((extracted) => ({
      ...extracted,
      entity: {
        ...extracted.entity,
        contextIds: contextId ? [contextId] : [],
      },
    }));

    // Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(
      entitiesWithContext,
      mergedRelationships
    );

    const processingTime = Date.now() - startTime;

    return {
      entities: entitiesWithContext,
      relationships: mergedRelationships,
      overallConfidence,
      metadata: {
        processingTime,
        schemaName: schema.name,
        sourceText: text,
        model: this.model
          ? `${(this.model as any).provider}:${(this.model as any).modelId}`
          : undefined,
      },
    };
  }

  /**
   * Extract using LLM with structured prompting
   */
  private async extractWithLLM(
    text: string,
    schema: KnowledgeSchema
  ): Promise<{
    entities: ExtractedEntity[];
    relationships: ExtractedRelationship[];
  }> {
    if (!this.model) {
      return { entities: [], relationships: [] };
    }

    try {
      // Define Zod schema for extraction
      const extractionSchema = z.object({
        entities: z.array(
          z.object({
            type: z.string(),
            name: z.string(),
            properties: z.record(z.string(), z.unknown()).optional(),
            confidence: z.number().min(0).max(1),
          })
        ),
        relationships: z.array(
          z.object({
            type: z.string(),
            fromEntity: z.string(),
            toEntity: z.string(),
            confidence: z.number().min(0).max(1),
          })
        ),
      });

      const prompt = this.buildExtractionPrompt(text, schema);

      const result = await generateObject({
        model: this.model,
        schema: extractionSchema,
        prompt,
        temperature: this.config.temperature || 0.1,
      });

      return this.parseLLMResponse(result.object, schema);
    } catch (error) {
      console.warn("LLM extraction failed:", error);
      return { entities: [], relationships: [] };
    }
  }

  /**
   * Extract using pattern matching as fallback
   */
  private async extractWithPatterns(
    text: string,
    schema: KnowledgeSchema
  ): Promise<{
    entities: ExtractedEntity[];
    relationships: ExtractedRelationship[];
  }> {
    const entities: ExtractedEntity[] = [];
    const relationships: ExtractedRelationship[] = [];

    // Extract entities using patterns
    for (const [entityType, definition] of Object.entries(schema.entityTypes)) {
      if (definition.extraction?.patterns) {
        for (const pattern of definition.extraction.patterns) {
          const matches = this.findMatches(text, pattern);
          for (const match of matches) {
            entities.push({
              entity: {
                type: entityType,
                name: match.text,
                properties: {},
                contextIds: [],
              },
              confidence: 0.7, // Pattern-based has medium confidence
              textSpan: match.span,
              extractionMethod: "pattern",
            });
          }
        }
      }
    }

    // Extract relationships using patterns
    for (const [relType, definition] of Object.entries(
      schema.relationshipTypes
    )) {
      if (definition.extraction?.patterns) {
        for (const pattern of definition.extraction.patterns) {
          const matches = this.findRelationshipMatches(text, pattern);
          for (const match of matches) {
            relationships.push({
              relationship: {
                from: match.fromEntityId,
                to: match.toEntityId,
                type: relType,
                semantics: definition.semantics,
              },
              confidence: 0.6,
              textSpan: match.span,
              extractionMethod: "pattern",
            });
          }
        }
      }
    }

    return { entities, relationships };
  }

  /**
   * Build LLM prompt for extraction
   * TODO: allow injection of custom prompt
   */
  private buildExtractionPrompt(text: string, schema: KnowledgeSchema): string {
    const entityTypes = Object.keys(schema.entityTypes).join(", ");
    const relationshipTypes = Object.keys(schema.relationshipTypes).join(", ");

    return `You are an expert at extracting structured information from text. 

Given the following text, extract entities and relationships according to the provided schema.

SCHEMA:
Entity Types: ${entityTypes}
Relationship Types: ${relationshipTypes}

ENTITY DEFINITIONS:
${Object.entries(schema.entityTypes)
  .map(([name, def]) => `${name}: ${def.description || "No description"}`)
  .join("\n")}

RELATIONSHIP DEFINITIONS:
${Object.entries(schema.relationshipTypes)
  .map(
    ([name, def]) =>
      `${name}: ${
        def.description || "No description"
      } (connects to: ${def.targetEntityTypes.join(", ")})`
  )
  .join("\n")}

TEXT TO ANALYZE:
"${text}"

Please extract entities and relationships in the following JSON format:
{
  "entities": [
    {
      "type": "EntityType",
      "name": "extracted name",
      "properties": {},
      "confidence": 0.9
    }
  ],
  "relationships": [
    {
      "type": "RelationshipType", 
      "fromEntity": "entity name 1",
      "toEntity": "entity name 2",
      "confidence": 0.8
    }
  ]
}

Only extract entities and relationships that you are confident about. Provide confidence scores between 0 and 1.`;
  }

  /**
   * Parse LLM response into structured format
   */
  private parseLLMResponse(
    response: any,
    schema: KnowledgeSchema
  ): { entities: ExtractedEntity[]; relationships: ExtractedRelationship[] } {
    const entities: ExtractedEntity[] = [];
    const relationships: ExtractedRelationship[] = [];

    if (response.entities) {
      for (const entityData of response.entities) {
        if (schema.entityTypes[entityData.type]) {
          entities.push({
            entity: {
              type: entityData.type,
              name: entityData.name,
              properties: entityData.properties || {},
              contextIds: [],
            },
            confidence: entityData.confidence || 0.8,
            extractionMethod: "llm",
          });
        }
      }
    }

    if (response.relationships) {
      for (const relData of response.relationships) {
        if (schema.relationshipTypes[relData.type]) {
          const fromEntity = entities.find(
            (e) => e.entity.name === relData.fromEntity
          );
          const toEntity = entities.find(
            (e) => e.entity.name === relData.toEntity
          );

          if (fromEntity && toEntity) {
            relationships.push({
              relationship: {
                from: fromEntity.entity.name,
                to: toEntity.entity.name,
                type: relData.type,
                semantics: schema.relationshipTypes[relData.type].semantics,
              },
              confidence: relData.confidence || 0.7,
              extractionMethod: "llm",
            });
          }
        }
      }
    }

    return { entities, relationships };
  }

  /**
   * Find text matches for patterns
   */
  private findMatches(
    text: string,
    pattern: RegExp
  ): Array<{
    text: string;
    span: { start: number; end: number; text: string };
  }> {
    const matches: Array<{
      text: string;
      span: { start: number; end: number; text: string };
    }> = [];

    let match;
    const globalPattern = new RegExp(
      pattern.source,
      pattern.flags.includes("g") ? pattern.flags : pattern.flags + "g"
    );

    while ((match = globalPattern.exec(text)) !== null) {
      matches.push({
        text: match[1] || match[0],
        span: {
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
        },
      });
    }

    return matches;
  }

  /**
   * Find relationship matches (placeholder - needs more sophisticated implementation)
   */
  private findRelationshipMatches(
    _text: string,
    _pattern: RegExp
  ): Array<{
    fromEntityId: string;
    toEntityId: string;
    span: { start: number; end: number; text: string };
  }> {
    // This is a simplified implementation
    // In practice, you'd need to match entities first, then relationships
    return [];
  }

  /**
   * Merge duplicate entities
   */
  private mergeEntities(entities: ExtractedEntity[]): ExtractedEntity[] {
    const merged: ExtractedEntity[] = [];
    const seen = new Set<string>();

    for (const entity of entities) {
      const key = `${entity.entity.type}:${entity.entity.name.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(entity);
      } else {
        // Update confidence if higher
        const existing = merged.find(
          (e) =>
            e.entity.type === entity.entity.type &&
            e.entity.name.toLowerCase() === entity.entity.name.toLowerCase()
        );
        if (existing && entity.confidence > existing.confidence) {
          existing.confidence = entity.confidence;
        }
      }
    }

    return merged;
  }

  /**
   * Merge duplicate relationships
   */
  private mergeRelationships(
    relationships: ExtractedRelationship[]
  ): ExtractedRelationship[] {
    const merged: ExtractedRelationship[] = [];
    const seen = new Set<string>();

    for (const rel of relationships) {
      const key = `${rel.relationship.from}:${rel.relationship.type}:${rel.relationship.to}`;
      if (!seen.has(key)) {
        seen.add(key);
        merged.push(rel);
      } else {
        // Update confidence if higher
        const existing = merged.find(
          (r) =>
            r.relationship.from === rel.relationship.from &&
            r.relationship.type === rel.relationship.type &&
            r.relationship.to === rel.relationship.to
        );
        if (existing && rel.confidence > existing.confidence) {
          existing.confidence = rel.confidence;
        }
      }
    }

    return merged;
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
    entities: ExtractedEntity[],
    relationships: ExtractedRelationship[]
  ): number {
    const allConfidences = [
      ...entities.map((e) => e.confidence),
      ...relationships.map((r) => r.confidence),
    ];

    if (allConfidences.length === 0) return 0;

    return (
      allConfidences.reduce((sum, conf) => sum + conf, 0) /
      allConfidences.length
    );
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
