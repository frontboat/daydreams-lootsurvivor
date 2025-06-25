import {
  createDreams,
  context,
  action,
  tokenLimiter,
  smartMemoryManager,
  contextAwareManager,
  fifoManager,
  hybridManager,
  type MemoryManager,
} from "@daydreamsai/core";
import { openai } from "@ai-sdk/openai";

const gpt4 = openai("gpt-4o-mini");

/**
 * Example 1: Token-based memory management
 * Automatically manages memory based on estimated token count
 */
const tokenManagedContext = context({
  type: "token-managed",
  memoryManager: tokenLimiter(4000), // Keep under 4k tokens

  async create() {
    return {
      tasksCompleted: [],
      currentFocus: "Getting started",
    };
  },
});

/**
 * Example 2: Smart AI-powered memory compression
 * Uses LLM to intelligently summarize old conversations
 */
const smartContext = context({
  type: "smart-context",
  memoryManager: smartMemoryManager({
    maxSize: 50,
    preserveImportant: true,
  }),

  async create() {
    return {
      projectName: "AI Assistant",
      goals: [],
      completedTasks: [],
    };
  },
});

/**
 * Example 4: Context-aware memory management
 * Preserves information relevant to specific tasks/keywords
 */
const projectContext = context({
  type: "project-context",
  memoryManager: contextAwareManager({
    maxSize: 100,
    taskKeywords: ["implementation", "analysis", "design", "testing"],
    preserveErrors: true,
  }),

  async create() {
    return {
      projectPhase: "planning",
      requirements: [],
      blockers: [],
    };
  },
});

/**
 * Example 5: Custom memory management
 * Build your own memory management logic
 */
const customMemoryManager: MemoryManager = {
  maxSize: 60,
  strategy: "custom",

  async shouldPrune(ctx, workingMemory, newEntry, agent) {
    // Custom logic: prune when we have too many errors
    const errorCount = workingMemory.results.filter(
      (r) => "error" in r && r.error
    ).length;
    return errorCount > 5;
  },

  async onMemoryPressure(ctx, workingMemory, agent) {
    console.log(`Memory pressure in context ${ctx.id}`);

    // Keep only successful actions and recent messages
    const successfulResults = workingMemory.results.filter(
      (r) => !("error" in r && r.error)
    );
    const recentInputs = workingMemory.inputs.slice(-10);
    const recentOutputs = workingMemory.outputs.slice(-10);

    return {
      ...workingMemory,
      inputs: recentInputs,
      outputs: recentOutputs,
      results: successfulResults,
      thoughts: workingMemory.thoughts.slice(-5),
      calls: workingMemory.calls.slice(-10),
      events: [],
      runs: workingMemory.runs.slice(-3),
      steps: workingMemory.steps.slice(-3),
    };
  },

  async compress(ctx, entries, agent) {
    const actionCount = entries.filter((e) => e.ref === "action_call").length;
    const messageCount = entries.filter(
      (e) => e.ref === "input" || e.ref === "output"
    ).length;
    return `Archived ${entries.length} entries: ${messageCount} messages, ${actionCount} actions`;
  },

  preserve: {
    recentInputs: 5,
    recentOutputs: 5,
    actionNames: ["critical_action", "save_progress"],
  },
};

const customContext = context({
  type: "custom-context",
  memoryManager: customMemoryManager,

  async create() {
    return { customData: "important info" };
  },
});

/**
 * Example 6: Hybrid memory management
 * Combines multiple strategies for robust memory handling
 */
const robustContext = context({
  type: "robust-context",
  memoryManager: hybridManager({
    primary: smartMemoryManager({ maxSize: 80 }),
    fallback: fifoManager({
      maxSize: 40,
      preserveInputs: 5,
      preserveOutputs: 5,
    }),
    useTokenLimit: 6000,
  }),

  async create() {
    return {
      sessionId: Date.now().toString(),
      criticalData: [],
    };
  },
});
