// Base event type
export interface BaseEvent {
  type: string;
  timestamp: Date;
  metadata?: Record<string, any>;
  content: string;
}

// Core -> Client events
export interface CoreEvent extends BaseEvent {
  target: string; // client id
}

// Client -> Core events
export interface ClientEvent extends BaseEvent {
  source: string; // client id
}

// Twitter specific events
export interface TweetRequest extends CoreEvent {
  type: "tweet_request";
  content: string;
  metadata?: {
    inReplyTo?: string;
    conversationId?: string;
    context?: {
      sentiment?: string;
      topics?: string[];
      threadContext?: string[];
    };
  };
}

export interface DMRequest extends CoreEvent {
  type: "dm_request";
  content: string;
  userId: string;
}

export interface TweetReceived extends ClientEvent {
  type: "tweet_received";
  content: string;
  tweetId: string;
  userId: string;
  username: string;
  timestamp: Date;
  metadata?: {
    isReply?: boolean;
    isRetweet?: boolean;
    hasMedia?: boolean;
    url?: string;
    threadContext?: string[];
    conversationId?: string;
    inReplyToId?: string;
    metrics?: {
      likes?: number;
      retweets?: number;
      replies?: number;
    };
  };
}

export interface DMReceived extends ClientEvent {
  type: "dm_received";
  content: string;
  userId: string;
  username: string;
}

// Discord specific events
export interface DiscordMessageRequest extends CoreEvent {
  type: "discord_message";
  channelId: string;
  content: string;
}

export interface DiscordMessageReceived extends ClientEvent {
  type: "discord_message_received";
  channelId: string;
  content: string;
  username: string;
}

// Union types for easier handling
export type TwitterOutgoingEvent = TweetRequest | DMRequest;
export type TwitterIncomingEvent = TweetReceived | DMReceived;
export type DiscordOutgoingEvent = DiscordMessageRequest;
export type DiscordIncomingEvent = DiscordMessageReceived;

// Combined types
export type OutgoingEvent = TwitterOutgoingEvent | DiscordOutgoingEvent;
export type IncomingEvent =
  | TwitterIncomingEvent
  | DiscordIncomingEvent
  | InternalThought;

export interface InternalThought extends ClientEvent {
  type: "internal_thought";
  content: string;
}

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
  queriesAvailable: string;
  availableActions: string;
  actionHistory?: Record<
    number,
    {
      action: CoTAction;
      result: string;
    }
  >;
  lastTransactionResult?: {
    entrypoint: string;
    result: any;
    timestamp: number;
  };
  lastContractRead?: {
    entrypoint: string;
    result: any;
    timestamp: number;
  };
}

/**
 * Different action types the CoT might execute.
 * You can expand or modify as needed.
 */
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

export interface CoTContractRead {
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
