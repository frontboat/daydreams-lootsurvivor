import type { ChainOfThought } from "../core/chain-of-thought";
import type { Documentation } from "../core/vector-db";
import type { EpisodicMemory } from "../core/vector-db";

/**
 * Represents a single "step" in the Chain of Thought.
 */
export interface CoTStep {
  id: string;
  content: string;
  timestamp: number;
  tags?: string[];
  meta?: Record<string, any>;
}

/**
 * ChainOfThoughtContext can hold any relevant data
 * the LLM or game might need to keep track of during reasoning.
 */
export interface ChainOfThoughtContext {
  // For example, a game state might have player info, world state, etc.
  worldState: string;
  actionHistory?: Record<
    number,
    {
      action: CoTAction;
      result: string;
    }
  >;
  pastExperiences?: EpisodicMemory[];
  relevantKnowledge?: Documentation[];
}

/**
 * Different action types the CoT might execute.
 * You can expand or modify as needed.
 */
//  TODO: deprecate
export type CoTActionType =
  | "GRAPHQL_FETCH"
  | "EXECUTE_TRANSACTION"
  | "READ_CONTRACT"
  | "SYSTEM_PROMPT";

/**
 * Data necessary for a particular action type.
 * Extend this to fit your actual logic.
 */
export interface CoTAction {
  type: CoTActionType;
  payload: Record<string, any>;
}

export interface LLMStructuredResponse {
  plan?: string;
  meta?: {
    requirements?: {
      resources?: Record<string, number>;
      population?: number;
    };
  };
  actions: CoTAction[];
}

export interface CoTTransaction {
  contractAddress: string;
  entrypoint: string;
  calldata: any[];
}

export interface SearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata?: Record<string, any>;
}

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

export interface LoggerConfig {
  level: LogLevel;
  enableTimestamp?: boolean;
  enableColors?: boolean;
  logToFile?: boolean;
  logPath?: string;
}

export interface LogEntry {
  level: LogLevel;
  timestamp: Date;
  context: string;
  message: string;
  data?: any;
}

export type ActionHandler = (
  action: CoTAction,
  chain: ChainOfThought,
  example?: { description: string; example: string }
) => Promise<string>;
