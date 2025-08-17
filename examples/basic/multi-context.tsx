import {
  createDreams,
  context,
  action,
  LogLevel,
  input,
  output,
} from "@daydreamsai/core";
import { openai } from "@ai-sdk/openai";
import * as z from "zod";
import * as readline from "readline";

// CONTEXT ACTION PATTERN:
// Option 1: Define actions directly in context config (recommended)
// Option 2: Use .setActions() BEFORE creating the agent (shown here)
// Option 3: Don't pre-register contexts in createDreams()

// Define what our assistant remembers about each user
interface AssistantMemory {
  userName?: string;
  preferences: Record<string, any>;
  conversationCount: number;
  lastTopic?: string;
}

// Create a context - this is where the magic happens!
const assistantContext = context<AssistantMemory>({
  type: "personal-assistant",

  // Each user gets their own context instance
  schema: z.object({
    userId: z.string().describe("Unique identifier for the user"),
  }),

  // Initialize memory for new users
  create: () => ({
    preferences: {},
    conversationCount: 0,
  }),

  // Define what the LLM sees about this context
  render: (state) => {
    const { userName, conversationCount, lastTopic, preferences } =
      state.memory;

    return `
Personal Assistant for User: ${state.args.userId}
${userName ? `Name: ${userName}` : "Name: Unknown (ask for their name!)"}
Conversations: ${conversationCount}
${lastTopic ? `Last topic: ${lastTopic}` : ""}
${
  Object.keys(preferences).length > 0
    ? `Preferences: ${JSON.stringify(preferences, null, 2)}`
    : "No preferences saved yet"
}
    `.trim();
  },

  // Instructions that guide the assistant's behavior
  instructions: `You are a personal assistant with memory. You should:
- Remember information about the user across conversations
- Ask for their name if you don't know it
- Learn their preferences over time
- Reference previous conversations when relevant
- Be helpful and personalized based on what you know`,

  // Track conversation count
  onRun: async (ctx) => {
    ctx.memory.conversationCount++;
  },
}).setActions([
  action({
    name: "remember-name",
    description: "Remember the user's name",
    schema: z.object({
      name: z.string().describe("The user's name"),
    }),
    handler: async ({ name }, ctx) => {
      ctx.memory.userName = name;
      return {
        remembered: true,
        message: `I'll remember your name is ${name}`,
      };
    },
  }),

  action({
    name: "save-preference",
    description: "Save a user preference",
    schema: z.object({
      key: z.string().describe("Preference category"),
      value: z.string().describe("Preference value"),
    }),
    handler: async ({ key, value }, ctx) => {
      ctx.memory.preferences[key] = value;
      return {
        saved: true,
        message: `Noted! Your ${key} preference is ${value}`,
      };
    },
  }),

  action({
    name: "update-topic",
    description: "Remember what we're discussing",
    schema: z.object({
      topic: z.string().describe("Current conversation topic"),
    }),
    handler: async ({ topic }, ctx) => {
      ctx.memory.lastTopic = topic;
      return { updated: true };
    },
  }),
]);

// IMPORTANT: setActions() must be called BEFORE creating the agent
// Otherwise, the agent will register the context without actions

// Define text input handler
const textInput = input({
  description: "Text input from the user",
  schema: z.string(),
});

// Define text output handler
const textOutput = output({
  description: "Text response to the user",
  schema: z.string(),
});

// Create the agent
const agent = createDreams({
  logLevel: LogLevel.TRACE,
  model: openai("gpt-4o"),
  contexts: [assistantContext],
  inputs: {
    text: textInput,
  },
  outputs: {
    text: textOutput,
  },
});

// 📊 SimpleTracker is now built into every agent by default!
// No setup required - analytics are automatically available via agent.tracker

// Start the interactive CLI
async function main() {
  await agent.start();

  console.log("\n🤖 Personal Assistant Started!");
  console.log("💡 Try telling me your name or preferences.");
  console.log("💡 Exit and restart - I'll still remember you!");
  console.log("💡 Type 'analytics' to see usage statistics");
  console.log("💡 Type 'exit' to quit\n");

  // Simulate different users with different context instances
  const userId = process.argv[2] || "default-user";
  console.log(`Starting session for user: ${userId}\n`);

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  // Function to handle user input
  async function handleInput(input: string) {
    if (input.toLowerCase() === "exit") {
      console.log("\n👋 See you next time!");
      rl.close();
      process.exit(0);
    }

    // 📊 NEW: Show analytics with SimpleTracker
    if (input.toLowerCase() === "analytics") {
      console.log("\n📊 === USAGE ANALYTICS ===");

      // Get overall analytics (automatically extracted from events!)
      const analytics = agent.tracker.getAnalytics();
      console.log(`💰 Total cost: $${analytics.totalCost.toFixed(4)}`);
      console.log(`🔤 Total tokens: ${analytics.totalTokens.toLocaleString()}`);
      console.log(
        `✅ Success rate: ${(analytics.successRate * 100).toFixed(1)}%`
      );
      console.log(
        `⏱️  Average response time: ${analytics.averageResponseTime.toFixed(
          0
        )}ms`
      );

      // Show user-specific analytics
      const userActivity = agent.tracker.getUserActivity(userId);
      console.log(`\n👤 User ${userId} Activity:`);
      console.log(`📝 Total requests: ${userActivity.totalRequests}`);
      console.log(`💰 Total cost: $${userActivity.totalCost.toFixed(4)}`);
      console.log(
        `⏱️  Average response time: ${userActivity.averageResponseTime.toFixed(
          0
        )}ms`
      );

      // Show cost breakdown by model and action
      if (Object.keys(analytics.costByModel).length > 0) {
        console.log(`\n🤖 Cost by Model:`, analytics.costByModel);
      }
      if (Object.keys(analytics.costByAction).length > 0) {
        console.log(`⚡ Cost by Action:`, analytics.costByAction);
      }

      console.log(`\n🎯 Benefits of Built-in SimpleTracker:`);
      console.log(`• Zero setup - tracking is built into every agent`);
      console.log(`• Automatic analytics from events`);
      console.log(`• 90% less code than old system`);
      console.log(`• Real-time metrics without complexity`);
      console.log(`• Access via agent.tracker property`);

      rl.prompt();
      return;
    }

    try {
      // Send the message with the proper context
      const result = await agent.send({
        context: assistantContext,
        args: { userId },
        input: { type: "text", data: input },
      });

      // Extract and display the assistant's response
      const output = result.find((r) => r.ref === "output");
      if (output && "data" in output) {
        console.log("\n🤖:", output.data);
      }
    } catch (error) {
      console.error("Error:", error);
    }

    // Show prompt again
    rl.prompt();
  }

  // Handle line input
  rl.on("line", handleInput);

  // Show initial prompt
  rl.prompt();
}

main().catch(console.error);
