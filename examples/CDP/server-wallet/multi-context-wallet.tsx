/**
 * 🌟 Multi-Context Example with Wallet Integration
 *
 * This example extends the multi-context pattern to include Coinbase wallet functionality.
 * It demonstrates how Daydreams' context composition enables sophisticated agent behaviors
 * by combining analytics, profile, and wallet management in a single assistant.
 *
 * What's included:
 * 1. Analytics Context - Tracks user interactions and events
 * 2. Profile Context - Manages user profile data and settings
 * 3. Wallet Context - Manages Coinbase wallets and transactions
 * 4. Assistant Context - Main context that composes all the above
 *
 * Key Features Demonstrated:
 * - Context composition with .use() method
 * - Coinbase CDP SDK integration for wallet management
 * - Shared actions across composed contexts
 * - Separate memory spaces for each context
 * - Real cryptocurrency operations on testnet
 *
 * The assistant has access to ALL actions from composed contexts:
 * - track-event, get-interaction-stats (from analytics)
 * - update-profile, upgrade-tier (from profile)
 * - create-wallet, check-balance, send-transaction, request-faucet (from wallet)
 * - update-topic, set-mood (its own actions)
 *
 * Try these commands:
 * - "Create a wallet for me" - Creates a new Coinbase wallet
 * - "Check my balance" - Shows current wallet balance
 * - "Request test funds" - Gets testnet ETH from faucet
 * - "Send 0.001 ETH to 0x..." - Sends a transaction
 * - "Show my transactions" - Lists transaction history
 * - "My name is Alice" - Updates profile
 * - "analytics" - Shows usage statistics
 * - "wallet" - Shows wallet status
 *
 * REQUIRED Environment Variables - Coinbase Developer Platform (CDP) Credentials from: https://portal.cdp.coinbase.com/
 * - CDP_API_KEY_ID
 * - CDP_API_KEY_SECRET
 * - CDP_WALLET_SECRET
 * - DREAMSROUTER_API_KEY
 */

import {
  createDreams,
  context,
  action,
  LogLevel,
  input,
  output,
  type EpisodeHooks,
} from "@daydreamsai/core";

import * as z from "zod";
import * as readline from "readline";
import * as dotenv from "dotenv";

import { dreamsrouter } from "@daydreamsai/ai-sdk-provider";

// Import our wallet context
import { walletContext } from "../server-wallet/wallet-context";

// Load environment variables
dotenv.config();

// Check for required CDP credentials
if (!process.env.CDP_API_KEY_ID || !process.env.CDP_API_KEY_SECRET) {
  console.warn(
    "⚠️  Warning: CDP_API_KEY_ID and CDP_API_KEY_SECRET not found in environment variables"
  );
  console.warn(
    "⚠️  Wallet functionality will not work without these credentials"
  );
  console.warn("⚠️  Get your API keys from: https://portal.cdp.coinbase.com/");
}

const personalAssistantHooks: EpisodeHooks = {
  // Start episode when user begins a new conversation
  shouldStartEpisode: (ref) => {
    return ref.ref === "input" && ref.type === "text";
  },

  // End episode when conversation naturally concludes or user says goodbye
  shouldEndEpisode: (ref) => {
    if (ref.ref !== "output") {
      return false;
    }

    const content = (ref.content || ref.data || "").toString().toLowerCase();

    const isGoodbye =
      content.includes("goodbye") ||
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

    // Track wallet-specific actions
    const walletActions = actions.filter((a) =>
      [
        "create-wallet",
        "check-balance",
        "send-transaction",
        "request-faucet",
      ].includes(a.name)
    );

    return {
      type: "personal_assistant_session",
      user: {
        id: ctx.args?.userId,
        messageCount: userInputs.length,
        firstMessage: userInputs[0]?.content,
        lastMessage: userInputs[userInputs.length - 1]?.content,
      },
      assistant: {
        messageCount: assistantOutputs.length,
        actionsUsed: actions.map((a) => a.name),
        walletActionsCount: walletActions.length,
      },
      session: {
        startTime: logs[0]?.timestamp,
        endTime: logs[logs.length - 1]?.timestamp,
        totalExchanges: Math.min(userInputs.length, assistantOutputs.length),
        duration: logs[logs.length - 1]?.timestamp - logs[0]?.timestamp,
      },
      summary: `Session: ${userInputs.length} messages, ${
        actions.length
      } actions (${walletActions.length} wallet), ${Math.round(
        (logs[logs.length - 1]?.timestamp - logs[0]?.timestamp) / 1000
      )}s duration`,
    };
  },

  // Classify episodes based on interactions
  classifyEpisode: (episodeData) => {
    if (episodeData.assistant?.walletActionsCount > 0) return "financial";
    if (episodeData.session?.totalExchanges > 5) return "extended";
    if (episodeData.assistant?.personalizedResponses > 0) return "personalized";
    return "standard";
  },

  // Extract metadata for analytics
  extractMetadata: (episodeData, _logs, ctx) => ({
    userId: ctx.args?.userId,
    sessionType:
      episodeData.assistant?.walletActionsCount > 0 ? "wallet" : "regular",
    interactionCount: episodeData.session?.totalExchanges || 0,
    walletActions: episodeData.assistant?.walletActionsCount || 0,
    duration: episodeData.session?.duration || 0,
    engagement: episodeData.session?.totalExchanges > 3 ? "high" : "low",
  }),
};

// Define what our analytics context tracks
interface AnalyticsMemory {
  events: Array<{
    type: string;
    timestamp: number;
    data?: any;
  }>;
  totalInteractions: number;
  lastActive: number;
}

// Analytics context for tracking user behavior
const analyticsContext = context({
  type: "analytics",
  schema: z.object({
    userId: z.string().describe("User to track analytics for"),
  }),
  create: (): AnalyticsMemory => ({
    events: [],
    totalInteractions: 0,
    lastActive: Date.now(),
  }),
  render: (state) =>
    `
Analytics for user: ${state.args.userId}
Total interactions: ${state.memory.totalInteractions}
Last active: ${new Date(state.memory.lastActive).toLocaleString()}
Recent events: ${state.memory.events
      .slice(-3)
      .map((e) => e.type)
      .join(", ")}
  `.trim(),
}).setActions([
  action({
    name: "track-event",
    description: "Track a user interaction event",
    schema: z.object({
      eventType: z.string().describe("Type of event"),
      data: z.any().optional().describe("Additional event data"),
    }),
    handler: async ({ eventType, data }, ctx) => {
      ctx.memory.events.push({
        type: eventType,
        timestamp: Date.now(),
        data,
      });
      ctx.memory.totalInteractions++;
      ctx.memory.lastActive = Date.now();
      return { tracked: true, eventId: ctx.memory.events.length };
    },
  }),
  action({
    name: "get-interaction-stats",
    description: "Get user interaction statistics",
    schema: z.object({}),
    handler: async (_, ctx) => {
      const last24h = Date.now() - 24 * 60 * 60 * 1000;
      const recentEvents = ctx.memory.events.filter(
        (e) => e.timestamp > last24h
      );
      return {
        totalInteractions: ctx.memory.totalInteractions,
        recentInteractions: recentEvents.length,
        eventTypes: [...new Set(ctx.memory.events.map((e) => e.type))],
      };
    },
  }),
]);

// Define what our profile context stores
interface ProfileMemory {
  name?: string;
  tier: "free" | "premium";
  joinedAt: number;
  settings: {
    language?: string;
    timezone?: string;
    notifications?: boolean;
  };
}

// Profile context for user profile management
const profileContext = context({
  type: "profile",
  schema: z.object({
    userId: z.string().describe("User profile to manage"),
  }),
  create: (): ProfileMemory => ({
    tier: "free",
    joinedAt: Date.now(),
    settings: {},
  }),
  render: (state) =>
    `
User Profile: ${state.args.userId}
Name: ${state.memory.name || "Not set"}
Tier: ${state.memory.tier}
Member since: ${new Date(state.memory.joinedAt).toLocaleDateString()}
Settings: ${JSON.stringify(state.memory.settings)}
  `.trim(),
}).setActions([
  action({
    name: "update-profile",
    description: "Update user profile information",
    schema: z.object({
      name: z.string().optional(),
      language: z.string().optional(),
      timezone: z.string().optional(),
    }),
    handler: async ({ name, language, timezone }, ctx) => {
      if (name) ctx.memory.name = name;
      if (language) ctx.memory.settings.language = language;
      if (timezone) ctx.memory.settings.timezone = timezone;
      return { updated: true, profile: ctx.memory };
    },
  }),
  action({
    name: "upgrade-tier",
    description: "Upgrade user to premium tier",
    schema: z.object({}),
    handler: async (_, ctx) => {
      ctx.memory.tier = "premium";
      return { upgraded: true, message: "Welcome to premium!" };
    },
  }),
]);

// Define what our assistant remembers about each user
interface AssistantMemory {
  conversationCount: number;
  lastTopic?: string;
  mood?: string;
  hasWallet: boolean;
}

// Create a composed context with wallet functionality!
const assistantContext = context({
  type: "personal-assistant",
  episodeHooks: personalAssistantHooks,
  schema: z.object({
    userId: z.string().describe("Unique identifier for the user"),
    network: z
      .enum(["base-sepolia", "base", "ethereum", "polygon"])
      .optional()
      .default("base-sepolia")
      .describe("Network for wallet operations"),
  }),
  create: (): AssistantMemory => ({
    conversationCount: 0,
    lastTopic: "No topic",
    mood: "No mood",
    hasWallet: false,
  }),
  render: (state) => {
    const { conversationCount, lastTopic, mood, hasWallet } = state.memory;
    return `
Personal Assistant for User: ${state.args.userId}
Conversations: ${conversationCount}
${lastTopic ? `Last topic: ${lastTopic}` : ""}
${mood ? `Current mood: ${mood}` : ""}
Wallet Status: ${hasWallet ? "Created ✓" : "Not created"}
Network: ${state.args.network || "base-sepolia"}
    `.trim();
  },
  instructions: `You are a personal assistant with memory and wallet capabilities. You should:
- Track events when users share important information using track-event
- Update user profiles when they share personal details
- Help users create and manage their Coinbase wallets
- Be careful with financial transactions and always confirm details
- Reference previous conversations and analytics when relevant
- Be helpful and personalized based on what you know

For wallet operations:
- First create a wallet if the user doesn't have one
- On testnet (base-sepolia), freely use the faucet to get test funds
- Always show transaction hashes and explorer links when sending transactions
- Check balances before attempting to send funds
- Explain what you're doing with clear, simple language

Always end the conversation with a goodbye when the user is done.`,
  onRun: async (ctx) => {
    ctx.memory.conversationCount++;

    // We'll track wallet status differently
    // The wallet context will handle its own state
  },
})
  // 🌟 Compose all contexts including wallet!
  .use((state) => [
    // Analytics for tracking
    { context: analyticsContext, args: { userId: state.args.userId } },

    // Profile management
    { context: profileContext, args: { userId: state.args.userId } },

    // 💰 Wallet functionality
    {
      context: walletContext,
      args: {
        userId: state.args.userId,
        network: state.args.network || "base-sepolia",
      },
    },
  ])
  .setActions([
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
    action({
      name: "set-mood",
      description: "Track the user's current mood",
      schema: z.object({
        mood: z.string().describe("User's current mood"),
      }),
      handler: async ({ mood }, ctx) => {
        ctx.memory.mood = mood;
        return { updated: true, message: `Noted your mood as ${mood}` };
      },
    }),
  ]);

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
  logLevel: LogLevel.INFO,
  model: dreamsrouter("openai/gpt-4o"),
  contexts: [assistantContext],
  inputs: {
    text: textInput,
  },
  outputs: {
    text: textOutput,
  },
});

// Start the interactive CLI
async function main() {
  await agent.start();

  console.log("\n🤖 Personal Assistant with Wallet Integration Started!");
  console.log(
    "💡 This assistant includes analytics + profile + wallet contexts"
  );
  console.log("\n💰 === WALLET COMMANDS ===");
  console.log("💡 'Create a wallet' - Creates your Coinbase wallet");
  console.log("💡 'Check balance' - Shows your current balance");
  console.log("💡 'Request funds' - Gets testnet ETH from faucet");
  console.log("💡 'Send 0.001 ETH to 0x...' - Sends a transaction");
  console.log("💡 'Show transactions' - Lists your transaction history");
  console.log("\n📊 === OTHER COMMANDS ===");
  console.log("💡 'My name is Alice' - Updates your profile");
  console.log("💡 'analytics' - Shows usage statistics");
  console.log("💡 'profile' - Shows profile information");
  console.log("💡 'wallet' - Shows wallet status");
  console.log("💡 'exit' - Quit the application\n");

  // Simulate different users with different context instances
  const userId = process.argv[2] || "default-user";
  const network = (process.argv[3] || "base-sepolia") as any;
  console.log(`Starting session for user: ${userId} on network: ${network}\n`);

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

    // Show analytics
    if (input.toLowerCase() === "analytics") {
      console.log("\n📊 === USAGE ANALYTICS ===");

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

      const userActivity = agent.tracker.getUserActivity(userId);
      console.log(`\n👤 User ${userId} Activity:`);
      console.log(`📝 Total requests: ${userActivity.totalRequests}`);
      console.log(`💰 Total cost: $${userActivity.totalCost.toFixed(4)}`);

      console.log(`\n🌟 Context Composition:`);
      console.log(`• Assistant context includes: analytics + profile + wallet`);
      console.log(`• All actions from composed contexts are available`);
      console.log(`• Each context maintains separate memory`);

      rl.prompt();
      return;
    }

    // Show profile data
    if (input.toLowerCase() === "profile") {
      console.log("\n👤 === USER PROFILE ===");
      console.log(
        "This data comes from the profile context composed into the assistant!"
      );
      input = "Show me my profile information";
    }

    // Show wallet status
    if (input.toLowerCase() === "wallet") {
      console.log("\n💰 === WALLET STATUS ===");
      console.log(
        "This data comes from the wallet context composed into the assistant!"
      );
      input = "Show me my wallet status and balance";
    }

    try {
      // Send the message with the proper context
      const result = await agent.send({
        context: assistantContext,
        args: { userId, network },
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

/**
 * 🎯 Key Takeaways from this Example:
 *
 * 1. Wallet Integration via Context Composition:
 *    - The wallet context is composed just like analytics and profile
 *    - All wallet actions become available to the assistant
 *    - Wallet memory is kept separate but accessible
 *
 * 2. Real Blockchain Operations:
 *    - Create real wallets using Coinbase CDP SDK
 *    - Check balances on actual networks
 *    - Send real transactions (on testnet)
 *    - Request funds from faucets for testing
 *
 * 3. Benefits of This Architecture:
 *    - Clean separation of concerns (wallet logic isolated)
 *    - Easy to add/remove wallet functionality
 *    - Wallet context can be reused in other agents
 *    - Each user gets their own wallet instance
 *
 * 4. Security Considerations:
 *    - Private keys are managed by CDP's TEE
 *    - Transactions require confirmation
 *    - Network-specific operations (testnet vs mainnet)
 *    - Proper error handling for failed transactions
 *
 * 5. Real-World Applications:
 *    - DeFi assistants with trading capabilities
 *    - NFT marketplace agents
 *    - Payment processing bots
 *    - Treasury management systems
 *    - Loyalty/rewards programs
 *
 * This pattern shows how Daydreams + Coinbase enables sophisticated crypto applications!
 */
