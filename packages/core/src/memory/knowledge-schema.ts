import type { Entity, Relationship } from "./types";

/**
 * Configuration for automatic entity extraction
 */
export interface EntityExtractionConfig {
  /** Regex patterns to match entities in text */
  patterns?: RegExp[];
  /** Keywords that indicate this entity type */
  indicators?: string[];
  /** Context clues that suggest this entity */
  contextClues?: string[];
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
}

/**
 * Configuration for automatic relationship extraction
 */
export interface RelationshipExtractionConfig {
  /** Natural language patterns that indicate this relationship */
  patterns?: RegExp[];
  /** Verbs that suggest this relationship */
  verbs?: string[];
  /** Prepositions that connect entities in this relationship */
  prepositions?: string[];
  /** Whether this relationship is bidirectional */
  bidirectional?: boolean;
}

/**
 * Semantic metadata for relationships
 */
export interface RelationshipSemantics {
  /** Human-readable verb describing the relationship */
  verb: string;
  /** Inverse verb (e.g., "works_for" inverse is "employs") */
  inverseVerb?: string;
  /** Relationship strength (0-1) */
  strength?: number;
  /** Context where this relationship applies */
  context?: string;
  /** Whether this relationship was inferred vs explicit */
  inferred?: boolean;
  /** Whether this relationship is bidirectional */
  bidirectional?: boolean;
  /** Temporal information */
  temporal?: {
    start?: Date;
    end?: Date;
    duration?: number;
  };
}

/**
 * Enhanced relationship with semantic properties
 */
export interface SemanticRelationship extends Relationship {
  semantics?: RelationshipSemantics;
}

/**
 * Entity type definition in knowledge schema
 */
export interface EntityTypeDefinition {
  /** Entity type name */
  name: string;
  /** Human-readable display name */
  displayName?: string;
  /** Description of this entity type */
  description?: string;
  /** Required properties for this entity type */
  requiredProperties?: string[];
  /** Optional properties with their types */
  optionalProperties?: Record<string, 'string' | 'number' | 'boolean' | 'date' | 'object'>;
  /** Configuration for automatic extraction */
  extraction?: EntityExtractionConfig;
  /** Relationships this entity can have */
  relationships?: Record<string, RelationshipTypeDefinition>;
}

/**
 * Relationship type definition in knowledge schema
 */
export interface RelationshipTypeDefinition {
  /** Relationship type name */
  name: string;
  /** Human-readable display name */
  displayName?: string;
  /** Description of this relationship */
  description?: string;
  /** Target entity types this relationship can connect to */
  targetEntityTypes: string[];
  /** Semantic information about this relationship */
  semantics: RelationshipSemantics;
  /** Configuration for automatic extraction */
  extraction?: RelationshipExtractionConfig;
  /** Whether multiple relationships of this type are allowed */
  multiple?: boolean;
}

/**
 * Complete knowledge graph schema definition
 */
export interface KnowledgeSchema {
  /** Schema name/identifier */
  name: string;
  /** Schema version for migration support */
  version: string;
  /** Human-readable description */
  description?: string;
  /** Entity type definitions */
  entityTypes: Record<string, EntityTypeDefinition>;
  /** Global relationship type definitions */
  relationshipTypes: Record<string, RelationshipTypeDefinition>;
  /** Schema metadata */
  metadata?: {
    /** When schema was created */
    createdAt?: Date;
    /** Last modified timestamp */
    updatedAt?: Date;
    /** Schema author/organization */
    author?: string;
    /** Domain this schema applies to */
    domain?: string;
    /** Tags for categorization */
    tags?: string[];
  };
}

/**
 * Result of entity extraction from text
 */
export interface ExtractedEntity {
  /** Entity details */
  entity: Omit<Entity, 'id'>;
  /** Confidence score (0-1) */
  confidence: number;
  /** Text span that matched */
  textSpan?: {
    start: number;
    end: number;
    text: string;
  };
  /** How this entity was extracted */
  extractionMethod: 'pattern' | 'indicator' | 'llm' | 'manual';
}

/**
 * Result of relationship extraction from text
 */
export interface ExtractedRelationship {
  /** Relationship details */
  relationship: Omit<SemanticRelationship, 'id'>;
  /** Confidence score (0-1) */
  confidence: number;
  /** Text span that suggested this relationship */
  textSpan?: {
    start: number;
    end: number;
    text: string;
  };
  /** How this relationship was extracted */
  extractionMethod: 'pattern' | 'verb' | 'llm' | 'manual';
}

/**
 * Complete extraction result
 */
export interface ExtractionResult {
  /** Extracted entities */
  entities: ExtractedEntity[];
  /** Extracted relationships */
  relationships: ExtractedRelationship[];
  /** Overall confidence in extraction */
  overallConfidence: number;
  /** Processing metadata */
  metadata: {
    /** Time taken to extract */
    processingTime: number;
    /** Schema used for extraction */
    schemaName: string;
    /** Text that was processed */
    sourceText: string;
    /** LLM model used (if any) */
    model?: string;
  };
}

/**
 * Factory function to create a knowledge schema
 */
export function defineSchema(config: {
  name: string;
  version?: string;
  description?: string;
  domain?: string;
  entityTypes: Record<string, Omit<EntityTypeDefinition, 'name'>>;
  relationshipTypes?: Record<string, Omit<RelationshipTypeDefinition, 'name'>>;
}): KnowledgeSchema {
  const entityTypes: Record<string, EntityTypeDefinition> = {};
  for (const [name, def] of Object.entries(config.entityTypes)) {
    entityTypes[name] = { ...def, name };
  }

  const relationshipTypes: Record<string, RelationshipTypeDefinition> = {};
  if (config.relationshipTypes) {
    for (const [name, def] of Object.entries(config.relationshipTypes)) {
      relationshipTypes[name] = { ...def, name };
    }
  }

  return {
    name: config.name,
    version: config.version || '1.0.0',
    description: config.description,
    entityTypes,
    relationshipTypes,
    metadata: {
      createdAt: new Date(),
      updatedAt: new Date(),
      domain: config.domain,
    },
  };
}

/**
 * Helper to create entity extraction patterns
 */
export function createEntityPatterns(config: {
  personNames?: boolean;
  companies?: boolean;
  locations?: boolean;
  skills?: boolean;
  custom?: RegExp[];
}): RegExp[] {
  const patterns: RegExp[] = [];

  if (config.personNames) {
    patterns.push(
      /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)\b/g, // Full names
      /(?:Mr\.|Ms\.|Dr\.|Prof\.)\s([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g // Titles
    );
  }

  if (config.companies) {
    patterns.push(
      /\b([A-Z][a-zA-Z]*(?:\s(?:Inc|LLC|Corp|Ltd|Company|Co)\.?))\b/g,
      /\b([A-Z][a-zA-Z]*(?:\sInc\.?|\sLLC\.?|\sCorp\.?|\sLtd\.?))/g
    );
  }

  if (config.locations) {
    patterns.push(
      /\bin\s([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g, // "in Location"
      /\bat\s([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)/g // "at Location"
    );
  }

  if (config.skills) {
    patterns.push(
      /(?:skilled in|expert in|knows|proficient in)\s([^,.]+)/gi,
      /([A-Za-z\s]+)(?:\sskills?|\sexperience|\sknowledge)/gi
    );
  }

  if (config.custom) {
    patterns.push(...config.custom);
  }

  return patterns;
}

/**
 * Helper to create relationship extraction patterns
 */
export function createRelationshipPatterns(config: {
  workRelations?: boolean;
  ownershipRelations?: boolean;
  locationRelations?: boolean;
  skillRelations?: boolean;
  custom?: Array<{
    pattern: RegExp;
    relationshipType: string;
    semantics: RelationshipSemantics;
  }>;
}): Array<{
  pattern: RegExp;
  relationshipType: string;
  semantics: RelationshipSemantics;
}> {
  const patterns: Array<{
    pattern: RegExp;
    relationshipType: string;
    semantics: RelationshipSemantics;
  }> = [];

  if (config.workRelations) {
    patterns.push(
      {
        pattern: /(\w+(?:\s\w+)*)\s(?:works? (?:at|for)|is employed (?:at|by))\s(\w+(?:\s\w+)*)/gi,
        relationshipType: 'WORKS_FOR',
        semantics: { verb: 'works for', inverseVerb: 'employs', context: 'professional' }
      },
      {
        pattern: /(\w+(?:\s\w+)*)\s(?:manages?|leads?|supervises?)\s(\w+(?:\s\w+)*)/gi,
        relationshipType: 'MANAGES',
        semantics: { verb: 'manages', inverseVerb: 'is managed by', context: 'professional' }
      }
    );
  }

  if (config.ownershipRelations) {
    patterns.push({
      pattern: /(\w+(?:\s\w+)*)\s(?:owns?|possesses?|has)\s(\w+(?:\s\w+)*)/gi,
      relationshipType: 'OWNS',
      semantics: { verb: 'owns', inverseVerb: 'is owned by', context: 'ownership' }
    });
  }

  if (config.locationRelations) {
    patterns.push({
      pattern: /(\w+(?:\s\w+)*)\s(?:is located in|is based in|is in)\s(\w+(?:\s\w+)*)/gi,
      relationshipType: 'LOCATED_IN',
      semantics: { verb: 'is located in', inverseVerb: 'contains', context: 'geographic' }
    });
  }

  if (config.skillRelations) {
    patterns.push({
      pattern: /(\w+(?:\s\w+)*)\s(?:has skill|is skilled in|knows|can)\s(\w+(?:\s\w+)*)/gi,
      relationshipType: 'HAS_SKILL',
      semantics: { verb: 'has skill', context: 'professional' }
    });
  }

  if (config.custom) {
    patterns.push(...config.custom);
  }

  return patterns;
}