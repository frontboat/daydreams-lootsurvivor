/**
 * 🏦 Discord Wallet Management Bot
 * 
 * A Discord bot implementation of the multi-context wallet agent.
 * Users can interact with their wallets directly through Discord commands.
 * 
 * Features:
 * - Slash commands for common operations
 * - Direct message support for private wallet management
 * - Rich embeds for portfolio and price information
 * - Real-time alerts and notifications
 * - Multi-user support with isolated wallet states
 * 
 * Usage:
 * - /wallet create-account [name] - Create a new wallet account
 * - /wallet balance [token] - Check token balance
 * - /wallet portfolio - Show portfolio summary
 * - /wallet task create - Set up conditional trading task
 * - /wallet prices [tokens] - Get current prices
 * - Or just chat: "Show me my ETH balance"
 */

import {
  createContainer,
  createDreams,
  LogLevel,
  Logger,
} from "@daydreamsai/core";
import { discord } from "@daydreamsai/discord";
import { anthropic } from "@ai-sdk/anthropic";
import { walletAgentContext } from "./wallet-agent-context";
import { textInput, textOutput, alertOutput } from "./wallet-agent";

// Create container for dependency injection
const container = createContainer();

// Create the Discord wallet agent
const discordWalletAgent = createDreams({
  logger: new Logger({ level: LogLevel.DEBUG }),
  model: anthropic("claude-3-sonnet-latest"),
  container,
  
  // Use our wallet agent context
  contexts: [walletAgentContext],
  
  // Discord extension handles the platform integration
  extensions: [discord],
  
  // Input/output handlers
  inputs: {
    text: textInput,
  },
  outputs: {
    text: textOutput,
    alert: alertOutput,
  },
});

// Custom Discord message handlers for wallet-specific commands
interface DiscordMessage {
  content: string;
  author: { id: string; username: string };
  channel: { id: string; type: string };
  guild?: { id: string; name: string };
}

// Enhanced message processing for wallet commands
function processDiscordMessage(message: DiscordMessage) {
  const userId = message.author.id;
  const isPrivate = message.channel.type === 'DM';
  const platform = "discord";
  
  // Create session ID from channel and user
  const sessionId = `discord-${message.channel.id}-${userId}`;
  
  // Check for wallet-specific commands
  const content = message.content.toLowerCase();
  const isWalletCommand = 
    content.includes('wallet') ||
    content.includes('balance') ||
    content.includes('portfolio') ||
    content.includes('task') ||
    content.includes('price') ||
    content.includes('account') ||
    content.includes('trade');
  
  return {
    userId,
    platform,
    sessionId,
    isWalletCommand,
    isPrivate,
    guildName: message.guild?.name,
  };
}

// Helper to format Discord responses
function formatDiscordResponse(response: any, isPrivate: boolean = false): string {
  // For private messages, use rich formatting
  if (isPrivate && typeof response === 'object') {
    if (response.success === false) {
      return `❌ **Error**: ${response.message || 'Something went wrong'}`;
    }
    
    if (response.accounts) {
      return `🏦 **Your Wallet Accounts**\n${response.accounts
        .map((acc: any) => `${acc.isActive ? '🟢' : '⚫'} **${acc.name}** (${Object.keys(acc.balances).length} tokens)`)
        .join('\n')}`;
    }
    
    if (response.prices) {
      return `💰 **Current Prices**\n${Object.entries(response.prices)
        .map(([token, price]) => `**${token}**: $${(price as number).toLocaleString()}`)
        .join('\n')}`;
    }
    
    if (response.task) {
      return `✅ **Task Created**: ${response.task.name}\n📋 ${response.task.description}`;
    }
    
    if (response.holdings) {
      const total = response.totalValue || 0;
      return `📊 **Portfolio Summary** (Total: $${total.toLocaleString()})\n${response.holdings
        .map((holding: any) => `**${holding.token}**: ${holding.balance} ($${holding.usdValue.toFixed(2)})`)
        .join('\n')}`;
    }
  }
  
  // For public channels, use simpler formatting
  if (typeof response === 'string') {
    return response;
  }
  
  if (response.message) {
    return response.message;
  }
  
  return JSON.stringify(response, null, 2);
}

// Example Discord bot integration (pseudo-code since we don't have actual Discord.js)
export async function startDiscordWalletBot() {
  console.log("🤖 Starting Discord Wallet Bot...");
  
  try {
    await discordWalletAgent.start();
    console.log("✅ Discord Wallet Bot started successfully!");
    
    // The discord extension will handle message routing
    console.log(`
🔹 Bot is ready! Users can:

**Slash Commands:**
• \`/wallet account create [name]\` - Create new wallet
• \`/wallet balance [token]\` - Check balance  
• \`/wallet portfolio\` - Show portfolio summary
• \`/wallet task create\` - Set up conditional task
• \`/wallet prices [tokens]\` - Get current prices
• \`/wallet help\` - Show all commands

**Natural Language (DM or mention):**
• "Create an account called Main Wallet"
• "What's my ETH balance?"
• "Show me my portfolio"
• "Create a task to sell ETH when price > $4000"
• "What are current crypto prices?"

**Features:**
✅ Multi-user support with isolated wallets
✅ Conditional trading tasks and alerts  
✅ Portfolio tracking and analytics
✅ Real-time price data
✅ Rich Discord embeds and formatting
✅ Private DM support for sensitive operations

**Security:**
• Wallet operations are isolated per user
• DM support for private account management
• No actual trading - simulation mode for safety
    `);
    
  } catch (error) {
    console.error("❌ Failed to start Discord Wallet Bot:", error);
    throw error;
  }
}

// Example of how the bot would handle a complex wallet interaction
export async function handleComplexWalletInteraction() {
  const exampleUserId = "discord-user-123456789";
  const exampleSessionId = "discord-channel-987654321-123456789";
  
  console.log("🔄 Simulating complex wallet interaction...");
  
  // Step 1: User creates account
  console.log("1️⃣ Creating wallet account...");
  const result1 = await discordWalletAgent.send({
    context: walletAgentContext,
    args: { 
      userId: exampleUserId, 
      platform: "discord", 
      sessionId: exampleSessionId 
    },
    input: { 
      type: "text", 
      data: {
        content: "Create an account called 'Trading Wallet' with 5 ETH and 10000 USDC",
        userId: exampleUserId,
        platform: "discord",
        sessionId: exampleSessionId,
      }
    },
  });
  
  const output1 = result1.find(r => r.ref === "output");
  console.log("Response:", formatDiscordResponse(output1?.data, true));
  
  // Step 2: User sets up conditional task  
  console.log("\n2️⃣ Setting up conditional trading task...");
  const result2 = await discordWalletAgent.send({
    context: walletAgentContext,
    args: { 
      userId: exampleUserId, 
      platform: "discord", 
      sessionId: exampleSessionId 
    },
    input: { 
      type: "text", 
      data: {
        content: "Create a task to alert me when ETH price goes above $3500, and another to sell 1 ETH when it hits $4000",
        userId: exampleUserId,
        platform: "discord", 
        sessionId: exampleSessionId,
      }
    },
  });
  
  const output2 = result2.find(r => r.ref === "output");
  console.log("Response:", formatDiscordResponse(output2?.data, true));
  
  // Step 3: User checks analytics
  console.log("\n3️⃣ Checking analytics and usage patterns...");
  const result3 = await discordWalletAgent.send({
    context: walletAgentContext,
    args: { 
      userId: exampleUserId, 
      platform: "discord", 
      sessionId: exampleSessionId 
    },
    input: { 
      type: "text", 
      data: {
        content: "Show me my usage statistics and trading patterns",
        userId: exampleUserId,
        platform: "discord",
        sessionId: exampleSessionId,
      }
    },
  });
  
  const output3 = result3.find(r => r.ref === "output");
  console.log("Response:", formatDiscordResponse(output3?.data, true));
  
  console.log("\n✅ Complex interaction simulation completed!");
}

// Configuration for different Discord environments
export const discordConfig = {
  development: {
    logLevel: LogLevel.DEBUG,
    enableSlashCommands: true,
    enableDMs: true,
    allowedChannels: [], // Empty = all channels
    rateLimiting: false,
  },
  production: {
    logLevel: LogLevel.INFO,
    enableSlashCommands: true,
    enableDMs: true,
    allowedChannels: [], // Configure specific channels
    rateLimiting: true,
    maxRequestsPerMinute: 60,
  },
};

// Start the bot if this file is run directly
if (require.main === module) {
  startDiscordWalletBot()
    .then(() => handleComplexWalletInteraction())
    .catch(console.error);
}