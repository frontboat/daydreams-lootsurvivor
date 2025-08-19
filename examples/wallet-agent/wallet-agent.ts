/**
 * 🏦 Multi-Context Wallet Management Agent
 * 
 * This agent demonstrates Daydreams' powerful context composition pattern for
 * building sophisticated wallet management capabilities.
 * 
 * Features:
 * - Multi-user wallet account management
 * - Conditional trading tasks and automation
 * - Portfolio analytics and insights
 * - Multi-platform support (Discord, Telegram, Twitter)
 * - Real-time price monitoring and alerts
 * 
 * Architecture:
 * - AccountsContext: Manages wallet accounts and balances
 * - TasksContext: Handles conditional trading rules
 * - AnalyticsContext: Tracks user behavior and insights
 * - WalletAgentContext: Main context that composes all functionality
 * 
 * Usage Examples:
 * - "Create an account called 'Main Wallet'"
 * - "Check my ETH balance" 
 * - "Create a task to sell ETH when price > $4000"
 * - "Show my portfolio summary"
 * - "Set up a price alert for BTC at $70000"
 */

import {
  createDreams,
  input,
  output,
  LogLevel,
} from "@daydreamsai/core";
import { openai } from "@ai-sdk/openai";
import * as z from "zod";
import { walletAgentContext } from "./wallet-agent-context";

// Define input handlers for different platforms
export const textInput = input({
  description: "Text input from user (any platform)",
  schema: z.object({
    content: z.string().describe("User message content"),
    userId: z.string().describe("User identifier"),
    platform: z.string().optional().describe("Platform (discord, telegram, twitter)"),
    sessionId: z.string().optional().describe("Session identifier"),
  }),
});

export const commandInput = input({
  description: "Structured command input for advanced operations",
  schema: z.object({
    command: z.string().describe("Command name"),
    args: z.record(z.string(), z.any()).describe("Command arguments"),
    userId: z.string().describe("User identifier"),
    platform: z.string().optional().describe("Platform source"),
  }),
});

// Define output handlers for different response types
export const textOutput = output({
  description: "Text response to user",
  schema: z.object({
    content: z.string().describe("Response content"),
    userId: z.string().describe("Target user"),
    platform: z.string().optional().describe("Target platform"),
    formatting: z.enum(["plain", "markdown", "rich"]).optional().describe("Response formatting"),
  }),
});

export const alertOutput = output({
  description: "Alert notification for important events",
  schema: z.object({
    title: z.string().describe("Alert title"),
    message: z.string().describe("Alert message"),
    priority: z.enum(["low", "medium", "high", "urgent"]).describe("Alert priority"),
    userId: z.string().describe("Target user"),
    type: z.enum(["price", "task", "system", "trade"]).describe("Alert type"),
    data: z.record(z.string(), z.any()).optional().describe("Additional alert data"),
  }),
});

export const tradeNotificationOutput = output({
  description: "Trade execution notification",
  schema: z.object({
    tradeId: z.string().describe("Trade identifier"),
    userId: z.string().describe("User identifier"),
    action: z.enum(["buy", "sell", "swap"]).describe("Trade action"),
    fromToken: z.string().describe("Source token"),
    toToken: z.string().describe("Destination token"),
    amount: z.number().describe("Trade amount"),
    status: z.enum(["pending", "completed", "failed"]).describe("Trade status"),
    details: z.record(z.string(), z.any()).optional().describe("Trade details"),
  }),
});

// Create the base wallet agent
export function createWalletAgent(options: {
  model?: any;
  logLevel?: LogLevel;
  apiKeys?: {
    openai?: string;
    [key: string]: string | undefined;
  };
} = {}) {
  return createDreams({
    logLevel: options.logLevel || LogLevel.INFO,
    model: options.model || openai("gpt-4o"),
    
    // Main context that composes all wallet functionality
    contexts: [walletAgentContext],
    
    // Input handlers for different interaction types
    inputs: {
      text: textInput,
      command: commandInput,
    },
    
    // Output handlers for different response types
    outputs: {
      text: textOutput,
      alert: alertOutput,
      tradeNotification: tradeNotificationOutput,
    },
  });
}

// Helper function to send messages to the wallet agent
export async function sendToWalletAgent(
  agent: ReturnType<typeof createWalletAgent>,
  message: string,
  userId: string,
  platform?: string,
  sessionId?: string
) {
  return agent.send({
    context: walletAgentContext,
    args: { userId, platform, sessionId },
    input: { 
      type: "text", 
      data: { 
        content: message, 
        userId, 
        platform, 
        sessionId 
      } 
    },
  });
}

// Helper function to execute commands directly
export async function executeWalletCommand(
  agent: ReturnType<typeof createWalletAgent>,
  command: string,
  args: Record<string, any>,
  userId: string,
  platform?: string
) {
  return agent.send({
    context: walletAgentContext,
    args: { userId, platform },
    input: { 
      type: "command", 
      data: { 
        command, 
        args, 
        userId, 
        platform 
      } 
    },
  });
}

// Example usage for testing
export async function runWalletAgentExample() {
  console.log("🚀 Starting Wallet Agent Example...");
  
  const agent = createWalletAgent({
    logLevel: LogLevel.DEBUG,
  });
  
  await agent.start();
  
  const userId = "example-user-123";
  
  console.log("🔹 Creating first account...");
  const result1 = await sendToWalletAgent(
    agent,
    "Create an account called 'Main Wallet' with 10 ETH and 1000 USDC",
    userId,
    "cli",
    "example-session"
  );
  console.log("Response:", result1.find(r => r.ref === "output")?.data);
  
  console.log("\n🔹 Checking portfolio...");
  const result2 = await sendToWalletAgent(
    agent,
    "Show me my portfolio summary",
    userId,
    "cli",
    "example-session"
  );
  console.log("Response:", result2.find(r => r.ref === "output")?.data);
  
  console.log("\n🔹 Creating conditional task...");
  const result3 = await sendToWalletAgent(
    agent,
    "Create a task to alert me when ETH price goes above $3500",
    userId,
    "cli", 
    "example-session"
  );
  console.log("Response:", result3.find(r => r.ref === "output")?.data);
  
  console.log("\n🔹 Checking current prices...");
  const result4 = await sendToWalletAgent(
    agent,
    "What are the current prices for ETH, BTC, and USDC?",
    userId,
    "cli",
    "example-session"
  );
  console.log("Response:", result4.find(r => r.ref === "output")?.data);
  
  console.log("\n✅ Example completed!");
}

// Run example if this file is executed directly
if (require.main === module) {
  runWalletAgentExample().catch(console.error);
}