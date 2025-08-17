import type {
  AnyAgent,
  AnyContext,
  AnyRef,
  ContextState,
  WorkingMemory,
} from "../types";

// =============================================================================
// EPISODE MANAGEMENT AND DETECTION
// =============================================================================

// Episode tracking state (per context)
const episodeState = new Map<
  string,
  {
    currentEpisodeLogs: AnyRef[];
    episodeStarted: boolean;
  }
>();
/**
 * Handles episode detection and storage using context-defined hooks
 *
 * Episodes are sequences of interactions that form meaningful units of conversation
 * or task execution. This function manages the lifecycle of episodes using hooks
 * defined in the context configuration.
 *
 * @template TContext - The context type
 * @param workingMemory - Current working memory state
 * @param ref - The log reference being processed
 * @param contextState - Current context state
 * @param agent - Agent instance for memory operations
 * @returns Promise that resolves when episode processing is complete
 */
export async function handleEpisodeHooks<TContext extends AnyContext>(
  workingMemory: WorkingMemory,
  ref: AnyRef,
  contextState: ContextState<TContext>,
  agent: AnyAgent
): Promise<void> {
  try {
    const hooks = contextState.context.episodeHooks;
    const contextId = contextState.id;

    // Initialize episode state for this context if needed
    if (!episodeState.has(contextId)) {
      episodeState.set(contextId, {
        currentEpisodeLogs: [],
        episodeStarted: false,
      });
    }

    const state = episodeState.get(contextId)!;

    // Check if we should start a new episode
    const shouldStart = hooks?.shouldStartEpisode
      ? await hooks.shouldStartEpisode(ref, workingMemory, contextState, agent)
      : defaultShouldStartEpisode(ref, workingMemory, contextState);

    if (shouldStart && !state.episodeStarted) {
      // Start new episode
      state.currentEpisodeLogs = [ref];
      state.episodeStarted = true;
      agent.logger.debug("context:episode", "Started new episode", {
        contextId,
        refId: ref.id,
        refType: ref.ref,
      });
      return;
    }

    // Add current ref to episode if one is active
    if (state.episodeStarted) {
      state.currentEpisodeLogs.push(ref);
    }

    // Check if we should end the current episode
    const shouldEnd = hooks?.shouldEndEpisode
      ? await hooks.shouldEndEpisode(ref, workingMemory, contextState, agent)
      : defaultShouldEndEpisode(ref, workingMemory, contextState);

    if (
      shouldEnd &&
      state.episodeStarted &&
      state.currentEpisodeLogs.length > 0
    ) {
      // Create and store the episode
      const episodeData = hooks?.createEpisode
        ? await hooks.createEpisode(
            state.currentEpisodeLogs,
            contextState,
            agent
          )
        : defaultCreateEpisode(state.currentEpisodeLogs, contextState);

      const episodeType = hooks?.classifyEpisode
        ? hooks.classifyEpisode(episodeData, contextState)
        : "conversation";

      const metadata = hooks?.extractMetadata
        ? hooks.extractMetadata(
            episodeData,
            state.currentEpisodeLogs,
            contextState
          )
        : {};

      // Store the episode using the unified memory API
      await agent.memory.remember(episodeData, {
        type: "episode",
        scope: "context",
        contextId,
        metadata: {
          episodeType,
          logCount: state.currentEpisodeLogs.length,
          startTime: state.currentEpisodeLogs[0]?.timestamp,
          endTime: ref.timestamp,
          ...metadata,
        },
      });

      agent.logger.debug("context:episode", "Stored episode using hooks", {
        contextId,
        episodeType,
        logCount: state.currentEpisodeLogs.length,
        duration: ref.timestamp - (state.currentEpisodeLogs[0]?.timestamp || 0),
      });

      if (!hooks?.createEpisode) {
        // TODO: add fact and entity extraction
      }

      // Reset episode state
      state.currentEpisodeLogs = [];
      state.episodeStarted = false;
    }
  } catch (error) {
    agent.logger.warn("context:episode", "Episode hook handling failed", {
      error: error instanceof Error ? error.message : error,
      contextId: contextState.id,
      refId: ref.id,
    });
  }
}

/**
 * Default episode start detection when no custom hooks are provided
 * @template TContext - The context type
 * @param ref - The log reference being evaluated
 * @param workingMemory - Current working memory state
 * @param contextState - Current context state
 * @returns True if an episode should start, false otherwise
 */
function defaultShouldStartEpisode<TContext extends AnyContext>(
  ref: AnyRef,
  workingMemory: WorkingMemory,
  contextState: ContextState<TContext>
): boolean {
  // Start episode on input refs (beginning of interaction)
  return ref.ref === "input";
}

/**
 * Default episode end detection when no custom hooks are provided
 * @template TContext - The context type
 * @param ref - The log reference being evaluated
 * @param workingMemory - Current working memory state
 * @param contextState - Current context state
 * @returns True if the current episode should end, false otherwise
 */
function defaultShouldEndEpisode<TContext extends AnyContext>(
  ref: AnyRef,
  workingMemory: WorkingMemory,
  contextState: ContextState<TContext>
): boolean {
  // End episode on processed output refs (end of interaction)
  return ref.ref === "output" && ref.processed;
}

/**
 * Default episode creation when no custom hooks are provided
 * Creates a structured episode from collected logs
 * @template TContext - The context type
 * @param logs - Array of log references that make up the episode
 * @param contextState - Current context state
 * @returns Episode data object with structured information
 */
function defaultCreateEpisode<TContext extends AnyContext>(
  logs: AnyRef[],
  contextState: ContextState<TContext>
): any {
  const inputs = logs.filter((log) => log.ref === "input");
  const outputs = logs.filter((log) => log.ref === "output");
  const actions = logs.filter((log) => log.ref === "action_call");
  const results = logs.filter((log) => log.ref === "action_result");
  const thoughts = logs.filter((log) => log.ref === "thought");

  return {
    type: "episode",
    context: contextState.id,
    inputs,
    outputs,
    actions,
    results,
    thoughts,
    allLogs: logs,
    summary: `Episode with ${inputs.length} inputs, ${outputs.length} outputs, ${actions.length} actions`,
    duration:
      logs.length > 0
        ? (logs[logs.length - 1]?.timestamp || 0) - (logs[0]?.timestamp || 0)
        : 0,
  };
}
