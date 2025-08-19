/**
 * 🏦 Wallet Agent CLI Interface
 * 
 * Interactive command-line interface for the multi-context wallet agent.
 * Demonstrates context composition and multi-user wallet management.
 * 
 * Try these commands:
 * - "Create an account called 'Main Wallet' with 5 ETH and 10000 USDC"
 * - "Show me my portfolio"
 * - "What's my ETH balance?"
 * - "Create a task to alert me when ETH hits $4000"
 * - "Check current crypto prices"
 * - "Show my analytics"
 * - "exit" to quit
 */

import {
  createDreams,
  LogLevel,
  input,
  output,
} from "@daydreamsai/core";
import { openai } from "@ai-sdk/openai";
import * as z from "zod";
import * as readline from "readline";
import { walletAgentContext } from "./wallet-agent-context";

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

// Create the wallet agent
const agent = createDreams({
  logLevel: LogLevel.INFO,
  model: openai("gpt-4o"),
  contexts: [walletAgentContext],
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

  console.log("\n🏦 Wallet Agent CLI Started!");
  console.log("💡 This demonstrates multi-context wallet management with real Coinbase CDP integration");
  console.log("💡 Each user gets isolated wallet state with both real and simulated wallets");
  console.log("💡 Supports real on-chain operations via Coinbase CDP SDK");
  
  console.log("\n🔹 Real Coinbase Wallet Commands:");
  console.log("  • 'Create a real Coinbase wallet called My Wallet'");
  console.log("  • 'Fund my wallet with testnet ETH'");
  console.log("  • 'Transfer 0.001 ETH to [address]'");
  console.log("  • 'Check my Coinbase wallet balance'");
  console.log("  • 'List all my Coinbase wallets'");
  
  console.log("\n🔹 Simulation Commands:");
  console.log("  • 'Create a mock trading account with 10 ETH'");
  console.log("  • 'Simulate trading 1 ETH for USDC'");
  console.log("  • 'Show me my portfolio summary'");
  
  console.log("\n🔹 General Commands:");
  console.log("  • 'What's the current ETH price?'");
  console.log("  • 'Create a task to alert me when BTC goes above $70000'");
  console.log("  • 'help' for complete feature overview");
  console.log("  • 'exit' to quit\n");

  // Get user ID from command line or use default
  const userId = process.argv[2] || "cli-user";
  console.log(`💼 Starting wallet session for user: ${userId}\n`);

  // Create readline interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "wallet> ",
  });

  // Function to handle user input
  async function handleInput(input: string) {
    if (input.toLowerCase() === "exit") {
      console.log("\n👋 Thanks for using Wallet Agent CLI!");
      rl.close();
      process.exit(0);
    }

    // 📊 Show built-in analytics with SimpleTracker
    if (input.toLowerCase() === "analytics" || input.toLowerCase() === "stats") {
      console.log("\n📊 === WALLET AGENT ANALYTICS ===");

      // Get overall analytics from SimpleTracker
      const analytics = agent.tracker.getAnalytics();
      console.log(`💰 Total cost: $${analytics.totalCost.toFixed(4)}`);
      console.log(`🔤 Total tokens: ${analytics.totalTokens.toLocaleString()}`);
      console.log(
        `✅ Success rate: ${(analytics.successRate * 100).toFixed(1)}%`
      );
      console.log(
        `⏱️  Average response time: ${analytics.averageResponseTime.toFixed(0)}ms`
      );

      // Show user-specific activity
      const userActivity = agent.tracker.getUserActivity(userId);
      console.log(`\n👤 User ${userId} Activity:`);
      console.log(`📝 Total requests: ${userActivity.totalRequests}`);
      console.log(`💰 Total cost: $${userActivity.totalCost.toFixed(4)}`);
      console.log(
        `⏱️  Average response time: ${userActivity.averageResponseTime.toFixed(0)}ms`
      );

      console.log(`\n🌟 Multi-Context Benefits:`);
      console.log(`• Wallet agent composes accounts + tasks + analytics contexts`);
      console.log(`• All actions from composed contexts are available`);
      console.log(`• Each context maintains separate, isolated memory`);
      console.log(`• Users cannot access each other's data`);

      rl.prompt();
      return;
    }

    // 🏦 Quick portfolio command
    if (input.toLowerCase() === "portfolio" || input.toLowerCase() === "balance") {
      console.log("\n🏦 === PORTFOLIO OVERVIEW ===");
      console.log("Getting your wallet portfolio and current balances...\n");
      input = "Show me my complete portfolio summary with current values and balances";
    }

    // 💰 Quick prices command
    if (input.toLowerCase() === "prices" || input.toLowerCase() === "market") {
      console.log("\n💰 === MARKET PRICES ===");
      console.log("Fetching current cryptocurrency prices...\n");
      input = "What are the current cryptocurrency prices for major tokens?";
    }

    // 🤖 Quick tasks command
    if (input.toLowerCase() === "tasks") {
      console.log("\n🤖 === CONDITIONAL TASKS ===");
      console.log("Checking your automated trading tasks...\n");
      input = "Show me all my conditional tasks and their current status";
    }

    // ❓ Help command
    if (input.toLowerCase() === "help" || input.toLowerCase() === "features") {
      console.log("\n❓ === WALLET AGENT FEATURES ===");
      input = "Show me all available features and give me examples of how to use them";
    }

    try {
      // Send the message to the wallet agent
      const result = await agent.send({
        context: walletAgentContext,
        args: { 
          userId, 
          platform: "cli",
          sessionId: `cli-${Date.now()}`
        },
        input: { type: "text", data: input },
      });

      // Extract and display the agent's response
      const output = result.find((r) => r.ref === "output");
      if (output && "data" in output) {
        console.log("\n🤖:", output.data);
      }

      // Show any action results for debugging
      const actions = result.filter((r) => r.ref === "action_result");
      if (actions.length > 0) {
        console.log(`\n🔧 Actions executed: ${actions.length}`);
        actions.forEach((action, i) => {
          if ("name" in action && "data" in action) {
            console.log(`  ${i + 1}. ${action.name}: ${action.data?.success ? '✅' : '❌'}`);
          }
        });
      }

    } catch (error) {
      console.error("\n❌ Error:", error);
      console.log("Please try again or type 'help' for assistance.");
    }

    console.log(); // Add spacing
    rl.prompt();
  }

  // Handle line input
  rl.on("line", handleInput);

  // Handle Ctrl+C
  rl.on("SIGINT", () => {
    console.log("\n👋 Goodbye!");
    process.exit(0);
  });

  // Show initial prompt
  rl.prompt();
}

// Quick start with demo data
async function quickStart() {
  console.log("🚀 Quick Start Mode - Setting up demo wallet...");
  
  const demoUserId = "demo-user";
  
  try {
    // Create demo account
    const result1 = await agent.send({
      context: walletAgentContext,
      args: { userId: demoUserId, platform: "cli" },
      input: { 
        type: "text", 
        data: "Create an account called 'Demo Portfolio' with 5 ETH, 10000 USDC, and 0.2 BTC" 
      },
    });
    
    // Create demo task
    const result2 = await agent.send({
      context: walletAgentContext,
      args: { userId: demoUserId, platform: "cli" },
      input: { 
        type: "text", 
        data: "Create a task to alert me when ETH price goes above $3500" 
      },
    });
    
    console.log("✅ Demo wallet created!");
    console.log("📝 Demo task created!");
    console.log(`💼 You can now interact as user: ${demoUserId}\n`);
    
    // Override userId for main session
    process.argv[2] = demoUserId;
    
  } catch (error) {
    console.error("❌ Error setting up demo:", error);
  }
}

// Check for command line flags
const args = process.argv.slice(2);

if (args.includes("--quick-start") || args.includes("-q")) {
  main().then(() => quickStart()).catch(console.error);
} else {
  main().catch(console.error);
}

/**
 * 🎯 Key Demonstrations:
 * 
 * 1. Context Composition:
 *    - Wallet agent automatically includes accounts, tasks, and analytics
 *    - All actions from composed contexts are available
 *    - Memory is isolated per user but contexts work together
 * 
 * 2. Multi-User Isolation:
 *    - Each userId gets completely separate wallet state
 *    - Run multiple CLI sessions with different user IDs
 *    - No data leakage between users
 * 
 * 3. Natural Language Interface:
 *    - Complex operations via conversational commands
 *    - LLM orchestrates multiple actions as needed
 *    - Flexible input handling with shortcuts
 * 
 * 4. Built-in Analytics:
 *    - SimpleTracker automatically tracks costs and performance
 *    - User-specific activity monitoring
 *    - No manual tracking required
 * 
 * Usage Examples:
 * 
 * # Start normal session
 * tsx cli.ts alice
 * 
 * # Quick start with demo data
 * tsx cli.ts --quick-start
 * 
 * # Multiple users (run in separate terminals)
 * tsx cli.ts alice
 * tsx cli.ts bob
 * tsx cli.ts carol
 */