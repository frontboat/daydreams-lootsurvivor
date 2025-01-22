import type { z } from "zod";
import type { Documentation } from "../core/vector-db";
import type { EpisodicMemory } from "../core/vector-db";
import type { LLMClient } from "../core/llm-client";
import type { Logger } from "../core/logger";

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

export type StepType = "action" | "planning" | "system" | "task";

export interface BaseStep {
  id: string;
  type: StepType;
  content: string;
  timestamp: number;
  tags?: string[];
  meta?: Record<string, any>;
}

export interface ActionStep extends BaseStep {
  type: "action";
  content: string;
  toolCall?: {
    name: string;
    arguments: any;
    id: string;
  };
  error?: Error;
  observations?: string;
  actionOutput?: any;
  duration?: number;
}

export interface PlanningStep extends BaseStep {
  type: "planning";
  plan: string;
  facts: string;
}

export interface SystemStep extends BaseStep {
  type: "system";
  systemPrompt: string;
}

export interface TaskStep extends BaseStep {
  type: "task";
  task: string;
}

export type Step = ActionStep | PlanningStep | SystemStep | TaskStep;

export type HorizonType = "long" | "medium" | "short";
export type GoalStatus =
  | "pending"
  | "active"
  | "completed"
  | "failed"
  | "ready"
  | "blocked";

// Add new interfaces for goal management
export interface Goal {
  id: string;
  horizon: HorizonType;
  description: string;
  status: GoalStatus;
  priority: number;
  dependencies?: string[]; // IDs of goals that must be completed first
  subgoals?: string[]; // IDs of child goals
  parentGoal?: string; // ID of parent goal
  success_criteria: string[];
  created_at: number;
  completed_at?: number;
  progress?: number; // 0-100 to track partial completion
  meta?: Record<string, any>;

  /**
   * A numeric measure of how successful this goal was completed.
   * You can define any scale you like: e.g. 0-1, or 0-100, or a positive/negative integer.
   */
  outcomeScore?: number;

  /**
   * Optional history of scores over time, if you want to track multiple attempts or partial runs.
   */
  scoreHistory?: Array<{
    timestamp: number;
    score: number;
    comment?: string;
  }>;
}

export interface LLMResponse {
  text: string;
  model: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  metadata?: Record<string, unknown>;
}

export interface LLMClientConfig {
  model?: string;
  maxRetries?: number;
  timeout?: number;
  temperature?: number;
  maxTokens?: number;
  baseDelay?: number;
  maxDelay?: number;
}

export interface AnalysisOptions {
  system?: string;
  role?: string;
  temperature?: number;
  maxTokens?: number;
  formatResponse?: boolean;
}

export interface StructuredAnalysis {
  summary: string;
  reasoning: string;
  conclusion: string;
  confidenceLevel: number;
  caveats: string[];
}

// Add type definitions for the events
export interface ChainOfThoughtEvents {
  step: (step: Step) => void;
  "action:start": (action: CoTAction) => void;
  "action:complete": (data: { action: CoTAction; result: string }) => void;
  "action:error": (data: { action: CoTAction; error: Error | unknown }) => void;
  "think:start": (data: { query: string }) => void;
  "think:complete": (data: { query: string }) => void;
  "think:timeout": (data: { query: string }) => void;
  "think:error": (data: { query: string; error: Error | unknown }) => void;
  "goal:created": (goal: { id: string; description: string }) => void;
  "goal:updated": (goal: { id: string; status: GoalStatus }) => void;
  "goal:completed": (goal: { id: string; result: any }) => void;
  "goal:failed": (goal: { id: string; error: Error | unknown }) => void;
  "goal:started": (goal: { id: string; description: string }) => void;
  "goal:blocked": (goal: { id: string; reason: string }) => void;
  "memory:experience_stored": (data: { experience: EpisodicMemory }) => void;
  "memory:knowledge_stored": (data: { document: Documentation }) => void;
  "memory:experience_retrieved": (data: {
    experiences: EpisodicMemory[];
  }) => void;
  "memory:knowledge_retrieved": (data: { documents: Documentation[] }) => void;
  "trace:tokens": (data: { input: number; output: number }) => void;
}

// Add type safety to event emitter
export declare interface ChainOfThought {
  on<K extends keyof ChainOfThoughtEvents>(
    event: K,
    listener: ChainOfThoughtEvents[K]
  ): this;
  emit<K extends keyof ChainOfThoughtEvents>(
    event: K,
    ...args: Parameters<ChainOfThoughtEvents[K]>
  ): boolean;
}

export interface RefinedGoal {
  description: string;
  success_criteria: string[];
  priority: number;
  horizon: "short";
  requirements: Record<string, any>;
}

export interface LLMValidationOptions<T> {
  prompt: string;
  systemPrompt: string;
  schema: z.ZodSchema<T>;
  maxRetries?: number;
  onRetry?: (error: Error, attempt: number) => void;
  llmClient: LLMClient;
  logger: Logger;
}
