import { z, type ZodRawShape } from "zod/v4";
import type {
  AnyAction,
  AnyAgent,
  AnyContext,
  AnyRef,
  Context,
  ContextConfig,
  ContextSettings,
  ContextState,
  InferSchemaArguments,
  Log,
  WorkingMemory,
} from "./types";
import { formatContextLog } from "./formatters";
import { memory } from "./utils";
import { LogEventType, StructuredLogger } from "./logging-events";

/**
 * Creates a context configuration
 * @template Memory - Type of working memory
 * @template Args - Zod schema type for context arguments
 * @template Ctx - Type of context data
 * @template Exports - Type of exported data
 * @param ctx - Context configuration object
 * @returns Typed context configuration
 */

export function context<
  TMemory = any,
  Args extends z.ZodTypeAny | ZodRawShape = any,
  Ctx = any,
  Actions extends AnyAction[] = AnyAction[],
  Events extends Record<string, z.ZodTypeAny | z.ZodRawShape> = Record<
    string,
    z.ZodTypeAny | z.ZodRawShape
  >
>(
  config: ContextConfig<TMemory, Args, Ctx, Actions, Events>
): Context<TMemory, Args, Ctx, Actions, Events> {
  const ctx: Context<TMemory, Args, Ctx, Actions, Events> = {
    ...config,
    setActions(actions) {
      Object.assign(ctx, { actions });
      return ctx as any;
    },
    setInputs(inputs) {
      ctx.inputs = inputs;
      return ctx;
    },
    setOutputs(outputs) {
      ctx.outputs = outputs;
      return ctx;
    },
    use(composer) {
      ctx.__composers = ctx.__composers?.concat(composer) ?? [composer];
      return ctx;
    },
  };

  return ctx;
}

/**
 * Retrieves and sorts working memory logs
 * @param memory - Working memory object
 * @param includeThoughts - Whether to include thought logs (default: true)
 * @returns Sorted array of memory logs
 */
export function getWorkingMemoryLogs(
  memory: Partial<WorkingMemory>,
  includeThoughts = true
): Log[] {
  return [
    ...(memory.inputs ?? []),
    ...(memory.outputs ?? []),
    ...(memory.calls ?? []),
    ...((includeThoughts ? memory.thoughts : undefined) ?? []),
    ...(memory.results ?? []),
    ...(memory.events ?? []),
  ].sort((a, b) => (a.timestamp > b.timestamp ? 1 : -1));
}

export function getWorkingMemoryAllLogs(
  memory: Partial<WorkingMemory>,
  includeThoughts = true
): AnyRef[] {
  return [
    ...(memory.inputs ?? []),
    ...(memory.outputs ?? []),
    ...(memory.calls ?? []),
    ...((includeThoughts ? memory.thoughts : undefined) ?? []),
    ...(memory.results ?? []),
    ...(memory.events ?? []),
    ...(memory.steps ?? []),
    ...(memory.runs ?? []),
  ].sort((a, b) => (a.timestamp >= b.timestamp ? 1 : -1));
}

export function formatWorkingMemory({
  memory,
  processed,
  size,
}: {
  memory: Partial<WorkingMemory>;
  processed: boolean;
  size?: number;
}) {
  let logs = getWorkingMemoryLogs(memory, false).filter(
    (i) => i.processed === processed
  );

  if (size) {
    logs = logs.slice(-size);
  }

  return logs.map((i) => formatContextLog(i)).flat();
}

/**
 * Creates a default working memory object
 * @returns Empty working memory with initialized arrays
 */
export function createWorkingMemory(): WorkingMemory {
  return {
    inputs: [],
    outputs: [],
    thoughts: [],
    calls: [],
    results: [],
    runs: [],
    steps: [],
    events: [],
  };
}

export function pushToWorkingMemory(workingMemory: WorkingMemory, ref: AnyRef) {
  if (!workingMemory || !ref) {
    throw new Error("workingMemory and ref must not be null or undefined");
  }

  switch (ref.ref) {
    case "action_call":
      workingMemory.calls.push(ref);
      break;
    case "action_result":
      workingMemory.results.push(ref);
      break;
    case "input":
      workingMemory.inputs.push(ref);
      break;
    case "output":
      workingMemory.outputs.push(ref);
      break;
    case "thought":
      workingMemory.thoughts.push(ref);
      break;
    case "event":
      workingMemory.events.push(ref);
      break;
    case "step":
      workingMemory.steps.push(ref);
      break;
    case "run":
      workingMemory.runs.push(ref);
      break;
    default:
      throw new Error("invalid ref");
  }
}

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
 */
async function handleEpisodeHooks<TContext extends AnyContext>(
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
        context: contextId,
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

      // Also run fact and entity extraction if no custom episode creation
      if (!hooks?.createEpisode) {
        await tryLegacyExtraction(
          state.currentEpisodeLogs,
          contextState,
          agent
        );
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
 * Default episode start detection (when no hooks provided)
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
 * Default episode end detection (when no hooks provided)
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
 * Default episode creation (when no hooks provided)
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

/**
 * Legacy fact and entity extraction for default episodes
 */
async function tryLegacyExtraction<TContext extends AnyContext>(
  logs: AnyRef[],
  contextState: ContextState<TContext>,
  agent: AnyAgent
): Promise<void> {
  try {
    // Find input/output pairs for legacy extraction
    const inputs = logs.filter((log) => log.ref === "input");
    const outputs = logs.filter((log) => log.ref === "output");

    for (const output of outputs) {
      // Find matching input for this output
      const matchingInput = inputs
        .filter((input) => input.timestamp <= output.timestamp)
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      if (matchingInput) {
        await tryExtractFacts(matchingInput, output, contextState, agent);
        await tryExtractEntitiesAndRelationships(
          matchingInput,
          output,
          contextState,
          agent
        );
      }
    }
  } catch (error) {
    agent.logger.warn("context:episode", "Legacy extraction failed", {
      error: error instanceof Error ? error.message : error,
      contextId: contextState.id,
    });
  }
}

/**
 * Attempts to extract entities and relationships from conversation content
 */
async function tryExtractEntitiesAndRelationships<TContext extends AnyContext>(
  inputRef: any,
  outputRef: any,
  contextState: ContextState<TContext>,
  agent: AnyAgent
): Promise<void> {
  try {
    // Extract entities and relationships from both input and output content
    const inputContent =
      typeof inputRef.content === "string"
        ? inputRef.content
        : JSON.stringify(inputRef.content);
    const outputContent =
      typeof outputRef.content === "string"
        ? outputRef.content
        : JSON.stringify(outputRef.content);

    const conversationText = `${inputContent} ${outputContent}`;

    // Simple entity patterns - can be enhanced with NER
    const entityPatterns = [
      // People (proper names)
      /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g,
      // Organizations (capitalized words, often with Inc, Ltd, Corp, etc.)
      /\b[A-Z][a-zA-Z\s&]+(Inc|Ltd|Corp|Company|Organization|Agency|Department)\b/g,
      // Places (capitalized locations)
      /\b(?:in|at|from|to) ([A-Z][a-zA-Z\s]+)\b/g,
      // Products/Services (often quoted or capitalized)
      /\b[A-Z][a-zA-Z0-9\s]+(?:API|SDK|Platform|Service|System|Tool|App|Software)\b/g,
    ];

    const relationshipPatterns = [
      // "X is Y" relationships
      /([A-Z][a-zA-Z\s]+) is (?:a|an|the) ([a-zA-Z\s]+)/g,
      // "X works for Y" relationships
      /([A-Z][a-zA-Z\s]+) works (?:for|at) ([A-Z][a-zA-Z\s]+)/g,
      // "X created Y" relationships
      /([A-Z][a-zA-Z\s]+) (?:created|developed|built|made) ([A-Z][a-zA-Z\s]+)/g,
      // "X uses Y" relationships
      /([A-Z][a-zA-Z\s]+) (?:uses|utilizes|employs) ([A-Z][a-zA-Z\s]+)/g,
    ];

    const extractedEntities = new Set<string>();
    const extractedRelationships: Array<{
      from: string;
      to: string;
      type: string;
    }> = [];

    // Extract entities
    for (const pattern of entityPatterns) {
      let match;
      while ((match = pattern.exec(conversationText)) !== null) {
        const entity = match[1] || match[0];
        if (entity && entity.trim().length > 2) {
          extractedEntities.add(entity.trim());
        }
      }
    }

    // Extract relationships
    for (const pattern of relationshipPatterns) {
      let match;
      while ((match = pattern.exec(conversationText)) !== null) {
        const from = match[1]?.trim();
        const to = match[2]?.trim();
        if (from && to && from.length > 2 && to.length > 2) {
          // Determine relationship type based on the pattern used
          let relationshipType = "related_to";
          if (pattern.source.includes("is")) relationshipType = "is_a";
          else if (pattern.source.includes("works"))
            relationshipType = "works_for";
          else if (pattern.source.includes("created"))
            relationshipType = "created";
          else if (pattern.source.includes("uses")) relationshipType = "uses";

          extractedRelationships.push({
            from,
            to,
            type: relationshipType,
          });

          // Add entities from relationships
          extractedEntities.add(from);
          extractedEntities.add(to);
        }
      }
    }

    // Store entities and relationships using the unified memory API
    if (extractedEntities.size > 0 || extractedRelationships.length > 0) {
      await agent.memory.remember(
        {
          entities: Array.from(extractedEntities).map((name) => ({
            id: name.toLowerCase().replace(/\s+/g, "_"),
            type: "entity",
            name,
            properties: {
              source: "conversation",
              context: contextState.id,
              extractedAt: Date.now(),
            },
          })),
          relationships: extractedRelationships.map((rel) => ({
            id: `${rel.from}_${rel.type}_${rel.to}`
              .toLowerCase()
              .replace(/\s+/g, "_"),
            from: rel.from.toLowerCase().replace(/\s+/g, "_"),
            to: rel.to.toLowerCase().replace(/\s+/g, "_"),
            type: rel.type,
            properties: {
              source: "conversation",
              context: contextState.id,
              extractedAt: Date.now(),
            },
          })),
        },
        {
          type: "graph",
          context: contextState.id,
          metadata: {
            source: "conversation",
            inputId: inputRef.id,
            outputId: outputRef.id,
            entityCount: extractedEntities.size,
            relationshipCount: extractedRelationships.length,
          },
        }
      );

      agent.logger.debug(
        "context:graph",
        "Extracted entities and relationships",
        {
          contextId: contextState.id,
          entityCount: extractedEntities.size,
          relationshipCount: extractedRelationships.length,
          inputId: inputRef.id,
          outputId: outputRef.id,
        }
      );
    }
  } catch (error) {
    agent.logger.warn(
      "context:graph",
      "Failed to extract entities and relationships",
      {
        error: error instanceof Error ? error.message : error,
        contextId: contextState.id,
      }
    );
  }
}

/**
 * Attempts to extract and store facts from conversation content
 * @dev TODO: this should be a model...
 */
async function tryExtractFacts<TContext extends AnyContext>(
  inputRef: any,
  outputRef: any,
  contextState: ContextState<TContext>,
  agent: AnyAgent
): Promise<void> {
  try {
    // Extract facts from both input and output content
    const inputContent =
      typeof inputRef.content === "string"
        ? inputRef.content
        : JSON.stringify(inputRef.content);
    const outputContent =
      typeof outputRef.content === "string"
        ? outputRef.content
        : JSON.stringify(outputRef.content);

    // Look for factual patterns in the content
    const conversationText = `${inputContent} ${outputContent}`;

    // Simple fact patterns - can be enhanced with more sophisticated extraction
    const factualPatterns = [
      // Declarative statements
      /(?:^|\. )([A-Z][^.!?]*(?:is|are|was|were|has|have|had|will be|will have|can|could|should|would|must)[^.!?]*[.!?])/g,
      // Definitions
      /(?:^|\. )([A-Z][^.!?]*(?:means|refers to|is defined as|is called|is known as)[^.!?]*[.!?])/g,
      // Numerical facts
      /(?:^|\. )([A-Z][^.!?]*(?:\d+|numbers?|amounts?|costs?|prices?|dates?|years?)[^.!?]*[.!?])/g,
    ];

    const extractedFacts: string[] = [];

    for (const pattern of factualPatterns) {
      let match;
      while ((match = pattern.exec(conversationText)) !== null) {
        const fact = match[1].trim();
        if (fact.length > 10 && fact.length < 500) {
          // Reasonable fact length
          extractedFacts.push(fact);
        }
      }
    }

    // Store each extracted fact
    for (const factStatement of extractedFacts) {
      await agent.memory.remember(factStatement, {
        type: "fact",
        context: contextState.id,
        metadata: {
          source: "conversation",
          inputId: inputRef.id,
          outputId: outputRef.id,
          extractedAt: Date.now(),
          contextType: contextState.context.type,
        },
      });
    }

    if (extractedFacts.length > 0) {
      agent.logger.debug("context:facts", "Extracted facts from conversation", {
        contextId: contextState.id,
        factCount: extractedFacts.length,
        inputId: inputRef.id,
        outputId: outputRef.id,
      });
    }
  } catch (error) {
    agent.logger.warn("context:facts", "Failed to extract facts", {
      error: error instanceof Error ? error.message : error,
      contextId: contextState.id,
    });
  }
}

/**
 * Pushes entry to working memory and applies memory management if configured
 */
export async function pushToWorkingMemoryWithManagement<
  TContext extends AnyContext
>(
  workingMemory: WorkingMemory,
  ref: AnyRef,
  contextState: ContextState<TContext>,
  agent: AnyAgent
): Promise<WorkingMemory> {
  pushToWorkingMemory(workingMemory, ref);

  // Handle episode detection and storage using hooks
  await handleEpisodeHooks(workingMemory, ref, contextState, agent);

  return workingMemory;
}

/**
 * Counts total entries in working memory
 */
export function getWorkingMemorySize(workingMemory: WorkingMemory): number {
  return (
    workingMemory.inputs.length +
    workingMemory.outputs.length +
    workingMemory.thoughts.length +
    workingMemory.calls.length +
    workingMemory.results.length +
    workingMemory.runs.length +
    workingMemory.steps.length +
    workingMemory.events.length
  );
}

/**
 * Default working memory config
 * Provides a memory container with standard working memory structure
 */
export const defaultWorkingMemory = memory<WorkingMemory>({
  key: "working-memory",
  create: createWorkingMemory,
});

export function getContextId<TContext extends AnyContext>(
  context: TContext,
  args: z.infer<TContext["schema"]>
) {
  const key = context.key ? context.key(args) : undefined;
  return key ? [context.type, key].join(":") : context.type;
}

export async function createContextState<TContext extends AnyContext>({
  agent,
  context,
  args,
  contexts = [],
  settings: initialSettings = {},
}: {
  agent: AnyAgent;
  context: TContext;
  args: InferSchemaArguments<TContext["schema"]>;
  contexts?: string[];
  settings?: ContextSettings;
}): Promise<ContextState<TContext>> {
  const key = context.key ? context.key(args) : undefined;
  const id = key ? [context.type, key].join(":") : context.type;

  // Log structured context create event if structured logger is available
  const structuredLogger =
    agent.container?.resolve<StructuredLogger>("structuredLogger");
  if (structuredLogger) {
    structuredLogger.logEvent({
      eventType: LogEventType.CONTEXT_CREATE,
      timestamp: Date.now(),
      requestContext: {
        requestId: "context-create", // Default since we may not have request context
        trackingEnabled: false,
      },
      contextType: context.type,
      contextId: id,
      argsHash: key,
    });
  }

  const settings: ContextSettings = {
    model: context.model,
    maxSteps: context.maxSteps,
    maxWorkingMemorySize: context.maxWorkingMemorySize,
    modelSettings: {
      ...(agent.modelSettings || {}),
      ...(context.modelSettings || {}),
      ...(initialSettings.modelSettings || {}),
    },
    ...initialSettings,
  };

  const options = context.setup
    ? await context.setup(args, settings, agent)
    : {};

  const memory =
    (context.load
      ? await context.load(id, { options, settings })
      : await agent.memory.kv.get(`memory:${id}`)) ??
    (context.create
      ? await Promise.try(
          context.create,
          { key, args, id, options, settings },
          agent
        )
      : {});

  return {
    id,
    key,
    args,
    options,
    context,
    memory,
    settings,
    contexts,
  };
}

export async function getContextWorkingMemory(
  agent: AnyAgent,
  contextId: string
) {
  let workingMemory = await agent.memory.kv.get<WorkingMemory>(
    ["working-memory", contextId].join(":")
  );

  if (!workingMemory) {
    workingMemory = await defaultWorkingMemory.create();
    await agent.memory.kv.set(
      ["working-memory", contextId].join(":"),
      workingMemory
    );
  }

  return workingMemory;
}

export async function saveContextWorkingMemory(
  agent: AnyAgent,
  contextId: string,
  workingMemory: WorkingMemory
) {
  return await agent.memory.kv.set(
    ["working-memory", contextId].join(":"),
    workingMemory
  );
}

type ContextStateSnapshot = {
  id: string;
  type: string;
  args: any;
  key?: string;
  settings: Omit<ContextSettings, "model"> & { model?: string };
  contexts: string[];
};

export async function saveContextState(agent: AnyAgent, state: ContextState) {
  const { id, context, key, args, settings, contexts } = state;

  // Log structured context update event
  const structuredLogger =
    agent.container?.resolve<StructuredLogger>("structuredLogger");
  if (structuredLogger) {
    structuredLogger.logEvent({
      eventType: LogEventType.CONTEXT_UPDATE,
      timestamp: Date.now(),
      requestContext: {
        requestId: "context-save", // Default since we may not have request context
        trackingEnabled: false,
      },
      contextType: context.type,
      contextId: id,
      updateType: "state",
      details: {
        hasMemory: !!state.memory,
        contextCount: contexts.length,
        hasCustomSave: !!state.context.save,
      },
    });
  }

  await agent.memory.kv.set<ContextStateSnapshot>(`context:${id}`, {
    id,
    type: context.type,
    key,
    args,
    settings: {
      ...settings,
      model: settings.model?.modelId,
    },
    contexts,
  });

  if (state.context.save) {
    await state.context.save(state);
  } else {
    await agent.memory.kv.set<any>(`memory:${id}`, state.memory);
  }
}
export async function loadContextState(
  agent: AnyAgent,
  context: AnyContext,
  contextId: string
): Promise<Omit<ContextState, "options" | "memory"> | null> {
  const state = await agent.memory.kv.get<ContextStateSnapshot>(
    `context:${contextId}`
  );

  if (!state) return null;

  return {
    ...state,
    context,
    settings: {
      ...state?.settings,
      // todo: agent resolve model?
      model: undefined,
    },
  };
}

export async function saveContextsIndex(
  agent: AnyAgent,
  contextIds: Set<string>
) {
  await agent.memory.kv.set<string[]>(
    "contexts",
    Array.from(contextIds.values())
  );
}

function getContextData(
  contexts: Map<string, ContextState>,
  contextId: string
) {
  // todo: verify type?
  if (contexts.has(contextId)) {
    const state = contexts.get(contextId)!;
    return {
      id: contextId,
      type: state.context.type,
      key: state.key,
      args: state.args,
      settings: state.settings,
    };
  }

  const [type, key] = contextId.split(":");

  return {
    id: contextId,
    type,
    key,
  };
}

export function getContexts(
  contextIds: Set<string>,
  contexts: Map<string, ContextState>
) {
  return Array.from(contextIds.values())
    .filter((t) => !!t)
    .map((id) => getContextData(contexts, id));
}

export async function deleteContext(agent: AnyAgent, contextId: string) {
  await agent.memory.kv.delete(`context:${contextId}`);
  await agent.memory.kv.delete(`memory:${contextId}`);
  await agent.memory.kv.delete(`working-memory:${contextId}`);
  
  // Clean up episode state to prevent memory leak
  episodeState.delete(contextId);
}
