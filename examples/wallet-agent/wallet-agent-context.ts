import { context, action, type EpisodeHooks } from "@daydreamsai/core";
import * as z from "zod";
import { accountsContext } from "./accounts-context";
import { tasksContext } from "./tasks-context";
import { analyticsContext } from "./analytics-context";

// Define what our main wallet agent remembers
export interface WalletAgentMemory {
  conversationCount: number;
  lastInteractionType?: string;
  userPreferences: {
    defaultCurrency: string;
    alertFrequency: string;
    riskTolerance: "low" | "medium" | "high";
  };
  onboardingCompleted: boolean;
}

// Mock price service (in real implementation, this would be a separate service)
const MOCK_PRICES: Record<string, number> = {
  ETH: 3200,
  BTC: 67000,
  USDC: 1,
  USDT: 1,
  MATIC: 0.85,
  LINK: 12.5,
  SOL: 180,
  ADA: 0.45,
  DOT: 6.2,
  AVAX: 28.5,
};

// Episode hooks for wallet agent interactions
const walletAgentHooks: EpisodeHooks = {
  shouldStartEpisode: (ref) => {
    return ref.ref === "input" && ref.type === "text";
  },

  shouldEndEpisode: (ref) => {
    if (ref.ref !== "output") return false;
    
    const content = (ref.content || ref.data || "").toString().toLowerCase();
    const isGoodbye = content.includes("goodbye") || content.includes("see you") || content.includes("bye");
    const isComplete = content.includes("anything else") || content.includes("help you with");
    
    return isGoodbye || isComplete;
  },

  createEpisode: (logs, ctx) => {
    const userInputs = logs.filter(l => l.ref === "input");
    const agentOutputs = logs.filter(l => l.ref === "output");
    const actions = logs.filter(l => l.ref === "action_call");
    
    const walletActions = actions.filter(a => 
      a.name?.includes("account") || a.name?.includes("balance") || a.name?.includes("portfolio")
    );
    const taskActions = actions.filter(a => 
      a.name?.includes("task") || a.name?.includes("check")
    );
    
    return {
      type: "wallet_management_session",
      user: {
        id: ctx.args?.userId,
        messageCount: userInputs.length,
        walletOperations: walletActions.length,
        taskOperations: taskActions.length,
      },
      agent: {
        messageCount: agentOutputs.length,
        actionsUsed: actions.map(a => a.name),
        walletActionsUsed: walletActions.length,
      },
      session: {
        startTime: logs[0]?.timestamp,
        endTime: logs[logs.length - 1]?.timestamp,
        duration: logs[logs.length - 1]?.timestamp - logs[0]?.timestamp,
        totalExchanges: Math.min(userInputs.length, agentOutputs.length),
      },
      summary: `Wallet session: ${userInputs.length} messages, ${actions.length} actions, ${walletActions.length} wallet ops`,
    };
  },

  classifyEpisode: (episodeData) => {
    if (episodeData.user?.walletOperations > 3) return "active_trading";
    if (episodeData.user?.taskOperations > 0) return "task_management";
    if (episodeData.session?.totalExchanges > 5) return "extended_session";
    return "standard";
  },

  extractMetadata: (episodeData, logs, ctx) => ({
    userId: ctx.args?.userId,
    sessionType: episodeData.user?.walletOperations > 0 ? "wallet_active" : "informational",
    walletOperations: episodeData.user?.walletOperations || 0,
    taskOperations: episodeData.user?.taskOperations || 0,
    duration: episodeData.session?.duration || 0,
    engagement: episodeData.session?.totalExchanges > 3 ? "high" : "low",
  }),
};

// Create the main wallet agent context that composes all functionality
export const walletAgentContext = context({
  type: "wallet-agent",
  episodeHooks: walletAgentHooks,
  schema: z.object({
    userId: z.string().describe("Unique identifier for the user"),
    platform: z.string().optional().describe("Platform the user is connecting from (discord, telegram, twitter)"),
    sessionId: z.string().optional().describe("Session identifier for analytics"),
  }),
  create: (): WalletAgentMemory => ({
    conversationCount: 0,
    userPreferences: {
      defaultCurrency: "USD",
      alertFrequency: "normal",
      riskTolerance: "medium",
    },
    onboardingCompleted: false,
  }),
  render: (state) => {
  
    const { conversationCount, lastInteractionType, userPreferences, onboardingCompleted } = state.memory;
    
    return `
🤖 Wallet Agent for User: ${state.args.userId}
💬 Conversations: ${conversationCount}
🎯 Last Action: ${lastInteractionType || "None"}
⚙️ Risk Tolerance: ${userPreferences.riskTolerance}
📱 Platform: ${state.args.platform || "Unknown"}
✅ Onboarded: ${onboardingCompleted ? "Yes" : "No"}

I can help you with:
• Managing wallet accounts and balances
• Creating conditional trading tasks
• Monitoring portfolio performance
• Setting up price alerts and automation
• Analyzing your trading patterns
    `.trim();
  },
  instructions: (state) => {
    const baseInstructions = `You are a sophisticated wallet management agent that helps users manage their cryptocurrency portfolios and automate trading tasks.

Your capabilities include:
1. **Account Management**: Create accounts, check balances, manage portfolios
2. **Conditional Tasks**: Set up automated trading rules and alerts
3. **Analytics**: Track user behavior and provide insights
4. **Multi-Platform Support**: Work seamlessly across Discord, Telegram, and Twitter

Key Behaviors:
- Always track important interactions using the analytics system
- Guide new users through onboarding if they haven't completed it
- Be proactive about suggesting useful features
- Provide clear explanations of risks for trading operations
- Use the task system to help users automate their trading strategies

Current prices available: ${Object.entries(MOCK_PRICES)
  .map(([token, price]) => `${token}: $${price.toLocaleString()}`)
  .join(", ")}`;

    if (!state.memory.onboardingCompleted) {
      return baseInstructions + `

🚀 **ONBOARDING NEEDED**: This user hasn't completed onboarding yet. Help them:
1. Create their first wallet account
2. Understand the conditional task system
3. Set up basic portfolio tracking
4. Learn about available features`;
    }

    if (state.memory.userPreferences.riskTolerance === "high") {
      return baseInstructions + `

⚠️ **HIGH RISK USER**: This user has high risk tolerance. You can suggest more advanced features and trading strategies.`;
    }

    return baseInstructions;
  },
  onRun: async (ctx) => {
    ctx.memory.conversationCount++;
    // Conversation interaction would be tracked by the LLM calling track-event action if needed
  },
})
  // 🌟 Compose all wallet functionality using .use()
  .use((state) => [
    // Always include accounts management
    { context: accountsContext, args: { userId: state.args.userId } },
    
    // Always include conditional tasks
    { context: tasksContext, args: { userId: state.args.userId } },
    
    // Always include analytics tracking
    { context: analyticsContext, args: { userId: state.args.userId } },
  ])
  .setActions([
    action({
      name: "get-current-prices",
      description: "Get current cryptocurrency prices",
      schema: z.object({
        tokens: z.array(z.string()).optional().describe("Specific tokens to get prices for (all if not specified)"),
      }),
      handler: async ({ tokens }, ctx) => {
        ctx.memory.lastInteractionType = "price_check";
        
        const requestedTokens = tokens || Object.keys(MOCK_PRICES);
        const prices = requestedTokens.reduce((acc, token) => {
          const upperToken = token.toUpperCase();
          if (MOCK_PRICES[upperToken]) {
            acc[upperToken] = MOCK_PRICES[upperToken];
          }
          return acc;
        }, {} as Record<string, number>);

        return {
          success: true,
          prices,
          timestamp: Date.now(),
          source: "mock_data",
          totalTokens: Object.keys(prices).length,
        };
      },
    }),

    action({
      name: "simulate-trade",
      description: "Simulate a trade to see potential outcomes without executing",
      schema: z.object({
        action: z.enum(["buy", "sell"]).describe("Trade action"),
        fromToken: z.string().describe("Token to sell"),
        toToken: z.string().describe("Token to buy"),
        amount: z.number().positive().describe("Amount to trade"),
        accountId: z.string().optional().describe("Account to simulate trade for"),
      }),
      handler: async ({ action, fromToken, toToken, amount, accountId }, ctx) => {
        ctx.memory.lastInteractionType = "trade_simulation";
        
        const fromPrice = MOCK_PRICES[fromToken.toUpperCase()];
        const toPrice = MOCK_PRICES[toToken.toUpperCase()];
        
        if (!fromPrice || !toPrice) {
          return {
            success: false,
            error: "Price data not available for one or both tokens",
            availableTokens: Object.keys(MOCK_PRICES),
          };
        }

        const fromValue = amount * fromPrice;
        const receivedAmount = fromValue / toPrice;
        const slippage = 0.003; // 0.3% slippage
        const actualReceived = receivedAmount * (1 - slippage);
        const fee = fromValue * 0.001; // 0.1% fee

        // Simulation completed - tracking would be handled by the LLM if needed

        return {
          success: true,
          simulation: {
            action,
            fromToken,
            toToken,
            fromAmount: amount,
            fromPrice,
            toPrice,
            grossReceived: receivedAmount,
            slippage: slippage * 100, // as percentage
            fee,
            netReceived: actualReceived,
            totalCost: fromValue + fee,
          },
          warning: "This is a simulation. Actual trades may have different outcomes due to market conditions.",
        };
      },
    }),

    action({
      name: "set-user-preferences",
      description: "Update user preferences for the wallet agent",
      schema: z.object({
        defaultCurrency: z.string().optional().describe("Preferred display currency"),
        alertFrequency: z.enum(["low", "normal", "high"]).optional().describe("How often to send alerts"),
        riskTolerance: z.enum(["low", "medium", "high"]).optional().describe("Risk tolerance level"),
      }),
      handler: async ({ defaultCurrency, alertFrequency, riskTolerance }, ctx) => {
        ctx.memory.lastInteractionType = "preference_update";
        
        if (defaultCurrency) ctx.memory.userPreferences.defaultCurrency = defaultCurrency;
        if (alertFrequency) ctx.memory.userPreferences.alertFrequency = alertFrequency;
        if (riskTolerance) ctx.memory.userPreferences.riskTolerance = riskTolerance;

        // Preferences updated - tracking would be handled by the LLM if needed

        return {
          success: true,
          preferences: ctx.memory.userPreferences,
          message: "Preferences updated successfully",
        };
      },
    }),

    action({
      name: "complete-onboarding",
      description: "Mark user onboarding as completed",
      schema: z.object({}),
      handler: async (_, ctx) => {
        ctx.memory.onboardingCompleted = true;
        ctx.memory.lastInteractionType = "onboarding_completed";

        // Onboarding completed - tracking would be handled by the LLM if needed

        return {
          success: true,
          message: "Welcome! You're all set up. I can now help you manage your wallet and set up automated trading tasks.",
          nextSteps: [
            "Create your first wallet account",
            "Check current cryptocurrency prices",
            "Set up conditional trading tasks",
            "Explore portfolio analytics",
          ],
        };
      },
    }),

    action({
      name: "get-help",
      description: "Get help information about available features",
      schema: z.object({
        topic: z.string().optional().describe("Specific topic to get help with"),
      }),
      handler: async ({ topic }, ctx) => {
        ctx.memory.lastInteractionType = "help_requested";

        const helpTopics = {
          accounts: {
            title: "Account Management",
            description: "Create and manage wallet accounts, check balances, add funds",
            commands: ["create-account", "list-accounts", "get-balance", "set-active-account", "add-funds"],
          },
          tasks: {
            title: "Conditional Tasks",
            description: "Set up automated trading rules and price alerts",
            commands: ["create-task", "list-tasks", "toggle-task", "delete-task", "check-tasks"],
          },
          portfolio: {
            title: "Portfolio Management",
            description: "Monitor your portfolio, simulate trades, get market data",
            commands: ["get-portfolio-summary", "simulate-trade", "get-current-prices"],
          },
          analytics: {
            title: "Analytics & Insights",
            description: "Track your activity and get usage insights",
            commands: ["get-interaction-stats", "get-usage-patterns", "export-analytics"],
          },
        };

        // Help request - tracking would be handled by the LLM if needed

        if (topic && helpTopics[topic as keyof typeof helpTopics]) {
          return {
            success: true,
            topic: helpTopics[topic as keyof typeof helpTopics],
          };
        }

        return {
          success: true,
          availableTopics: helpTopics,
          generalHelp: {
            title: "Wallet Agent Help",
            description: "I can help you manage your cryptocurrency portfolio and automate trading strategies.",
            mainFeatures: [
              "🏦 Account Management - Create and manage multiple wallet accounts",
              "🤖 Conditional Tasks - Set up automated trading rules and alerts", 
              "📊 Portfolio Tracking - Monitor balances and performance",
              "📈 Market Data - Get real-time price information",
              "📱 Multi-Platform - Use from Discord, Telegram, or Twitter",
            ],
            examples: [
              "Create an account called 'Main Wallet'",
              "Check my ETH balance",
              "Create a task to sell ETH when price is above $4000",
              "Show my portfolio summary",
              "Get current BTC price",
            ],
          },
        };
      },
    }),

    action({
      name: "get-market-summary",
      description: "Get a summary of current market conditions",
      schema: z.object({}),
      handler: async (_, ctx) => {
        ctx.memory.lastInteractionType = "market_summary";

        // Calculate market metrics
        const prices = MOCK_PRICES;
        const totalMarketCap = Object.values(prices).reduce((sum, price) => sum + price, 0);
        const avgPrice = totalMarketCap / Object.keys(prices).length;

        // Mock market sentiment and changes
        const marketSentiment = Math.random() > 0.5 ? "bullish" : "bearish";
        const topMovers = Object.entries(prices)
          .map(([token, price]) => ({
            token,
            price,
            change24h: (Math.random() - 0.5) * 0.2, // -10% to +10%
          }))
          .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
          .slice(0, 5);

        // Market summary generated - tracking would be handled by the LLM if needed

        return {
          success: true,
          marketSentiment,
          summary: {
            totalTokens: Object.keys(prices).length,
            averagePrice: avgPrice,
            topMovers,
            timestamp: Date.now(),
          },
          analysis: {
            trend: marketSentiment === "bullish" ? "Markets showing positive momentum" : "Markets experiencing volatility",
            recommendation: ctx.memory.userPreferences.riskTolerance === "high" 
              ? "Good time for active trading strategies"
              : "Consider dollar-cost averaging approach",
          },
        };
      },
    }),
  ]);