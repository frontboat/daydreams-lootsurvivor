import {
  createDreams,
  context,
  action,
  LogLevel,
  input,
  output,
  type EpisodeHooks,
} from "@daydreamsai/core";
import { openai } from "@ai-sdk/openai";
import * as z from "zod";
import * as readline from "readline";
import { createChromaMemory } from "@daydreamsai/chroma";

const personalAssistantHooks: EpisodeHooks = {
  // Start episode when user begins a new conversation
  shouldStartEpisode: (ref) => {
    return ref.ref === "input" && ref.type === "text";
  },

  // End episode when conversation naturally concludes or user says goodbye
  shouldEndEpisode: (ref) => {
    if (ref.ref !== "output") {
      console.log("Early return: not output or not processed");
      return false;
    }

    // Check both content and data fields for output text
    const content = (ref.content || ref.data || "").toString().toLowerCase();

    const isGoodbye =
      content.includes("Goodbye") ||
      content.includes("goodbye") ||
      content.includes("Goodbye!") ||
      content.includes("see you") ||
      content.includes("bye");
    const isTaskComplete =
      content.includes("anything else") ||
      content.includes("help you with") ||
      content.includes("thank you");

    return isGoodbye || isTaskComplete;
  },

  // Create structured episode data for personal assistant interactions
  createEpisode: (logs, ctx) => {
    const userInputs = logs.filter((l) => l.ref === "input");
    const assistantOutputs = logs.filter((l) => l.ref === "output");
    const actions = logs.filter((l) => l.ref === "action_call");

    const nameActions = actions.filter((a) => a.name === "remember-name");
    const preferenceActions = actions.filter(
      (a) => a.name === "save-preference"
    );
    const topicActions = actions.filter((a) => a.name === "update-topic");

    return {
      type: "personal_assistant_session",
      user: {
        id: ctx.args?.userId,
        messageCount: userInputs.length,
        firstMessage: userInputs[0]?.content,
        lastMessage: userInputs[userInputs.length - 1]?.content,
        learnedName: nameActions.length > 0,
        savedPreferences: preferenceActions.length,
      },
      assistant: {
        messageCount: assistantOutputs.length,
        actionsUsed: actions.map((a) => a.name),
        personalizedResponses: nameActions.length + preferenceActions.length,
      },
      session: {
        startTime: logs[0]?.timestamp,
        endTime: logs[logs.length - 1]?.timestamp,
        totalExchanges: Math.min(userInputs.length, assistantOutputs.length),
        memoryUpdates:
          nameActions.length + preferenceActions.length + topicActions.length,
        duration: logs[logs.length - 1]?.timestamp - logs[0]?.timestamp,
      },
      summary: `Personal assistant session: ${
        userInputs.length
      } user messages, ${actions.length} memory actions, ${Math.round(
        (logs[logs.length - 1]?.timestamp - logs[0]?.timestamp) / 1000
      )}s duration`,
    };
  },

  // Classify episodes based on personal assistant interactions
  classifyEpisode: (episodeData) => {
    if (episodeData.user?.learnedName || episodeData.user?.savedPreferences > 0)
      return "learning";
    if (episodeData.session?.totalExchanges > 5) return "extended";
    if (episodeData.assistant?.personalizedResponses > 0) return "personalized";
    return "standard";
  },

  // Extract metadata for personal assistant analytics
  extractMetadata: (episodeData, logs, ctx) => ({
    userId: ctx.args?.userId,
    sessionType: episodeData.user?.learnedName ? "onboarding" : "regular",
    interactionCount: episodeData.session?.totalExchanges || 0,
    memoryActions: episodeData.session?.memoryUpdates || 0,
    duration: episodeData.session?.duration || 0,
    engagement: episodeData.session?.totalExchanges > 3 ? "high" : "low",
    personalization:
      episodeData.assistant?.personalizedResponses > 0 ? "yes" : "no",
  }),
};

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

  episodeHooks: personalAssistantHooks,
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
- Be helpful and personalized based on what you know

always end the conversation with a goodbye
`,

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
