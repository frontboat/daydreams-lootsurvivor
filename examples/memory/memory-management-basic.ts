import {
  createDreams,
  context,
  action,
  tokenLimiter,
  smartMemoryManager,
} from "@daydreamsai/core";
import { openai } from "@ai-sdk/openai";
import * as z from "zod/v4";

const gpt4 = openai("gpt-4o-mini");

/**
 * Basic Example: Memory Management
 * Shows how to add memory management to prevent context overload
 */

// 1. Create a context with token-based memory management
const chatContext = context({
  type: "chat",

  // This prevents context overload by limiting memory to ~8k tokens
  memoryManager: tokenLimiter(8000),

  async create() {
    return {
      conversationTopic: null,
      userPreferences: {},
    };
  },
});

// 2. Create a context with smart AI compression
const assistantContext = context({
  type: "assistant",

  // This uses AI to intelligently summarize old conversations
  memoryManager: smartMemoryManager({
    maxSize: 100, // Keep 100 recent entries
    preserveImportant: true, // Preserve important context
  }),

  async create() {
    return {
      taskHistory: [],
      currentProject: null,
    };
  },
});

// 3. Create a context with custom memory management
const projectContext = context({
  type: "project",

  memoryManager: {
    maxSize: 50,
    strategy: "custom",

    // Custom logic for when to prune memory
    async shouldPrune(ctx, workingMemory, newEntry) {
      // Prune when we have too many failed actions
      const failedActions = workingMemory.results.filter(
        (r) => "error" in r && r.error
      );
      return failedActions.length > 5;
    },

    // Custom memory pressure handling
    async onMemoryPressure(ctx, workingMemory) {
      console.log(`Managing memory for project: ${ctx.memory.projectName}`);

      // Keep only successful actions and recent messages
      return {
        ...workingMemory,
        inputs: workingMemory.inputs.slice(-10),
        outputs: workingMemory.outputs.slice(-10),
        results: workingMemory.results.filter(
          (r) => !("error" in r && r.error)
        ),
        calls: workingMemory.calls.slice(-15),
        thoughts: workingMemory.thoughts.slice(-5),
        events: [],
        runs: workingMemory.runs.slice(-3),
        steps: workingMemory.steps.slice(-3),
      };
    },

    preserve: {
      recentInputs: 5,
      recentOutputs: 5,
      actionNames: ["save_progress", "create_milestone"],
    },
  },

  async create() {
    return {
      projectName: "AI Development",
      milestones: [],
      blockers: [],
    };
  },
});

// Example actions
const searchAction = action({
  name: "search",
  description: "Search for information",
  schema: z.object({ query: z.string() }),
  handler: async ({ query }) => {
    return `Found information about: ${query}`;
  },
});

const analyzeAction = action({
  name: "analyze",
  description: "Analyze data",
  schema: z.object({ data: z.string() }),
  handler: async ({ data }) => {
    return `Analysis complete for: ${data}`;
  },
});

const saveProgressAction = action({
  name: "save_progress",
  description: "Save current progress",
  schema: z.object({ progress: z.string() }),
  handler: async ({ progress }) => {
    return `Progress saved: ${progress}`;
  },
});

async function runBasicExample() {
  // Create agent with memory management
  const agent = await createDreams({
    model: gpt4,
    contexts: [chatContext, assistantContext, projectContext],
    actions: [searchAction, analyzeAction, saveProgressAction],
  }).start();

  console.log("🚀 Starting memory management demo...\n");

  // Test token-limited context
  console.log("=== Token-Limited Chat ===");
  await agent.run({
    context: chatContext,
    args: {},
    chain: [
      {
        id: "user-1",
        ref: "input",
        type: "text",
        content:
          "Help me research AI developments and create a comprehensive analysis. I want to understand current trends, key players, and future directions.",
        data: {},
        timestamp: Date.now(),
        processed: false,
      },
    ],
  });

  // Test smart compression context
  console.log("\n=== Smart Compression Assistant ===");
  await agent.run({
    context: assistantContext,
    args: {},
    chain: [
      {
        id: "user-2",
        ref: "input",
        type: "text",
        content:
          "I'm working on a complex project that requires multiple research phases, analysis steps, and final documentation. Can you help me break this down and execute each phase?",
        data: {},
        timestamp: Date.now(),
        processed: false,
      },
    ],
  });

  // Test custom memory management
  console.log("\n=== Custom Project Management ===");
  await agent.run({
    context: projectContext,
    args: {},
    chain: [
      {
        id: "user-3",
        ref: "input",
        type: "text",
        content:
          "Let's work on our AI development project. Search for best practices, analyze our current approach, and save our progress regularly.",
        data: {},
        timestamp: Date.now(),
        processed: false,
      },
    ],
  });

  // Check memory usage
  console.log("\n=== Memory Usage Report ===");
  const chatMemory = await agent.getWorkingMemory("chat");
  const assistantMemory = await agent.getWorkingMemory("assistant");
  const projectMemory = await agent.getWorkingMemory("project");

  console.log(`Chat context: ${getTotalEntries(chatMemory)} entries`);
  console.log(`Assistant context: ${getTotalEntries(assistantMemory)} entries`);
  console.log(`Project context: ${getTotalEntries(projectMemory)} entries`);

  // Check for memory summaries
  if (
    assistantMemory.thoughts.some((t) => t.content.includes("[Memory Summary]"))
  ) {
    console.log("✓ Assistant created intelligent memory summaries");
  }

  if (chatMemory.inputs.length < 20) {
    console.log("✓ Chat context stayed within token limits");
  }

  await agent.stop();
  console.log("\n✨ Memory management demo complete!");
}

function getTotalEntries(memory: any): number {
  return (
    memory.inputs.length +
    memory.outputs.length +
    memory.thoughts.length +
    memory.calls.length +
    memory.results.length +
    memory.events.length +
    memory.runs.length +
    memory.steps.length
  );
}

// Run the example
if (require.main === module) {
  runBasicExample().catch(console.error);
}

export { chatContext, assistantContext, projectContext, runBasicExample };
