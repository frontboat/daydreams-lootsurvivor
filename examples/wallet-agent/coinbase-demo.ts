#!/usr/bin/env tsx

/**
 * 🏛️ Coinbase CDP Wallet Demo
 * 
 * This script demonstrates the integration of real Coinbase CDP wallets
 * into the Daydreams multi-context wallet agent.
 * 
 * Features demonstrated:
 * - Real wallet creation via Coinbase CDP SDK
 * - Testnet funding via faucet
 * - Balance checking
 * - Transfer operations
 * - Mock vs Real mode handling
 */

import { createDreams, LogLevel } from "@daydreamsai/core";
import { openai } from "@ai-sdk/openai";
import { walletAgentContext } from "./wallet-agent-context";
import { textInput, textOutput } from "./wallet-agent";

async function demonstrateCoinbaseIntegration() {
  console.log("🏛️ Coinbase CDP Integration Demo");
  console.log("=================================\n");

  // Create wallet agent
  const agent = createDreams({
    logLevel: LogLevel.INFO,
    model: openai("gpt-4o"),
    contexts: [walletAgentContext],
    inputs: { text: textInput },
    outputs: { text: textOutput },
  });

  await agent.start();

  const userId = "coinbase-demo-user";
  const sessionId = "demo-session";

  console.log("🚀 Step 1: Check Coinbase SDK Configuration");
  console.log("---------------------------------------------");

  try {
    // Check if CDP is configured
    const configResult = await agent.send({
      context: walletAgentContext,
      args: { userId, platform: "cli", sessionId },
      input: { 
        type: "text", 
        data: "Tell me about the Coinbase CDP configuration and what wallet types are available" 
      },
    });

    const configOutput = configResult.find(r => r.ref === "output");
    if (configOutput && "data" in configOutput) {
      console.log("🤖:", configOutput.data);
    }

    console.log("\n🏦 Step 2: Create a Real Coinbase Wallet");
    console.log("----------------------------------------");

    const walletResult = await agent.send({
      context: walletAgentContext,
      args: { userId, platform: "cli", sessionId },
      input: { 
        type: "text", 
        data: "Create a real Coinbase wallet called 'Demo Testnet Wallet' on base-sepolia testnet" 
      },
    });

    const walletOutput = walletResult.find(r => r.ref === "output");
    if (walletOutput && "data" in walletOutput) {
      console.log("🤖:", walletOutput.data);
    }

    // Check for action results
    const walletActions = walletResult.filter(r => r.ref === "action_result");
    walletActions.forEach((action) => {
      if ("name" in action && "data" in action) {
        console.log(`🔧 Action: ${action.name} - ${action.data?.success ? '✅ Success' : '❌ Failed'}`);
        if (action.data?.address) {
          console.log(`📍 Wallet Address: ${action.data.address}`);
        }
      }
    });

    console.log("\n💰 Step 3: Fund Wallet with Testnet ETH");
    console.log("---------------------------------------");

    const fundResult = await agent.send({
      context: walletAgentContext,
      args: { userId, platform: "cli", sessionId },
      input: { 
        type: "text", 
        data: "Fund my Coinbase wallet with testnet ETH using the faucet" 
      },
    });

    const fundOutput = fundResult.find(r => r.ref === "output");
    if (fundOutput && "data" in fundOutput) {
      console.log("🤖:", fundOutput.data);
    }

    const fundActions = fundResult.filter(r => r.ref === "action_result");
    fundActions.forEach((action) => {
      if ("name" in action && "data" in action) {
        console.log(`🔧 Action: ${action.name} - ${action.data?.success ? '✅ Success' : '❌ Failed'}`);
        if (action.data?.transactionId) {
          console.log(`📋 Transaction ID: ${action.data.transactionId}`);
        }
      }
    });

    console.log("\n📊 Step 4: Check Wallet Balance");
    console.log("------------------------------");

    const balanceResult = await agent.send({
      context: walletAgentContext,
      args: { userId, platform: "cli", sessionId },
      input: { 
        type: "text", 
        data: "Check the balance of my Coinbase wallet" 
      },
    });

    const balanceOutput = balanceResult.find(r => r.ref === "output");
    if (balanceOutput && "data" in balanceOutput) {
      console.log("🤖:", balanceOutput.data);
    }

    console.log("\n📋 Step 5: List All Wallets");
    console.log("---------------------------");

    const listResult = await agent.send({
      context: walletAgentContext,
      args: { userId, platform: "cli", sessionId },
      input: { 
        type: "text", 
        data: "Show me all my Coinbase wallets and their details" 
      },
    });

    const listOutput = listResult.find(r => r.ref === "output");
    if (listOutput && "data" in listOutput) {
      console.log("🤖:", listOutput.data);
    }

    console.log("\n🎯 Step 6: Compare with Mock Wallet");
    console.log("-----------------------------------");

    const mockResult = await agent.send({
      context: walletAgentContext,
      args: { userId, platform: "cli", sessionId },
      input: { 
        type: "text", 
        data: "Create a mock simulation account called 'Mock Portfolio' with 10 ETH and 5000 USDC for testing" 
      },
    });

    const mockOutput = mockResult.find(r => r.ref === "output");
    if (mockOutput && "data" in mockOutput) {
      console.log("🤖:", mockOutput.data);
    }

    console.log("\n✅ Demo Complete!");
    console.log("==================");
    console.log("\n🎯 Key Points Demonstrated:");
    console.log("• Real Coinbase CDP wallet creation and management");
    console.log("• Testnet operations (faucet funding, balance checking)");
    console.log("• Seamless integration with existing mock/simulation features");
    console.log("• Multi-context architecture supporting both real and mock wallets");
    console.log("• Automatic SDK configuration detection and fallback to mock mode");
    
    console.log("\n🔧 Environment Setup:");
    console.log("• Set CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY for real operations");
    console.log("• Without keys, the system runs in mock mode for development");
    console.log("• Both modes work seamlessly within the same agent architecture");

  } catch (error) {
    console.error("\n❌ Demo Error:", error);
    console.log("\nThis is likely because CDP API keys are not configured.");
    console.log("The system will fall back to mock mode automatically.");
  }
}

// Configuration check
function checkConfiguration() {
  console.log("🔧 Configuration Check:");
  console.log("-----------------------");
  
  const hasApiKey = !!(process.env.CDP_API_KEY_NAME && process.env.CDP_API_KEY_PRIVATE_KEY);
  
  if (hasApiKey) {
    console.log("✅ CDP API keys detected - Real wallet operations enabled");
  } else {
    console.log("⚠️  CDP API keys not found - Running in mock mode");
    console.log("   To enable real wallets:");
    console.log("   export CDP_API_KEY_NAME='your-api-key-name'");
    console.log("   export CDP_API_KEY_PRIVATE_KEY='your-private-key'");
  }
  
  console.log("");
  return hasApiKey;
}

// Main execution
async function main() {
  checkConfiguration();
  await demonstrateCoinbaseIntegration();
}

if (require.main === module) {
  main().catch(console.error);
}

export { demonstrateCoinbaseIntegration };