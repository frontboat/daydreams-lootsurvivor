/**
 * 🏦 Telegram Wallet Management Bot
 *
 * A Telegram bot implementation of the multi-context wallet agent.
 * Users can interact with their wallets through Telegram messages and commands.
 *
 * Features:
 * - Bot commands for quick access (/portfolio, /balance, /prices)
 * - Inline keyboards for interactive operations
 * - Private chat support for secure wallet management
 * - Real-time price alerts and task notifications
 * - Multi-user support with isolated wallet states
 * - Rich formatting with emojis and structured messages
 *
 * Usage:
 * - /start - Initialize wallet agent
 * - /portfolio - Show portfolio summary
 * - /balance [token] - Check specific token balance
 * - /prices [tokens] - Get current cryptocurrency prices
 * - /tasks - Manage conditional trading tasks
 * - /help - Show all available commands
 * - Or natural language: "Create a task to buy ETH when it drops below $3000"
 */

import { createDreams, LogLevel } from "@daydreamsai/core";
import { telegram } from "@daydreamsai/telegram";
import { createGroq } from "@ai-sdk/groq";
import { walletAgentContext } from "./wallet-agent-context";
import { textInput, textOutput, alertOutput } from "./wallet-agent";
import { openai } from "@ai-sdk/openai";

// Create the Telegram wallet agent
export const telegramWalletAgent = createDreams({
  logLevel: LogLevel.DEBUG,
  model: openai("gpt-4o"),

  // Use our wallet agent context
  contexts: [walletAgentContext],

  // Telegram extension handles the platform integration
  extensions: [telegram],

  // Input/output handlers
  inputs: {
    text: textInput,
  },
  outputs: {
    text: textOutput,
    alert: alertOutput,
  },
});

// Telegram-specific message formatting
export function formatTelegramMessage(
  response: any,
  messageType: "text" | "alert" | "portfolio" = "text"
): string {
  if (typeof response === "string") {
    return response;
  }

  // Handle error responses
  if (response.success === false) {
    return `❌ <b>Error</b>: ${response.message || "Something went wrong"}`;
  }

  // Format different response types
  switch (messageType) {
    case "portfolio":
      if (response.holdings && response.totalValue !== undefined) {
        const total = response.totalValue;
        const holdings = response.holdings
          .map(
            (holding: any) =>
              `💰 <b>${holding.token}</b>: ${holding.balance} (~$${holding.usdValue.toFixed(2)})`
          )
          .join("\n");

        return `📊 <b>Portfolio Summary</b>\n💵 <b>Total Value</b>: $${total.toLocaleString()}\n\n${holdings}`;
      }
      break;

    case "alert":
      if (response.type && response.message) {
        const emoji =
          response.priority === "high"
            ? "🚨"
            : response.priority === "medium"
              ? "⚠️"
              : "📢";
        return `${emoji} <b>Alert</b>: ${response.message}`;
      }
      break;

    default:
      // Handle specific response types
      if (response.accounts) {
        return `🏦 <b>Your Wallet Accounts</b>\n\n${response.accounts
          .map(
            (acc: any) =>
              `${acc.isActive ? "🟢" : "⚫"} <b>${acc.name}</b>\n   └ ${Object.keys(acc.balances).length} tokens`
          )
          .join("\n\n")}`;
      }

      if (response.prices) {
        return `💰 <b>Current Prices</b>\n\n${Object.entries(response.prices)
          .map(
            ([token, price]) =>
              `<b>${token}</b>: $${(price as number).toLocaleString()}`
          )
          .join("\n")}`;
      }

      if (response.task) {
        return `✅ <b>Task Created</b>\n📝 <b>Name</b>: ${response.task.name}\n📋 <b>Description</b>: ${response.task.description}`;
      }

      if (response.tasks) {
        const activeTasks = response.tasks.filter((t: any) => t.isEnabled);
        return `🤖 <b>Conditional Tasks</b> (${activeTasks.length} active)\n\n${
          activeTasks
            .map(
              (task: any) =>
                `🔹 <b>${task.name}</b>\n   └ ${task.condition.type} ${task.condition.value}`
            )
            .join("\n\n") || "No active tasks"
        }`;
      }
  }

  // Default formatting
  if (response.message) {
    return response.message;
  }

  return `<pre>${JSON.stringify(response, null, 2)}</pre>`;
}

// Telegram inline keyboard helpers
export function createWalletKeyboard(
  context: "main" | "portfolio" | "tasks" = "main"
) {
  const keyboards: Record<string, any[]> = {
    main: [
      [
        { text: "💰 Portfolio", callback_data: "portfolio" },
        { text: "📊 Prices", callback_data: "prices" },
      ],
      [
        { text: "🤖 Tasks", callback_data: "tasks" },
        { text: "🏦 Accounts", callback_data: "accounts" },
      ],
      [
        { text: "📈 Analytics", callback_data: "analytics" },
        { text: "❓ Help", callback_data: "help" },
      ],
    ],
    portfolio: [
      [
        { text: "💵 Balance", callback_data: "balance" },
        { text: "📊 Summary", callback_data: "portfolio_summary" },
      ],
      [
        { text: "🔄 Simulate Trade", callback_data: "simulate_trade" },
        { text: "📈 Market", callback_data: "market" },
      ],
      [{ text: "🔙 Back", callback_data: "main_menu" }],
    ],
    tasks: [
      [
        { text: "➕ Create Task", callback_data: "create_task" },
        { text: "📋 List Tasks", callback_data: "list_tasks" },
      ],
      [
        { text: "✅ Check Tasks", callback_data: "check_tasks" },
        { text: "⚙️ Manage", callback_data: "manage_tasks" },
      ],
      [{ text: "🔙 Back", callback_data: "main_menu" }],
    ],
  };

  return {
    reply_markup: {
      inline_keyboard: keyboards[context] || keyboards.main,
    },
  };
}

// Handle Telegram callback queries (button presses)
export async function handleTelegramCallback(
  callbackQuery: any,
  userId: string
) {
  const data = callbackQuery.data;
  const sessionId = `telegram-${callbackQuery.message.chat.id}-${userId}`;

  const commandMap: Record<string, string> = {
    portfolio: "Show me my portfolio summary",
    prices: "What are the current cryptocurrency prices?",
    tasks: "Show me my conditional tasks",
    accounts: "List my wallet accounts",
    analytics: "Show me my usage statistics",
    help: "Show me help information",
    balance: "Check my account balances",
    portfolio_summary: "Give me a detailed portfolio summary",
    simulate_trade: "Help me simulate a trade",
    market: "Show me the market summary",
    create_task: "Help me create a conditional task",
    list_tasks: "List all my tasks",
    check_tasks: "Check if any tasks should be executed",
    manage_tasks: "Show me task management options",
  };

  const message = commandMap[data] || `Execute command: ${data}`;

  return telegramWalletAgent.send({
    context: walletAgentContext,
    args: { userId, platform: "telegram", sessionId },
    input: {
      type: "text",
      data: {
        content: message,
        userId,
        platform: "telegram",
        sessionId,
      },
    },
  });
}

// Telegram bot commands setup
export const telegramCommands = [
  {
    command: "start",
    description: "Initialize your wallet agent",
    handler: async (userId: string, chatId: string) => {
      const sessionId = `telegram-${chatId}-${userId}`;
      return telegramWalletAgent.send({
        context: walletAgentContext,
        args: { userId, platform: "telegram", sessionId },
        input: {
          type: "text",
          data: {
            content:
              "Hello! I'm new to the wallet agent. Please help me get started.",
            userId,
            platform: "telegram",
            sessionId,
          },
        },
      });
    },
  },
  {
    command: "portfolio",
    description: "Show your portfolio summary",
    handler: async (userId: string, chatId: string) => {
      const sessionId = `telegram-${chatId}-${userId}`;
      return telegramWalletAgent.send({
        context: walletAgentContext,
        args: { userId, platform: "telegram", sessionId },
        input: {
          type: "text",
          data: {
            content: "Show me my portfolio summary with current values",
            userId,
            platform: "telegram",
            sessionId,
          },
        },
      });
    },
  },
  {
    command: "balance",
    description: "Check token balance - /balance [token]",
    handler: async (userId: string, chatId: string, token?: string) => {
      const sessionId = `telegram-${chatId}-${userId}`;
      const message = token
        ? `What is my ${token.toUpperCase()} balance?`
        : "Show me all my token balances";

      return telegramWalletAgent.send({
        context: walletAgentContext,
        args: { userId, platform: "telegram", sessionId },
        input: {
          type: "text",
          data: {
            content: message,
            userId,
            platform: "telegram",
            sessionId,
          },
        },
      });
    },
  },
  {
    command: "prices",
    description: "Get cryptocurrency prices - /prices [tokens]",
    handler: async (userId: string, chatId: string, tokens?: string) => {
      const sessionId = `telegram-${chatId}-${userId}`;
      const message = tokens
        ? `What are the current prices for ${tokens}?`
        : "What are the current cryptocurrency prices?";

      return telegramWalletAgent.send({
        context: walletAgentContext,
        args: { userId, platform: "telegram", sessionId },
        input: {
          type: "text",
          data: {
            content: message,
            userId,
            platform: "telegram",
            sessionId,
          },
        },
      });
    },
  },
  {
    command: "tasks",
    description: "Manage conditional tasks",
    handler: async (userId: string, chatId: string) => {
      const sessionId = `telegram-${chatId}-${userId}`;
      return telegramWalletAgent.send({
        context: walletAgentContext,
        args: { userId, platform: "telegram", sessionId },
        input: {
          type: "text",
          data: {
            content: "Show me my conditional trading tasks and their status",
            userId,
            platform: "telegram",
            sessionId,
          },
        },
      });
    },
  },
  {
    command: "help",
    description: "Show all available commands and features",
    handler: async (userId: string, chatId: string) => {
      const sessionId = `telegram-${chatId}-${userId}`;
      return telegramWalletAgent.send({
        context: walletAgentContext,
        args: { userId, platform: "telegram", sessionId },
        input: {
          type: "text",
          data: {
            content: "Show me all available features and how to use them",
            userId,
            platform: "telegram",
            sessionId,
          },
        },
      });
    },
  },
];

// Start Telegram wallet bot
export async function startTelegramWalletBot() {
  console.log("🤖 Starting Telegram Wallet Bot...");

  try {
    await telegramWalletAgent.start();
    console.log("✅ Telegram Wallet Bot started successfully!");

    console.log(`
🔹 Bot is ready! Users can:

**Bot Commands:**
• \`/start\` - Initialize wallet agent
• \`/portfolio\` - Show portfolio summary  
• \`/balance [token]\` - Check token balance
• \`/prices [tokens]\` - Get current prices
• \`/tasks\` - Manage conditional tasks
• \`/help\` - Show all commands

**Natural Language:**
• "Create an account called Trading Wallet"
• "What's my ETH balance?"
• "Set up a task to buy BTC when it drops to $65000"
• "Show me current market prices"
• "Simulate a trade of 1 ETH for USDC"

**Interactive Features:**
✅ Inline keyboards for quick navigation
✅ Rich HTML formatting with emojis
✅ Real-time price alerts and notifications
✅ Multi-user support with isolated wallets
✅ Portfolio tracking and analytics
✅ Conditional task automation

**Security Features:**
• Private chat support for sensitive operations
• Per-user isolated wallet states
• No actual trading - simulation mode for safety
• Encrypted communication via Telegram
    `);
  } catch (error) {
    console.error("❌ Failed to start Telegram Wallet Bot:", error);
    throw error;
  }
}

// Example Telegram bot interaction flow
export async function simulateTelegramInteraction() {
  const exampleUserId = "telegram-user-123456";
  const exampleChatId = "987654321";
  const sessionId = `telegram-${exampleChatId}-${exampleUserId}`;

  console.log("🔄 Simulating Telegram wallet interaction...");

  // Simulate user clicking /start
  console.log("1️⃣ User starts bot with /start command...");
  const startResult = await telegramCommands[0].handler(
    exampleUserId,
    exampleChatId
  );
  const startOutput = startResult.find((r) => r.ref === "output");
  console.log("Response:", formatTelegramMessage(startOutput?.data));

  // Simulate natural language portfolio request
  console.log("\n2️⃣ User asks about portfolio...");
  const portfolioResult = await telegramWalletAgent.send({
    context: walletAgentContext,
    args: { userId: exampleUserId, platform: "telegram", sessionId },
    input: {
      type: "text",
      data: {
        content:
          "I want to create a trading wallet with 2 ETH, 5000 USDC, and 0.1 BTC, then show me my portfolio",
        userId: exampleUserId,
        platform: "telegram",
        sessionId,
      },
    },
  });
  const portfolioOutput = portfolioResult.find((r) => r.ref === "output");
  console.log(
    "Response:",
    formatTelegramMessage(portfolioOutput?.data, "portfolio")
  );

  // Simulate task creation
  console.log("\n3️⃣ User creates conditional task...");
  const taskResult = await telegramWalletAgent.send({
    context: walletAgentContext,
    args: { userId: exampleUserId, platform: "telegram", sessionId },
    input: {
      type: "text",
      data: {
        content:
          "Create a task to alert me when BTC price goes above $70000, and another task to sell 0.05 BTC when it hits $75000",
        userId: exampleUserId,
        platform: "telegram",
        sessionId,
      },
    },
  });
  const taskOutput = taskResult.find((r) => r.ref === "output");
  console.log("Response:", formatTelegramMessage(taskOutput?.data));

  console.log("\n✅ Telegram interaction simulation completed!");
}

// Environment configuration
export const telegramConfig = {
  development: {
    logLevel: LogLevel.DEBUG,
    enableInlineKeyboards: true,
    enableNotifications: true,
    pollInterval: 1000, // 1 second
  },
  production: {
    logLevel: LogLevel.INFO,
    enableInlineKeyboards: true,
    enableNotifications: true,
    pollInterval: 5000, // 5 seconds
    rateLimiting: true,
    maxMessagesPerMinute: 30,
  },
};

// Start the bot if this file is run directly
if (require.main === module) {
  startTelegramWalletBot()
    .then(() => simulateTelegramInteraction())
    .catch(console.error);
}
