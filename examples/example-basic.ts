// This is a simple example of how to use the Daydreams package
// It runs a simple goal-based agent that can be used to plan and execute goals

// Who to customise:
// 1. Define a new context for the agent. Similar to ETERNUM_CONTEXT
// 2. Inject the next context into the agent

import { env } from "../packages/core/src/core/env";

import { LLMClient } from "../packages/core/src/core/llm-client";
import { ChainOfThought } from "../packages/core/src/core/chain-of-thought";
// import { ETERNUM_CONTEXT, PROVIDER_GUIDE } from "./eternum-context";
import { SOLANA_CONTEXT, PROVIDER_GUIDE } from "./solana-context";
import * as readline from "readline";

import chalk from "chalk";
import { starknetTransactionAction } from "../packages/core/src/core/actions/starknet-transaction";
import { starknetReadAction } from "../packages/core/src/core/actions/starknet-read";
// import { graphqlAction } from "../packages/core/src/core/actions/graphql";
import { solanaTransactionAction } from "../packages/core/src/core/actions/solana-transaction";
import { jupiterQuoteAction, jupiterSwapAction } from "../packages/core/src/core/actions/jupiter-actions";
import {
  graphqlFetchSchema,
  starknetTransactionSchema,
  solanaTransactionSchema,
  jupiterQuoteSchema,
  jupiterSwapSchema
} from "../packages/core/src/core/validation";
import type { JSONSchemaType } from "ajv";
import { ChromaVectorDB } from "../packages/core/src/core/vector-db";
import { GoalStatus } from "../packages/core/src/types";
import { jupiterPriceAction, jupiterTokenSearchAction, jupiterRouteAction } from "../packages/core/src/core/actions/jupiter-price";
import { 
  jupiterPriceSchema, 
  jupiterTokenSearchSchema, 
  jupiterRouteSchema 
} from "../packages/core/src/core/validation";

async function getCliInput(prompt: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(prompt, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function printGoalStatus(status: GoalStatus): string {
  const colors: Record<GoalStatus, string> = {
    pending: chalk.yellow("⏳ PENDING"),
    active: chalk.blue("▶️ ACTIVE"),
    completed: chalk.green("✅ COMPLETED"),
    failed: chalk.red("❌ FAILED"),
    ready: chalk.cyan("🎯 READY"),
    blocked: chalk.red("🚫 BLOCKED"),
  };
  return colors[status] || status;
}

async function main() {
  // Initialize LLM client
  const llmClient = new LLMClient({
    model: "deepseek/deepseek-r1", // clutch model!
  });

  // Initialize memory
  const memory = new ChromaVectorDB("agent_memory");

  // Load initial context
  await memory.storeDocument({
    title: "Trade Rules",
    content: SOLANA_CONTEXT,
    category: "rules",
    tags: ["trade-mechanics", "rules"],
    lastUpdated: new Date(),
  });

  // Load provider guide
  await memory.storeDocument({
    title: "Provider Guide",
    content: PROVIDER_GUIDE,
    category: "rules",
    tags: ["provider-guide"],
    lastUpdated: new Date(),
  });

  const dreams = new ChainOfThought(llmClient, memory, {
    worldState: SOLANA_CONTEXT,
  });

  // Register Jupiter Quote Action
  dreams.registerAction(
    "JUPITER_QUOTE",
    jupiterQuoteAction,
    {
      description: "Get a quote for swapping tokens using Jupiter",
      example: JSON.stringify({
        inputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  // USDC
        outputMint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",  // USDT
        amount: "1000000",  // 1 USDC (6 decimals)
        slippageBps: 50
      })
    },
    jupiterQuoteSchema as JSONSchemaType<any>
  );

  // Register Jupiter Swap Action
  dreams.registerAction(
    "JUPITER_SWAP",
    jupiterSwapAction,
    {
      description: "Execute a token swap using Jupiter",
      example: JSON.stringify({
        quoteResponse: {
          inputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
          inAmount: "1000000",
          outputMint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
          outAmount: "999000",
          otherAmountThreshold: "994000",
          swapMode: "ExactIn",
          slippageBps: 50,
          priceImpactPct: "0.1",
          routePlan: []
        },
        userPublicKey: "USER_WALLET_ADDRESS"
      })
    },
    jupiterSwapSchema as JSONSchemaType<any>
  );

  // Register basic Solana Transaction Action (for non-Jupiter operations)
  dreams.registerAction(
    "SOLANA_TRANSACTION",
    solanaTransactionAction,
    {
      description: "Execute a basic Solana transaction",
      example: JSON.stringify({
        programId: "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
        instruction: "transfer",
        data: [1000000],
        accounts: [
          {
            pubkey: "sender_pubkey",
            isSigner: true,
            isWritable: true
          },
          {
            pubkey: "recipient_pubkey",
            isSigner: false,
            isWritable: true
          }
        ]
      })
    },
    solanaTransactionSchema as JSONSchemaType<any>
  );

  // Register Jupiter Price Action
  dreams.registerAction(
    "JUPITER_PRICE",
    jupiterPriceAction,
    {
      description: "Get current prices for tokens using Jupiter Price API",
      example: JSON.stringify({
        ids: ["EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"],
        vsToken: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        vsAmount: 1
      })
    },
    jupiterPriceSchema as JSONSchemaType<any>
  );

  // Register Jupiter Token Search Action
  dreams.registerAction(
    "JUPITER_TOKEN_SEARCH",
    jupiterTokenSearchAction,
    {
      description: "Search for tokens supported by Jupiter",
      example: JSON.stringify({
        query: "USDC",
        limit: 5
      })
    },
    jupiterTokenSearchSchema as JSONSchemaType<any>
  );

  // Register Jupiter Route Action
  dreams.registerAction(
    "JUPITER_ROUTE",
    jupiterRouteAction,
    {
      description: "Find optimal swap routes between tokens",
      example: JSON.stringify({
        inputMint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",  // USDC
        outputMint: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",  // USDT
        amount: "1000000",  // 1 USDC
        slippageBps: 50,
        onlyDirectRoutes: false,
        restrictIntermediateTokens: true
      })
    },
    jupiterRouteSchema as JSONSchemaType<any>
  );

  // Subscribe to events
  dreams.on("step", (step) => {
    if (step.type === "system") {
      console.log("\n💭 System prompt:", step.content);
    } else {
      console.log("\n🤔 New thought step:", {
        content: step.content,
        tags: step.tags,
      });
    }
  });

  // llmClient.on("trace:tokens", ({ input, output }) => {
  //   console.log("\n💡 Tokens used:", { input, output });
  // });

  dreams.on("action:start", (action) => {
    console.log("\n🎬 Starting action:", {
      type: action.type,
      payload: action.payload,
    });
  });

  dreams.on("action:complete", ({ action, result }) => {
    console.log("\n✅ Action complete:", {
      type: action.type,
      result,
    });
  });

  dreams.on("action:error", ({ action, error }) => {
    console.log("\n❌ Action failed:", {
      type: action.type,
      error,
    });
  });

  dreams.on("think:start", ({ query }) => {
    console.log("\n🧠 Starting to think about:", query);
  });

  dreams.on("think:complete", ({ query }) => {
    console.log("\n🎉 Finished thinking about:", query);
  });

  dreams.on("think:timeout", ({ query }) => {
    console.log("\n⏰ Thinking timed out for:", query);
  });

  dreams.on("think:error", ({ query, error }) => {
    console.log("\n💥 Error while thinking about:", query, error);
  });

  // Add goal-related event handlers
  dreams.on("goal:created", ({ id, description }) => {
    console.log(chalk.cyan("\n🎯 New goal created:"), {
      id,
      description,
    });
  });

  dreams.on("goal:updated", ({ id, status }) => {
    console.log(chalk.yellow("\n📝 Goal status updated:"), {
      id,
      status: printGoalStatus(status),
    });
  });

  dreams.on("goal:completed", ({ id, result }) => {
    console.log(chalk.green("\n✨ Goal completed:"), {
      id,
      result,
    });
  });

  dreams.on("goal:failed", ({ id, error }) => {
    console.log(chalk.red("\n💥 Goal failed:"), {
      id,
      error: error instanceof Error ? error.message : String(error),
    });
  });

  // Add memory-related event handlers
  dreams.on("memory:experience_stored", ({ experience }) => {
    console.log(chalk.blue("\n💾 New experience stored:"), {
      action: experience.action,
      outcome: experience.outcome,
      importance: experience.importance,
      timestamp: experience.timestamp,
    });

    // If there are emotions, show them
    if (experience.emotions?.length) {
      console.log(
        chalk.blue("😊 Emotional context:"),
        experience.emotions.join(", ")
      );
    }
  });

  dreams.on("memory:knowledge_stored", ({ document }) => {
    console.log(chalk.magenta("\n📚 New knowledge documented:"), {
      title: document.title,
      category: document.category,
      tags: document.tags,
      lastUpdated: document.lastUpdated,
    });
    console.log(chalk.magenta("📝 Content:"), document.content);
  });

  dreams.on("memory:experience_retrieved", ({ experiences }) => {
    console.log(chalk.yellow("\n🔍 Relevant past experiences found:"));
    experiences.forEach((exp, index) => {
      console.log(chalk.yellow(`\n${index + 1}. Previous Experience:`));
      console.log(`   Action: ${exp.action}`);
      console.log(`   Outcome: ${exp.outcome}`);
      console.log(`   Importance: ${exp.importance || "N/A"}`);
      if (exp.emotions?.length) {
        console.log(`   Emotions: ${exp.emotions.join(", ")}`);
      }
    });
  });

  dreams.on("memory:knowledge_retrieved", ({ documents }) => {
    console.log(chalk.green("\n📖 Relevant knowledge retrieved:"));
    documents.forEach((doc, index) => {
      console.log(chalk.green(`\n${index + 1}. Knowledge Entry:`));
      console.log(`   Title: ${doc.title}`);
      console.log(`   Category: ${doc.category}`);
      console.log(`   Tags: ${doc.tags.join(", ")}`);
      console.log(`   Content: ${doc.content}`);
    });
  });

  while (true) {
    console.log(chalk.cyan("\n🤖 Enter your goal (or 'exit' to quit):"));
    const userInput = await getCliInput("> ");

    if (userInput.toLowerCase() === "exit") {
      console.log(chalk.yellow("Goodbye! 👋"));
      break;
    }

    try {
      // First, plan the strategy for the goal
      console.log(chalk.cyan("\n🤔 Planning strategy for goal..."));
      await dreams.planStrategy(userInput);

      // Execute goals until completion or failure
      console.log(chalk.cyan("\n🎯 Executing goals..."));

      const stats = {
        completed: 0,
        failed: 0,
        total: 0,
      };

      // Keep executing goals until no more ready goals
      while (true) {
        const readyGoals = dreams.goalManager.getReadyGoals();
        const activeGoals = dreams.goalManager
          .getGoalsByHorizon("short")
          .filter((g) => g.status === "active");
        const pendingGoals = dreams.goalManager
          .getGoalsByHorizon("short")
          .filter((g) => g.status === "pending");

        // Print current status
        console.log(chalk.cyan("\n📊 Current Progress:"));
        console.log(`Ready goals: ${readyGoals.length}`);
        console.log(`Active goals: ${activeGoals.length}`);
        console.log(`Pending goals: ${pendingGoals.length}`);
        console.log(`Completed: ${stats.completed}`);
        console.log(`Failed: ${stats.failed}`);

        if (
          readyGoals.length === 0 &&
          activeGoals.length === 0 &&
          pendingGoals.length === 0
        ) {
          console.log(chalk.green("\n✨ All goals completed!"));
          break;
        }

        if (readyGoals.length === 0 && activeGoals.length === 0) {
          console.log(
            chalk.yellow(
              "\n⚠️ No ready or active goals, but some goals are pending:"
            )
          );
          pendingGoals.forEach((goal) => {
            const blockingGoals = dreams.goalManager.getBlockingGoals(goal.id);
            console.log(chalk.yellow(`\n📌 Pending Goal: ${goal.description}`));
            console.log(
              chalk.yellow(`   Blocked by: ${blockingGoals.length} goals`)
            );
            blockingGoals.forEach((blocking) => {
              console.log(
                chalk.yellow(
                  `   - ${blocking.description} (${blocking.status})`
                )
              );
            });
          });
          break;
        }

        try {
          await dreams.executeNextGoal();
          stats.completed++;
        } catch (error) {
          console.error(chalk.red("\n❌ Goal execution failed:"), error);
          stats.failed++;

          // Check if we should continue
          const shouldContinue = await getCliInput(
            chalk.yellow("\nContinue executing remaining goals? (y/n): ")
          );

          if (shouldContinue.toLowerCase() !== "y") {
            console.log(chalk.yellow("Stopping goal execution."));
            break;
          }
        }

        stats.total++;
      }

      // Add learning summary after goal execution
      console.log(chalk.cyan("\n📊 Learning Summary:"));

      // Get recent experiences
      const recentExperiences = await dreams.memory.getRecentEpisodes(5);
      console.log(chalk.blue("\n🔄 Recent Experiences:"));
      recentExperiences.forEach((exp, index) => {
        console.log(chalk.blue(`\n${index + 1}. Experience:`));
        console.log(`   Action: ${exp.action}`);
        console.log(`   Outcome: ${exp.outcome}`);
        console.log(`   Importance: ${exp.importance || "N/A"}`);
      });

      // Get relevant documents for the current context
      const relevantDocs = await dreams.memory.findSimilarDocuments(
        userInput,
        3
      );
      console.log(chalk.magenta("\n📚 Accumulated Knowledge:"));
      relevantDocs.forEach((doc, index) => {
        console.log(chalk.magenta(`\n${index + 1}. Knowledge Entry:`));
        console.log(`   Title: ${doc.title}`);
        console.log(`   Category: ${doc.category}`);
        console.log(`   Tags: ${doc.tags.join(", ")}`);
      });

      // Final summary with stats
      console.log(chalk.cyan("\n📊 Final Execution Summary:"));
      console.log(chalk.green(`✅ Completed Goals: ${stats.completed}`));
      console.log(chalk.red(`❌ Failed Goals: ${stats.failed}`));
      console.log(
        chalk.blue(
          `📈 Success Rate: ${Math.round(
            (stats.completed / stats.total) * 100
          )}%`
        )
      );
      console.log(
        chalk.yellow(
          `🧠 Learning Progress: ${recentExperiences.length} new experiences, ${relevantDocs.length} relevant knowledge entries`
        )
      );
    } catch (error) {
      console.error(chalk.red("Error processing goal:"), error);
    }
  }

  // Handle shutdown
  process.on("SIGINT", async () => {
    console.log(chalk.yellow("\nShutting down..."));
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(chalk.red("Fatal error:"), error);
  process.exit(1);
});
