import type { AnyRef, AnyAgent, ContextState } from "../types";
import type { Memory, EpisodeHooks } from "./types";

export interface Episode {
  id: string;
  contextId: string;
  type: string;
  summary: string;
  logs: AnyRef[];
  metadata: Record<string, any>;
  timestamp: number;
  startTime: number;
  endTime: number;
  duration?: number;
  input?: any;
  output?: any;
  context?: string;
}

export interface EpisodicMemoryOptions {
  /** Maximum number of episodes to keep per context */
  maxEpisodesPerContext?: number;
  /** Minimum time between episodes (ms) */
  minEpisodeGap?: number;
  /** Custom episode detection hooks */
  hooks?: EpisodeHooks;
}

/**
 * Episodic Memory - manages conversational episodes and experiences
 */
export interface EpisodicMemory {
  /** Store an episode */
  store(episode: Episode): Promise<string>;

  /** Find episodes similar to a query */
  findSimilar(
    contextId: string,
    query: string,
    limit?: number
  ): Promise<Episode[]>;

  /** Get episode by ID */
  get(episodeId: string): Promise<Episode | null>;

  /** Get all episodes for a context */
  getByContext(contextId: string, limit?: number): Promise<Episode[]>;

  /** Create episode from logs */
  createFromLogs(
    contextId: string,
    logs: AnyRef[],
    contextState: ContextState,
    agent: AnyAgent
  ): Promise<Episode>;

  /** Delete episode */
  delete(episodeId: string): Promise<boolean>;

  /** Clear all episodes for a context */
  clearContext(contextId: string): Promise<void>;
}

export class EpisodicMemoryImpl implements EpisodicMemory {
  private currentEpisodeLogs: Map<string, AnyRef[]> = new Map();
  private lastEpisodeTime: Map<string, number> = new Map();

  constructor(
    private memory: Memory,
    private options: EpisodicMemoryOptions = {}
  ) {}

  async store(episode: Episode): Promise<string> {
    // Store episode data in KV store
    const episodeKey = `episode:${episode.id}`;
    await this.memory.kv.set(episodeKey, episode);

    // Index episode summary for vector search
    if (episode.summary) {
      await this.memory.vector.index([
        {
          id: episode.id,
          content: episode.summary,
          metadata: {
            contextId: episode.contextId,
            type: "episode",
            timestamp: episode.timestamp,
            startTime: episode.startTime,
            endTime: episode.endTime,
            ...episode.metadata,
          },
          namespace: `episodes:${episode.contextId}`,
        },
      ]);
    }

    // Maintain context episode list
    const contextEpisodesKey = `episodes:context:${episode.contextId}`;
    const existingEpisodes =
      (await this.memory.kv.get<string[]>(contextEpisodesKey)) || [];
    existingEpisodes.push(episode.id);

    // Limit episodes per context
    const maxEpisodes = this.options.maxEpisodesPerContext || 100;
    if (existingEpisodes.length > maxEpisodes) {
      // Remove oldest episodes
      const toRemove = existingEpisodes.splice(
        0,
        existingEpisodes.length - maxEpisodes
      );
      for (const episodeId of toRemove) {
        await this.delete(episodeId);
      }
    }

    await this.memory.kv.set(contextEpisodesKey, existingEpisodes);
    return episode.id;
  }

  async findSimilar(
    contextId: string,
    query: string,
    limit: number = 5
  ): Promise<Episode[]> {
    // Search episodes using vector similarity
    const results = await this.memory.vector.search({
      query,
      namespace: `episodes:${contextId}`,
      limit,
      includeContent: true,
      includeMetadata: true,
    });

    // Fetch full episode data
    const episodes: Episode[] = [];
    for (const result of results) {
      const episode = await this.get(result.id);
      if (episode) {
        episodes.push(episode);
      }
    }

    return episodes;
  }

  async get(episodeId: string): Promise<Episode | null> {
    const episodeKey = `episode:${episodeId}`;
    return await this.memory.kv.get<Episode>(episodeKey);
  }

  async getByContext(
    contextId: string,
    limit: number = 20
  ): Promise<Episode[]> {
    const contextEpisodesKey = `episodes:context:${contextId}`;
    const episodeIds =
      (await this.memory.kv.get<string[]>(contextEpisodesKey)) || [];

    // Get most recent episodes
    const recentIds = episodeIds.slice(-limit);
    const episodes: Episode[] = [];

    for (const episodeId of recentIds) {
      const episode = await this.get(episodeId);
      if (episode) {
        episodes.push(episode);
      }
    }

    return episodes.sort((a, b) => b.timestamp - a.timestamp);
  }

  async createFromLogs(
    contextId: string,
    logs: AnyRef[],
    contextState: ContextState,
    agent: AnyAgent
  ): Promise<Episode> {
    const now = Date.now();
    const episodeId = `${contextId}-${now}-${Math.random()
      .toString(36)
      .slice(2)}`;

    // Use hooks for custom episode creation if provided
    let episodeData: any = logs;
    let episodeType = "conversation";
    let metadata: Record<string, any> = {};

    if (this.options.hooks?.createEpisode) {
      episodeData = await this.options.hooks.createEpisode(
        logs,
        contextState,
        agent
      );
    }

    if (this.options.hooks?.classifyEpisode) {
      episodeType = this.options.hooks.classifyEpisode(
        episodeData,
        contextState
      );
    }

    if (this.options.hooks?.extractMetadata) {
      metadata = this.options.hooks.extractMetadata(
        episodeData,
        logs,
        contextState
      );
    }

    // Generate episode summary
    const summary = this.generateSummary(logs);

    const episode: Episode = {
      id: episodeId,
      contextId,
      type: episodeType,
      summary,
      logs: logs,
      metadata,
      timestamp: now,
      startTime: logs[0]?.timestamp || now,
      endTime: logs[logs.length - 1]?.timestamp || now,
    };

    await this.store(episode);
    return episode;
  }

  async delete(episodeId: string): Promise<boolean> {
    const episode = await this.get(episodeId);
    if (!episode) return false;

    // Delete from KV store
    const episodeKey = `episode:${episodeId}`;
    await this.memory.kv.delete(episodeKey);

    // Delete from vector index
    await this.memory.vector.delete([episodeId]);

    // Remove from context episode list
    const contextEpisodesKey = `episodes:context:${episode.contextId}`;
    const episodeIds =
      (await this.memory.kv.get<string[]>(contextEpisodesKey)) || [];
    const updatedIds = episodeIds.filter((id) => id !== episodeId);
    await this.memory.kv.set(contextEpisodesKey, updatedIds);

    return true;
  }

  async clearContext(contextId: string): Promise<void> {
    const contextEpisodesKey = `episodes:context:${contextId}`;
    const episodeIds =
      (await this.memory.kv.get<string[]>(contextEpisodesKey)) || [];

    // Delete all episodes for this context
    await Promise.all(episodeIds.map((id) => this.delete(id)));

    // Clear the context episode list
    await this.memory.kv.delete(contextEpisodesKey);
  }

  /**
   * Check if a new episode should be started
   */
  async shouldStartEpisode(
    ref: AnyRef,
    contextId: string,
    contextState: ContextState,
    agent: AnyAgent
  ): Promise<boolean> {
    if (this.options.hooks?.shouldStartEpisode) {
      const workingMemory = await this.memory.working.get(contextId);
      return this.options.hooks.shouldStartEpisode(
        ref,
        workingMemory,
        contextState,
        agent
      );
    }

    // Default: Start episode on first input or after gap
    const lastTime = this.lastEpisodeTime.get(contextId) || 0;
    const minGap = this.options.minEpisodeGap || 300000; // 5 minutes default

    return ref.ref === "input" && Date.now() - lastTime > minGap;
  }

  /**
   * Check if the current episode should be ended
   */
  async shouldEndEpisode(
    ref: AnyRef,
    contextId: string,
    contextState: ContextState,
    agent: AnyAgent
  ): Promise<boolean> {
    if (this.options.hooks?.shouldEndEpisode) {
      const workingMemory = await this.memory.working.get(contextId);
      return this.options.hooks.shouldEndEpisode(
        ref,
        workingMemory,
        contextState,
        agent
      );
    }

    // Default: End episode when significant interaction occurs
    const logs = this.currentEpisodeLogs.get(contextId) || [];
    return (
      logs.length > 0 && (ref.ref === "output" || ref.ref === "action_result")
    );
  }

  /**
   * Add log to current episode
   */
  addToCurrentEpisode(contextId: string, ref: AnyRef): void {
    if (!this.currentEpisodeLogs.has(contextId)) {
      this.currentEpisodeLogs.set(contextId, []);
    }
    this.currentEpisodeLogs.get(contextId)!.push(ref);
  }

  /**
   * Finalize current episode
   */
  async finalizeCurrentEpisode(
    contextId: string,
    contextState: ContextState,
    agent: AnyAgent
  ): Promise<Episode | null> {
    const logs = this.currentEpisodeLogs.get(contextId);
    if (!logs || logs.length === 0) return null;

    const episode = await this.createFromLogs(
      contextId,
      logs,
      contextState,
      agent
    );

    // Clear current episode logs
    this.currentEpisodeLogs.set(contextId, []);
    this.lastEpisodeTime.set(contextId, Date.now());

    return episode;
  }

  private generateSummary(logs: AnyRef[]): string {
    // Simple summary generation - can be enhanced with LLM later
    const inputs = logs.filter((log) => log.ref === "input");
    const outputs = logs.filter((log) => log.ref === "output");
    const actions = logs.filter((log) => log.ref === "action_call");

    const parts: string[] = [];

    if (inputs.length > 0) {
      const firstInput = inputs[0] as any;
      parts.push(
        `User: ${
          typeof firstInput.content === "string"
            ? firstInput.content
            : JSON.stringify(firstInput.content)
        }`
      );
    }

    if (actions.length > 0) {
      const actionNames = actions.map((a: any) => a.name).join(", ");
      parts.push(`Actions: ${actionNames}`);
    }

    if (outputs.length > 0) {
      const lastOutput = outputs[outputs.length - 1] as any;
      parts.push(
        `Assistant: ${
          typeof lastOutput.content === "string"
            ? lastOutput.content
            : JSON.stringify(lastOutput.content)
        }`
      );
    }

    return parts.join(" | ");
  }
}
