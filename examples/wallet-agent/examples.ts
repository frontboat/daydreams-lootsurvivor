/**
 * 🏦 Wallet Agent Usage Examples
 * 
 * This file demonstrates various ways to use the multi-context wallet agent,
 * showcasing the power of context composition and multi-platform integration.
 */

import { createWalletAgent, sendToWalletAgent, executeWalletCommand } from './wallet-agent';
import { walletAgentContext } from './wallet-agent-context';
import { LogLevel } from '@daydreamsai/core';

// Example 1: Basic Wallet Setup and Operations
export async function basicWalletExample() {
  console.log("\n🔹 Example 1: Basic Wallet Operations");
  console.log("=====================================");
  
  const agent = createWalletAgent({
    logLevel: LogLevel.INFO,
  });
  
  await agent.start();
  const userId = "example-user-basic";
  
  try {
    // Create initial account
    console.log("Creating initial wallet account...");
    const result1 = await sendToWalletAgent(
      agent,
      "Create an account called 'Main Wallet' with 5 ETH, 10000 USDC, and 0.1 BTC",
      userId,
      "cli"
    );
    
    const output1 = result1.find(r => r.ref === "output");
    console.log("✅ Result:", output1?.data);
    
    // Check portfolio
    console.log("\nChecking portfolio summary...");
    const result2 = await sendToWalletAgent(
      agent,
      "Show me my complete portfolio breakdown with current values",
      userId,
      "cli"
    );
    
    const output2 = result2.find(r => r.ref === "output");
    console.log("💰 Portfolio:", output2?.data);
    
    // Get current prices
    console.log("\nChecking current prices...");
    const result3 = await sendToWalletAgent(
      agent,
      "What are the current prices for ETH, BTC, USDC, and MATIC?",
      userId,
      "cli"
    );
    
    const output3 = result3.find(r => r.ref === "output");
    console.log("📊 Prices:", output3?.data);
    
  } catch (error) {
    console.error("❌ Error in basic wallet example:", error);
  }
}

// Example 2: Advanced Task Automation
export async function taskAutomationExample() {
  console.log("\n🔹 Example 2: Task Automation");
  console.log("==============================");
  
  const agent = createWalletAgent({
    logLevel: LogLevel.INFO,
  });
  
  await agent.start();
  const userId = "example-user-tasks";
  
  try {
    // Setup account with funds
    console.log("Setting up trading account...");
    await sendToWalletAgent(
      agent,
      "Create an account called 'Trading Account' with 10 ETH, 20000 USDC, and 0.5 BTC",
      userId,
      "cli"
    );
    
    // Create multiple conditional tasks
    console.log("\nCreating conditional tasks...");
    
    // Price alert task
    const alertResult = await sendToWalletAgent(
      agent,
      "Create a task to alert me when ETH price goes above $3500",
      userId,
      "cli"
    );
    console.log("📢 Alert task:", alertResult.find(r => r.ref === "output")?.data);
    
    // Trading task
    const tradeResult = await sendToWalletAgent(
      agent,
      "Create a task to sell 2 ETH when the price hits $4000, but limit it to execute only once",
      userId,
      "cli"
    );
    console.log("🔄 Trade task:", tradeResult.find(r => r.ref === "output")?.data);
    
    // Portfolio rebalancing task
    const rebalanceResult = await sendToWalletAgent(
      agent,
      "Create a task to rebalance my portfolio when total value exceeds $50000",
      userId,
      "cli"
    );
    console.log("⚖️ Rebalance task:", rebalanceResult.find(r => r.ref === "output")?.data);
    
    // Check all tasks
    console.log("\nChecking task status...");
    const taskListResult = await sendToWalletAgent(
      agent,
      "Show me all my tasks and their current status",
      userId,
      "cli"
    );
    console.log("📋 Task list:", taskListResult.find(r => r.ref === "output")?.data);
    
    // Manually check tasks for execution
    console.log("\nChecking if any tasks should execute...");
    const checkResult = await sendToWalletAgent(
      agent,
      "Check all my tasks and execute any that meet their conditions",
      userId,
      "cli"
    );
    console.log("🔍 Check result:", checkResult.find(r => r.ref === "output")?.data);
    
  } catch (error) {
    console.error("❌ Error in task automation example:", error);
  }
}

// Example 3: Multi-User Isolation Demo
export async function multiUserIsolationExample() {
  console.log("\n🔹 Example 3: Multi-User Isolation");
  console.log("===================================");
  
  const agent = createWalletAgent({
    logLevel: LogLevel.INFO,
  });
  
  await agent.start();
  
  const alice = "alice-123";
  const bob = "bob-456";
  
  try {
    // Alice creates her wallet
    console.log("Alice creating her wallet...");
    await sendToWalletAgent(
      agent,
      "Create an account called 'Alice Trading' with 8 ETH and 15000 USDC",
      alice,
      "discord"
    );
    
    // Bob creates his wallet
    console.log("Bob creating his wallet...");
    await sendToWalletAgent(
      agent,
      "Create an account called 'Bob Holdings' with 3 BTC and 5000 USDT",
      bob,
      "telegram"
    );
    
    // Alice checks her portfolio
    console.log("\nAlice checking her portfolio...");
    const alicePortfolio = await sendToWalletAgent(
      agent,
      "Show me my portfolio summary",
      alice,
      "discord"
    );
    console.log("👩 Alice's portfolio:", alicePortfolio.find(r => r.ref === "output")?.data);
    
    // Bob checks his portfolio  
    console.log("\nBob checking his portfolio...");
    const bobPortfolio = await sendToWalletAgent(
      agent,
      "Show me my portfolio summary",
      bob,
      "telegram"
    );
    console.log("👨 Bob's portfolio:", bobPortfolio.find(r => r.ref === "output")?.data);
    
    // Verify isolation - Alice cannot see Bob's data
    console.log("\nVerifying user isolation...");
    console.log("✅ Alice and Bob have completely separate wallet states");
    console.log("✅ No data leakage between users");
    console.log("✅ Each user's context is isolated: accounts, tasks, analytics");
    
  } catch (error) {
    console.error("❌ Error in multi-user isolation example:", error);
  }
}

// Example 4: Analytics and Insights
export async function analyticsExample() {
  console.log("\n🔹 Example 4: Analytics and Insights");
  console.log("=====================================");
  
  const agent = createWalletAgent({
    logLevel: LogLevel.INFO,
  });
  
  await agent.start();
  const userId = "example-user-analytics";
  
  try {
    // Generate some activity
    console.log("Generating user activity...");
    
    await sendToWalletAgent(agent, "Create account called Portfolio", userId, "discord");
    await sendToWalletAgent(agent, "Add 5 ETH to my account", userId, "discord");
    await sendToWalletAgent(agent, "What's the current ETH price?", userId, "discord");
    await sendToWalletAgent(agent, "Show me my balance", userId, "discord");
    await sendToWalletAgent(agent, "Create a task for ETH price alert", userId, "discord");
    
    // Check interaction statistics
    console.log("\nAnalyzing user behavior...");
    const statsResult = await sendToWalletAgent(
      agent,
      "Show me my interaction statistics and usage patterns",
      userId,
      "discord"
    );
    console.log("📊 Usage stats:", statsResult.find(r => r.ref === "output")?.data);
    
    // Get detailed analytics
    console.log("\nGetting detailed analytics...");
    const analyticsResult = await sendToWalletAgent(
      agent,
      "Export my analytics data in summary format for this week",
      userId,
      "discord"
    );
    console.log("📈 Analytics:", analyticsResult.find(r => r.ref === "output")?.data);
    
    // Check feature usage patterns
    console.log("\nAnalyzing feature usage...");
    const patternsResult = await sendToWalletAgent(
      agent,
      "What are my usage patterns and engagement metrics?",
      userId,
      "discord"
    );
    console.log("🎯 Patterns:", patternsResult.find(r => r.ref === "output")?.data);
    
  } catch (error) {
    console.error("❌ Error in analytics example:", error);
  }
}

// Example 5: Complex Trading Scenario
export async function complexTradingExample() {
  console.log("\n🔹 Example 5: Complex Trading Scenario");
  console.log("=======================================");
  
  const agent = createWalletAgent({
    logLevel: LogLevel.INFO,
  });
  
  await agent.start();
  const userId = "example-user-trader";
  
  try {
    // Setup advanced trading portfolio
    console.log("Setting up advanced trading portfolio...");
    await sendToWalletAgent(
      agent,
      "Create account 'Advanced Trading' with 20 ETH, 50000 USDC, 1 BTC, 5000 MATIC, and 100 LINK",
      userId,
      "cli"
    );
    
    // Get market overview
    console.log("\nGetting market overview...");
    const marketResult = await sendToWalletAgent(
      agent,
      "Give me a comprehensive market summary with current trends",
      userId,
      "cli"
    );
    console.log("🌐 Market:", marketResult.find(r => r.ref === "output")?.data);
    
    // Simulate complex trade
    console.log("\nSimulating complex trade strategies...");
    const tradeResult = await sendToWalletAgent(
      agent,
      "Simulate trading 5 ETH for USDC and show me the expected outcomes",
      userId,
      "cli"
    );
    console.log("🔄 Trade simulation:", tradeResult.find(r => r.ref === "output")?.data);
    
    // Setup multiple conditional tasks
    console.log("\nSetting up automated trading strategy...");
    
    // DCA strategy
    await sendToWalletAgent(
      agent,
      "Create a task to buy $1000 worth of ETH every time it drops below $3000",
      userId,
      "cli"
    );
    
    // Profit taking
    await sendToWalletAgent(
      agent,
      "Create a task to sell 10% of my ETH when it rises above $4500",
      userId,
      "cli"
    );
    
    // Risk management  
    await sendToWalletAgent(
      agent,
      "Create a task to alert me if my total portfolio value drops below $80000",
      userId,
      "cli"
    );
    
    // Portfolio rebalancing
    await sendToWalletAgent(
      agent,
      "Create a task to rebalance portfolio when any single asset exceeds 40% allocation",
      userId,
      "cli"
    );
    
    // Check final status
    console.log("\nChecking final portfolio and strategy status...");
    const finalResult = await sendToWalletAgent(
      agent,
      "Show me my complete portfolio, all active tasks, and trading statistics",
      userId,
      "cli"
    );
    console.log("📊 Final status:", finalResult.find(r => r.ref === "output")?.data);
    
  } catch (error) {
    console.error("❌ Error in complex trading example:", error);
  }
}

// Example 6: Platform-Specific Features
export async function platformFeaturesExample() {
  console.log("\n🔹 Example 6: Platform-Specific Features");
  console.log("=========================================");
  
  const agent = createWalletAgent({
    logLevel: LogLevel.INFO,
  });
  
  await agent.start();
  
  try {
    // Discord user - rich embeds and slash commands
    console.log("Discord user interaction...");
    const discordUser = "discord-user-789";
    const discordResult = await sendToWalletAgent(
      agent,
      "I'm a Discord user. Show me my portfolio with Discord-optimized formatting",
      discordUser,
      "discord"
    );
    console.log("🎮 Discord response:", discordResult.find(r => r.ref === "output")?.data);
    
    // Telegram user - inline keyboards and HTML formatting
    console.log("\nTelegram user interaction...");
    const telegramUser = "telegram-user-101";
    const telegramResult = await sendToWalletAgent(
      agent,
      "I'm using Telegram. Create a trading account and show me the interactive options",
      telegramUser,
      "telegram"
    );
    console.log("📱 Telegram response:", telegramResult.find(r => r.ref === "output")?.data);
    
    // Twitter user - character-limited responses
    console.log("\nTwitter user interaction...");
    const twitterUser = "twitter-user-202";
    const twitterResult = await sendToWalletAgent(
      agent,
      "I'm on Twitter. Give me a quick portfolio summary and current BTC price",
      twitterUser,
      "twitter"
    );
    console.log("🐦 Twitter response:", twitterResult.find(r => r.ref === "output")?.data);
    
    console.log("\n✅ Each platform gets optimized formatting and features!");
    
  } catch (error) {
    console.error("❌ Error in platform features example:", error);
  }
}

// Example 7: Command vs Natural Language
export async function commandVsNaturalExample() {
  console.log("\n🔹 Example 7: Command vs Natural Language");
  console.log("==========================================");
  
  const agent = createWalletAgent({
    logLevel: LogLevel.INFO,
  });
  
  await agent.start();
  const userId = "example-user-commands";
  
  try {
    // Using structured commands
    console.log("Using structured commands...");
    
    const commandResult = await executeWalletCommand(
      agent,
      "create-account",
      { name: "Command Account", initialBalances: { ETH: 3, USDC: 5000 } },
      userId,
      "cli"
    );
    console.log("⚡ Command result:", commandResult.find(r => r.ref === "output")?.data);
    
    // Using natural language
    console.log("\nUsing natural language...");
    
    const naturalResult = await sendToWalletAgent(
      agent,
      "Hey, can you help me create another account? I want to call it 'Natural Language Account' and put 7 ETH and 12000 USDC in it.",
      userId,
      "cli"
    );
    console.log("💬 Natural result:", naturalResult.find(r => r.ref === "output")?.data);
    
    // Complex natural language request
    console.log("\nComplex natural language request...");
    
    const complexResult = await sendToWalletAgent(
      agent,
      "I want to set up a smart trading strategy. Create a task that will buy more ETH whenever the price drops 10% from the current level, but only if I have enough USDC. Also, alert me when my total portfolio hits $25000.",
      userId,
      "cli"
    );
    console.log("🧠 Complex result:", complexResult.find(r => r.ref === "output")?.data);
    
  } catch (error) {
    console.error("❌ Error in command vs natural example:", error);
  }
}

// Main function to run all examples
export async function runAllExamples() {
  console.log("🚀 Running Wallet Agent Examples");
  console.log("=================================");
  
  try {
    await basicWalletExample();
    await taskAutomationExample();
    await multiUserIsolationExample();
    await analyticsExample();
    await complexTradingExample();
    await platformFeaturesExample();
    await commandVsNaturalExample();
    
    console.log("\n🎉 All examples completed successfully!");
    console.log("\nKey Takeaways:");
    console.log("✅ Context composition enables rich, modular functionality");
    console.log("✅ Multi-user isolation keeps data completely separate");
    console.log("✅ Platform integrations provide optimized experiences");
    console.log("✅ Natural language works alongside structured commands");
    console.log("✅ Analytics provide deep insights into user behavior");
    console.log("✅ Conditional tasks enable sophisticated automation");
    
  } catch (error) {
    console.error("❌ Error running examples:", error);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

// Export individual examples for selective testing
export {
  basicWalletExample,
  taskAutomationExample,
  multiUserIsolationExample,
  analyticsExample,
  complexTradingExample,
  platformFeaturesExample,
  commandVsNaturalExample,
};