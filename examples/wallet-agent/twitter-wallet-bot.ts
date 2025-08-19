/**
 * 🏦 Twitter/X Wallet Management Bot
 * 
 * A Twitter bot implementation of the multi-context wallet agent.
 * Users can interact with their wallets through tweets, DMs, and mentions.
 * 
 * Features:
 * - Respond to mentions for wallet operations
 * - Direct message support for private wallet management
 * - Tweet wallet summaries and market insights
 * - Real-time price alerts via tweets/DMs
 * - Multi-user support with isolated wallet states
 * - Thread support for complex interactions
 * 
 * Usage:
 * - @walletbot balance ETH - Check ETH balance
 * - @walletbot portfolio - Show portfolio summary  
 * - @walletbot prices BTC,ETH,USDC - Get current prices
 * - @walletbot create task to sell ETH at $4000 - Set conditional task
 * - DM: "Create an account called Trading Wallet" - Private operations
 * - Or natural language in replies/DMs
 */

import { createDreams, LogLevel, validateEnv } from "@daydreamsai/core";
import { twitter } from "@daydreamsai/twitter";
import { createGroq } from "@ai-sdk/groq";
import * as z from "zod";
import { walletAgentContext } from "./wallet-agent-context";
import { textInput, textOutput, alertOutput } from "./wallet-agent";

// Validate required environment variables
const env = validateEnv(
  z.object({
    GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
    TWITTER_USERNAME: z.string().min(1, "TWITTER_USERNAME is required"),
    TWITTER_PASSWORD: z.string().min(1, "TWITTER_PASSWORD is required"),
    TWITTER_EMAIL: z.string().min(1, "TWITTER_EMAIL is required"),
  })
);

// Create Groq client for Twitter bot
const groq = createGroq({
  apiKey: env.GROQ_API_KEY,
});

// Create the Twitter wallet agent
export const twitterWalletAgent = createDreams({
  logLevel: LogLevel.DEBUG,
  model: groq("deepseek-r1-distill-llama-70b"),
  
  // Use our wallet agent context
  contexts: [walletAgentContext],
  
  // Twitter extension handles the platform integration
  extensions: [twitter],
  
  // Input/output handlers
  inputs: {
    text: textInput,
  },
  outputs: {
    text: textOutput,
    alert: alertOutput,
  },
});

// Twitter-specific message formatting (character limit friendly)
export function formatTwitterMessage(response: any, messageType: 'tweet' | 'dm' | 'reply' = 'tweet'): string {
  if (typeof response === 'string') {
    return truncateForTwitter(response, messageType);
  }
  
  // Handle error responses
  if (response.success === false) {
    return `❌ Error: ${response.message || 'Something went wrong'}`;
  }
  
  // Format different response types
  switch (messageType) {
    case 'tweet':
      // Public tweets - concise and engaging
      if (response.holdings && response.totalValue !== undefined) {
        const total = response.totalValue;
        const topHoldings = response.holdings.slice(0, 3);
        return `📊 Portfolio: $${total.toLocaleString()}\n${topHoldings
          .map((h: any) => `${h.token}: $${h.usdValue.toFixed(0)}`)
          .join(' | ')}\n#CryptoPortfolio`;
      }
      
      if (response.prices) {
        const priceList = Object.entries(response.prices)
          .slice(0, 4)
          .map(([token, price]) => `${token}: $${(price as number).toLocaleString()}`)
          .join(' | ');
        return `💰 Prices: ${priceList}\n#CryptoPrices`;
      }
      break;
      
    case 'dm':
      // Direct messages - more detailed and private
      if (response.accounts) {
        return `🏦 Your Accounts:\n${response.accounts
          .map((acc: any) => `${acc.isActive ? '🟢' : '⚫'} ${acc.name} (${Object.keys(acc.balances).length} tokens)`)
          .join('\n')}`;
      }
      
      if (response.task) {
        return `✅ Task Created: ${response.task.name}\n📋 ${response.task.description}`;
      }
      
      if (response.holdings) {
        const total = response.totalValue || 0;
        return `📊 Portfolio Summary\n💵 Total: $${total.toLocaleString()}\n\n${response.holdings
          .map((holding: any) => `${holding.token}: ${holding.balance} (~$${holding.usdValue.toFixed(2)})`)
          .join('\n')}`;
      }
      break;
      
    case 'reply':
      // Replies - balanced between public and detailed
      if (response.prices) {
        return `💰 ${Object.entries(response.prices)
          .map(([token, price]) => `${token}: $${(price as number).toLocaleString()}`)
          .join(', ')}`;
      }
  }
  
  // Default formatting
  if (response.message) {
    return truncateForTwitter(response.message, messageType);
  }
  
  return truncateForTwitter(JSON.stringify(response), messageType);
}

// Truncate messages for Twitter character limits
function truncateForTwitter(text: string, type: 'tweet' | 'dm' | 'reply'): string {
  const limits = {
    tweet: 280,
    dm: 10000,
    reply: 280,
  };
  
  const limit = limits[type];
  if (text.length <= limit) {
    return text;
  }
  
  return text.substring(0, limit - 3) + '...';
}

// Parse Twitter mentions and extract commands
export function parseTwitterCommand(text: string, botUsername: string): {
  isCommand: boolean;
  command?: string;
  args?: string[];
  originalText: string;
} {
  const mention = `@${botUsername}`;
  const cleanText = text.replace(mention, '').trim().toLowerCase();
  
  // Check for specific commands
  const commands = ['balance', 'portfolio', 'prices', 'tasks', 'help', 'create', 'account'];
  const foundCommand = commands.find(cmd => cleanText.startsWith(cmd));
  
  if (foundCommand) {
    const args = cleanText.substring(foundCommand.length).trim().split(/\s+/).filter(Boolean);
    return {
      isCommand: true,
      command: foundCommand,
      args,
      originalText: text,
    };
  }
  
  return {
    isCommand: false,
    originalText: text,
  };
}

// Handle different types of Twitter interactions
export async function handleTwitterMention(tweetData: any) {
  const userId = tweetData.user.id_str;
  const username = tweetData.user.screen_name;
  const tweetId = tweetData.id_str;
  const text = tweetData.text;
  const isReply = !!tweetData.in_reply_to_status_id;
  
  const sessionId = `twitter-${userId}-${tweetId}`;
  const botUsername = env.TWITTER_USERNAME;
  
  const parsed = parseTwitterCommand(text, botUsername);
  
  // Convert commands to natural language for the agent
  let message = parsed.originalText;
  
  if (parsed.isCommand && parsed.command) {
    switch (parsed.command) {
      case 'balance':
        const token = parsed.args?.[0];
        message = token ? `What is my ${token.toUpperCase()} balance?` : 'Show me all my balances';
        break;
      case 'portfolio':
        message = 'Show me my portfolio summary';
        break;
      case 'prices':
        const tokens = parsed.args?.join(',');
        message = tokens ? `What are current prices for ${tokens}?` : 'What are current crypto prices?';
        break;
      case 'tasks':
        message = 'Show me my conditional tasks';
        break;
      case 'help':
        message = 'Show me what features are available';
        break;
      case 'create':
        message = parsed.originalText; // Keep original for complex create commands
        break;
    }
  }
  
  return twitterWalletAgent.send({
    context: walletAgentContext,
    args: { userId, platform: "twitter", sessionId },
    input: { 
      type: "text", 
      data: {
        content: message,
        userId,
        platform: "twitter",
        sessionId,
      }
    },
  });
}

// Handle Twitter DMs for private wallet operations  
export async function handleTwitterDM(dmData: any) {
  const userId = dmData.sender_id;
  const text = dmData.text;
  const dmId = dmData.id;
  
  const sessionId = `twitter-dm-${userId}-${dmId}`;
  
  return twitterWalletAgent.send({
    context: walletAgentContext,
    args: { userId, platform: "twitter", sessionId },
    input: { 
      type: "text", 
      data: {
        content: text,
        userId,
        platform: "twitter", 
        sessionId,
      }
    },
  });
}

// Post market updates and insights (scheduled tweets)
export async function postMarketUpdate() {
  const marketUpdateUserId = "system";
  const sessionId = `twitter-market-${Date.now()}`;
  
  const result = await twitterWalletAgent.send({
    context: walletAgentContext,
    args: { userId: marketUpdateUserId, platform: "twitter", sessionId },
    input: { 
      type: "text", 
      data: {
        content: "Create a market summary tweet with current prices and trends",
        userId: marketUpdateUserId,
        platform: "twitter",
        sessionId,
      }
    },
  });
  
  const output = result.find(r => r.ref === "output");
  return formatTwitterMessage(output?.data, 'tweet');
}

// Twitter bot configuration
export const twitterConfig = {
  botUsername: env.TWITTER_USERNAME,
  features: {
    mentions: true,        // Respond to mentions
    directMessages: true,  // Support DMs for private operations
    scheduledTweets: true, // Post market updates
    threads: true,         // Support tweet threads for long responses
  },
  limits: {
    tweetLength: 280,
    dmLength: 10000,
    dailyTweets: 100,
    hourlyReplies: 20,
  },
  keywords: [
    'wallet', 'balance', 'portfolio', 'crypto', 'price', 'task', 
    'trade', 'alert', 'btc', 'eth', 'usdc', 'help'
  ],
};

// Start Twitter wallet bot
export async function startTwitterWalletBot() {
  console.log("🐦 Starting Twitter Wallet Bot...");
  
  try {
    await twitterWalletAgent.start();
    console.log("✅ Twitter Wallet Bot started successfully!");
    
    console.log(`
🔹 Bot (@${twitterConfig.botUsername}) is ready! Users can:

**Mention Commands:**
• @${twitterConfig.botUsername} balance ETH - Check ETH balance
• @${twitterConfig.botUsername} portfolio - Show portfolio summary
• @${twitterConfig.botUsername} prices BTC,ETH - Get current prices  
• @${twitterConfig.botUsername} tasks - Show conditional tasks
• @${twitterConfig.botUsername} help - Show available features

**Natural Language:**
• @${twitterConfig.botUsername} create an account called Main Wallet
• @${twitterConfig.botUsername} set task to buy ETH when it drops to $3000
• @${twitterConfig.botUsername} what's my portfolio worth?

**Direct Messages (Private):**
• "Create a trading wallet with 5 ETH"
• "Show me my complete portfolio breakdown"
• "Set up alerts for when BTC hits $70000"

**Features:**
✅ Public mention support for general queries
✅ Private DM support for sensitive operations
✅ Scheduled market update tweets
✅ Multi-user isolated wallet states
✅ Tweet threads for complex responses
✅ Character-optimized formatting

**Security:**
• DM support for private wallet operations
• Per-user isolated wallet states
• No actual trading - simulation mode
• Rate limiting and abuse protection
    `);
    
  } catch (error) {
    console.error("❌ Failed to start Twitter Wallet Bot:", error);
    throw error;
  }
}

// Example Twitter bot interactions
export async function simulateTwitterInteractions() {
  console.log("🔄 Simulating Twitter wallet interactions...");
  
  const exampleUserId = "twitter-user-123456789";
  
  // Simulate mention for portfolio check
  console.log("1️⃣ User mentions bot for portfolio...");
  const mentionResult = await handleTwitterMention({
    user: { id_str: exampleUserId, screen_name: "cryptotrader" },
    id_str: "tweet123456789",
    text: `@${twitterConfig.botUsername} portfolio`,
    in_reply_to_status_id: null,
  });
  
  const mentionOutput = mentionResult.find(r => r.ref === "output");
  console.log("Tweet Response:", formatTwitterMessage(mentionOutput?.data, 'tweet'));
  
  // Simulate DM for account creation
  console.log("\n2️⃣ User sends DM to create account...");
  const dmResult = await handleTwitterDM({
    sender_id: exampleUserId,
    id: "dm123456789", 
    text: "Create a trading wallet with 3 ETH, 8000 USDC, and 0.2 BTC. Then show me the portfolio breakdown.",
  });
  
  const dmOutput = dmResult.find(r => r.ref === "output");
  console.log("DM Response:", formatTwitterMessage(dmOutput?.data, 'dm'));
  
  // Simulate scheduled market update
  console.log("\n3️⃣ Posting scheduled market update...");
  const marketTweet = await postMarketUpdate();
  console.log("Market Tweet:", marketTweet);
  
  console.log("\n✅ Twitter interaction simulation completed!");
}

// Scheduled tasks for Twitter bot
export const twitterScheduledTasks = {
  marketUpdates: {
    interval: '0 */6 * * *', // Every 6 hours
    handler: postMarketUpdate,
  },
  
  dailySummary: {
    interval: '0 20 * * *', // 8 PM daily
    handler: async () => {
      // Could aggregate user activity and post insights
      return "📊 Daily crypto summary: Markets showing mixed signals. Stay informed with your wallet agent!";
    },
  },
  
  weeklyTips: {
    interval: '0 10 * * 1', // 10 AM Mondays
    handler: async () => {
      const tips = [
        "💡 Tip: Use conditional tasks to automate your trading strategy and never miss opportunities!",
        "🎯 Pro tip: Set multiple price alerts to track market movements without constant monitoring.",
        "📈 Reminder: Diversify your portfolio and use our analytics to track your performance.",
        "🚀 Weekly wisdom: Dollar-cost averaging can help reduce volatility impact on your investments.",
      ];
      return tips[Math.floor(Math.random() * tips.length)];
    },
  },
};

// Start the bot if this file is run directly
if (require.main === module) {
  startTwitterWalletBot()
    .then(() => simulateTwitterInteractions())
    .catch(console.error);
}