import { LLMClient } from "./llm-client";
import { Logger } from "./logger";
import { Room } from "./room";
import type { VectorDB } from "./vector-db";
import type { Character } from "./character";
import type { SearchResult } from "../types";
import { LogLevel } from "../types";
import type { Output } from "./core";
import type { JSONSchemaType } from "ajv";
import { getValidatedLLMResponse } from "./utils";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

export interface ProcessedResult {
  content: any;
  metadata: Record<string, any>;
  enrichedContext: EnrichedContext;
  suggestedOutputs: SuggestedOutput<any>[];
  isOutputSuccess?: boolean;
  alreadyProcessed?: boolean;
}

export interface SuggestedOutput<T> {
  name: string;
  data: T;
  confidence: number;
  reasoning: string;
}

export interface EnrichedContext {
  timeContext: string;
  summary: string;
  topics: string[];
  relatedMemories: string[];
  sentiment?: string;
  entities?: string[];
  intent?: string;
  similarMessages?: any[];
  metadata?: Record<string, any>;
  availableOutputs?: string[]; // Names of available outputs
}

interface EnrichedContent {
  originalContent: string;
  timestamp: Date;
  context: EnrichedContext;
}

// Type guard for VectorDB with room methods
interface VectorDBWithRooms extends VectorDB {
  storeInRoom: (
    content: string,
    roomId: string,
    metadata?: Record<string, any>
  ) => Promise<void>;
  findSimilarInRoom: (
    content: string,
    roomId: string,
    limit?: number,
    metadata?: Record<string, any>
  ) => Promise<SearchResult[]>;
}

function hasRoomSupport(vectorDb: VectorDB): vectorDb is VectorDBWithRooms {
  return "storeInRoom" in vectorDb && "findSimilarInRoom" in vectorDb;
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36); // Convert to base36 for shorter strings
}

export class Processor {
  private logger: Logger;
  private availableOutputs: Map<string, Output> = new Map();

  constructor(
    private vectorDb: VectorDB,
    private llmClient: LLMClient,
    private character: Character,
    logLevel: LogLevel = LogLevel.ERROR
  ) {
    this.logger = new Logger({
      level: logLevel,
      enableColors: true,
      enableTimestamp: true,
    });
  }

  public registerAvailableOutput(output: Output): void {
    this.availableOutputs.set(output.name, output);
  }

  async process(content: any, room: Room): Promise<ProcessedResult> {
    this.logger.debug("Processor.process", "Processing content", {
      content,
      roomId: room.id,
      contentType: typeof content,
      isString: typeof content === "string",
      contentStr:
        typeof content === "string" ? content : JSON.stringify(content),
    });

    // Check if this content was already processed
    const contentId = this.generateContentId(content);

    this.logger.debug("Processor.process", "Generated content ID", {
      contentId,
      content: typeof content === "string" ? content : JSON.stringify(content),
    });

    const alreadyProcessed = await this.hasProcessedContent(contentId, room);

    this.logger.info("Processor.process", "Already processed", {
      contentId,
      alreadyProcessed,
    });

    if (alreadyProcessed) {
      return {
        content,
        metadata: {},
        enrichedContext: {
          timeContext: this.getTimeContext(new Date()),
          summary: "",
          topics: [],
          relatedMemories: [],
        },
        suggestedOutputs: [],
        alreadyProcessed: true,
      };
    }

    // First, classify the content
    const contentClassification = await this.classifyContent(content);

    // Second, enrich content
    const enrichedContent = await this.enrichContent(content, room, new Date());

    // Third, determine potential outputs
    const suggestedOutputs = await this.determinePotentialOutputs(
      content,
      enrichedContent,
      contentClassification
    );

    this.logger.info("Processor.process", "Suggested outputs", {
      contentId,
      suggestedOutputs,
    });

    // Store that we've processed this content
    await this.markContentAsProcessed(contentId, room);

    return {
      content,
      metadata: {
        ...contentClassification.context,
        contentType: contentClassification.contentType,
      },
      enrichedContext: {
        ...enrichedContent.context,
        availableOutputs: Array.from(this.availableOutputs.keys()),
      },
      suggestedOutputs,
      alreadyProcessed: false,
    };
  }

  private async determinePotentialOutputs(
    content: any,
    enrichedContent: EnrichedContent,
    classification: { contentType: string; context: Record<string, any> }
  ): Promise<SuggestedOutput<any>[]> {
    const availableOutputs = Array.from(this.availableOutputs.entries());

    if (availableOutputs.length === 0) return [];

    const prompt = `You are an AI assistant that analyzes content and suggests appropriate outputs.

Content to analyze: 
${typeof content === "string" ? content : JSON.stringify(content, null, 2)}

Content Classification:
${JSON.stringify(classification, null, 2)}

Context:
${JSON.stringify(enrichedContent.context, null, 2)}

If this is feedback from a previous output:
1. First determine if the output was successful
2. If successful, return an empty array - no new actions needed
3. Only suggest new outputs if the previous action failed or requires follow-up

# Content Outputs Schemas - select the appropriate schema for the output. You can select one or more or none.
${availableOutputs
  .map(
    ([name, output]) => `${name}:
   ${JSON.stringify(zodToJsonSchema(output.schema, "mySchema"), null, 2)}
  `
  )
  .join("\n\n")}

If the output is for a message user the personality of the character to determine if the output was successful.

${JSON.stringify(this.character, null, 2)}

Based on the content and context, determine which outputs should be triggered.
For each appropriate output, provide:
1. The output name
2. The data that matches the output's schema
3. A confidence score (0-1)
4. Reasoning for the suggestion

`;

    try {
      return (await getValidatedLLMResponse({
        prompt,
        systemPrompt:
          "You are an expert system that analyzes content and suggests appropriate automated responses. You are precise and careful to ensure all data matches the required schemas.",
        schema: z.array(
          z.object({
            name: z.string(),
            data: z.any().describe("The data that matches the output's schema"),
            confidence: z.number(),
            reasoning: z.string(),
          })
        ),
        llmClient: this.llmClient,
        logger: this.logger,
      })) as SuggestedOutput<any>[];
    } catch (error) {
      this.logger.error("Processor.determinePotentialOutputs", "Error", {
        error,
      });
      return [];
    }
  }

  private async classifyContent(content: any): Promise<{
    contentType: string;
    context: Record<string, any>;
  }> {
    const contentStr =
      typeof content === "string" ? content : JSON.stringify(content);

    const prompt = `Classify the following content and provide context:

    # Content: "${contentStr}"

    # Determine
    1. What type of content this is (data, message, event, etc.)
    2. What kind of processing it requires
    3. Any relevant context
  
`;

    const classification = await getValidatedLLMResponse({
      prompt,
      systemPrompt: "You are an expert content classifier.",
      schema: z.object({
        contentType: z.string(),
        requiresProcessing: z.boolean(),
        context: z.object({
          topic: z.string(),
          urgency: z.enum(["high", "medium", "low"]),
          additionalContext: z.string(),
        }),
      }),
      llmClient: this.llmClient,
      logger: this.logger,
    });

    return typeof classification === "string"
      ? JSON.parse(this.stripCodeBlock(classification))
      : classification;
  }

  private stripCodeBlock(text: string): string {
    text = text
      .replace(/^```[\w]*\n/, "")
      .replace(/\n```$/, "")
      .trim();

    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    return jsonMatch ? jsonMatch[0] : text;
  }

  private async enrichContent<T>(
    content: T,
    room: Room,
    timestamp: Date
  ): Promise<EnrichedContent> {
    const contentStr =
      typeof content === "string" ? content : JSON.stringify(content);

    // Get related memories if supported
    const relatedMemories = hasRoomSupport(this.vectorDb)
      ? await this.vectorDb.findSimilarInRoom(contentStr, room.id, 3)
      : [];

    const prompt = `Analyze the following content and provide enrichment:

Content: "${contentStr}"

Related Context:
${relatedMemories.map((m: SearchResult) => `- ${m.content}`).join("\n")}

Return a JSON object with the following fields:
1. A brief summary (max 100 chars)
2. Key topics mentioned (max 5)
3. Sentiment analysis
4. Named entities
5. Detected intent/purpose

`;

    try {
      const result = await getValidatedLLMResponse({
        prompt,
        systemPrompt: this.character.voice.tone,
        schema: z.object({
          summary: z.string().max(300),
          topics: z.array(z.string()).max(20),
          sentiment: z.enum(["positive", "negative", "neutral"]),
          entities: z.array(z.string()),
          intent: z.string(),
        }),
        llmClient: this.llmClient,
        logger: this.logger,
      });

      return {
        originalContent: contentStr,
        timestamp,
        context: {
          timeContext: this.getTimeContext(timestamp),
          summary: result.summary || contentStr.slice(0, 100),
          topics: Array.isArray(result.topics) ? result.topics : [],
          relatedMemories: relatedMemories.map((m: SearchResult) => m.content),
          sentiment: result.sentiment || "neutral",
          entities: Array.isArray(result.entities) ? result.entities : [],
          intent: result.intent || "unknown",
        },
      };
    } catch (error) {
      this.logger.error("Processor.enrichContent", "Enrichment failed", {
        error,
      });

      return {
        originalContent: contentStr,
        timestamp,
        context: {
          timeContext: this.getTimeContext(timestamp),
          summary: contentStr.slice(0, 100),
          topics: [],
          relatedMemories: relatedMemories.map((m: SearchResult) => m.content),
          sentiment: "neutral",
          entities: [],
          intent: "unknown",
        },
      };
    }
  }

  private getTimeContext(timestamp: Date): string {
    const now = new Date();
    const hoursDiff = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 24) return "very_recent";
    if (hoursDiff < 72) return "recent";
    if (hoursDiff < 168) return "this_week";
    if (hoursDiff < 720) return "this_month";
    return "older";
  }

  // Helper method to generate a consistent ID for content
  private generateContentId(content: any): string {
    try {
      // Special handling for Twitter mentions/tweets
      if (Array.isArray(content) && content[0]?.type === "tweet") {
        // For Twitter content, use the newest tweet's ID as the marker
        const newestTweet = content[0];
        return `tweet_batch_${newestTweet.metadata.tweetId}`;
      }

      // Single tweet handling
      if (content?.type === "tweet") {
        return `tweet_${content.metadata.tweetId}`;
      }

      // Keep existing logic for other content types
      if (typeof content === "string") {
        return `content_${hashString(content)}`;
      }

      // For arrays of non-tweet content
      if (Array.isArray(content)) {
        const ids = content.map((item) => {
          if (item.id) return item.id;
          if (item.metadata?.id) return item.metadata.id;

          // Look for common ID patterns
          for (const [key, value] of Object.entries(item.metadata || {})) {
            if (key.toLowerCase().endsWith("id") && value) {
              return value;
            }
          }

          // If no ID found, hash the content
          const relevantData = {
            content: item.content || item,
            type: item.type,
          };
          return hashString(JSON.stringify(relevantData));
        });

        return `array_${ids.join("_").slice(0, 100)}`; // Limit length of combined IDs
      }

      // For single objects, try to find an ID first
      if (content.id) {
        return `obj_${content.id}`;
      }

      // Special handling for consciousness-generated content
      if (
        content.type === "internal_thought" ||
        content.source === "consciousness"
      ) {
        const thoughtData = {
          content: content.content,
          timestamp: content.timestamp,
        };
        return `thought_${hashString(JSON.stringify(thoughtData))}`;
      }

      if (content.metadata?.id) {
        return `obj_${content.metadata.id}`;
      }

      // Look for common ID patterns in metadata
      if (content.metadata) {
        for (const [key, value] of Object.entries(content.metadata)) {
          if (key.toLowerCase().endsWith("id") && value) {
            return `obj_${value}`;
          }
        }
      }

      // If no ID found, fall back to hashing relevant content
      const relevantData = {
        content: content.content || content,
        type: content.type,
        // Include source if available, but exclude room IDs
        ...(content.source &&
          content.source !== "consciousness" && { source: content.source }),
      };
      return `obj_${hashString(JSON.stringify(relevantData))}`;
    } catch (error) {
      this.logger.error(
        "Processor.generateContentId",
        "Error generating content ID",
        {
          error,
          content:
            typeof content === "object" ? JSON.stringify(content) : content,
        }
      );
      return `fallback_${Date.now()}`;
    }
  }

  // Check if we've already processed this content
  private async hasProcessedContent(
    contentId: string,
    room: Room
  ): Promise<boolean> {
    if (!hasRoomSupport(this.vectorDb)) {
      return false;
    }

    // Create a marker string that includes the content ID
    const markerContent = `processed_content:${contentId}`;

    this.logger.debug("Processor.hasProcessedContent", "Checking content", {
      contentId,
      markerContent,
      roomId: room.id,
    });

    const similar = await this.vectorDb.findSimilarInRoom(
      markerContent,
      room.id,
      1
    );

    return similar.length > 0;
  }

  // Mark content as processed
  private async markContentAsProcessed(
    contentId: string,
    room: Room
  ): Promise<void> {
    if (!hasRoomSupport(this.vectorDb)) {
      return;
    }

    // Create a marker string that includes the content ID
    const markerContent = `processed_content:${contentId}`;

    await this.vectorDb.storeInRoom(
      markerContent, // Changed from just contentId to markerContent
      room.id,
      {
        type: "processed_marker",
        timestamp: new Date().toISOString(),
      }
    );
  }
}
