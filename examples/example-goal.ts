// This is a simple example of how to use the Daydreams package
// It runs a simple goal-based agent that can be used to plan and execute goals

// Who to customise:
// 1. Define a new context for the agent. Similar to ETERNUM_CONTEXT
// 2. Inject the next context into the agent

import { env } from "../packages/core/src/core/env";

import { LLMClient } from "../packages/core/src/core/llm-client";
import { ChainOfThought } from "../packages/core/src/core/chain-of-thought";
import { ETERNUM_CONTEXT } from "./eternum-context";
import * as readline from "readline";
import { type GoalStatus } from "../packages/core/src/core/goal-manager";
import chalk from "chalk";
import { starknetTransactionAction } from "../packages/core/src/core/actions/starknet-transaction";
import { starknetReadAction } from "../packages/core/src/core/actions/starknet-read";
import { graphqlAction } from "../packages/core/src/core/actions/graphql";
import {
  graphqlFetchSchema,
  starknetTransactionSchema,
} from "../packages/core/src/core/validation";
import type { JSONSchemaType } from "ajv";
import type { CoTAction } from "../packages/core/src/types";

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

// This is a simple function to fetch the context from a remote source
async function fetchContext() {
  try {
    const response = await fetch(
      "https://raw.githubusercontent.com/daydreamsai/sleeves/main/sleeves/eternum.json"
    );
    const data = await response.json();
    return data.context;
  } catch (error) {
    console.error(chalk.red("Failed to fetch context:"), error);
    throw error;
  }
}

async function main() {
  // Initialize LLM client
  const llmClient = new LLMClient({
    provider: "anthropic",
    apiKey: env.ANTHROPIC_API_KEY,
  });

  const context = ETERNUM_CONTEXT;

  const dreams = new ChainOfThought(llmClient, {
    worldState: context,
  });

  // Register actions
  dreams.registerAction(
    "EXECUTE_TRANSACTION",
    starknetTransactionAction,
    {
      description: "Execute a transaction on the Starknet blockchain",
      example: JSON.stringify({
        contractAddress: "0x1234567890abcdef",
        entrypoint: "execute",
        calldata: [1, 2, 3],
      }),
    },
    starknetTransactionSchema as JSONSchemaType<any>
  );

  dreams.registerAction(
    "GRAPHQL_FETCH",
    graphqlAction,
    {
      description: "Fetch data from the GraphQL API",
      example: JSON.stringify({
        query:
          "query GetExampleInfo { get_example_info(where: { example_id: 42 }) { edges { node { ... on example_info { example_id level } } } } }",
      }),
    },
    graphqlFetchSchema as JSONSchemaType<any>
  );

  // Register actions
  dreams.registerAction(
    "READ_CONTRACT",
    starknetReadAction,
    {
      description: "Read data from the Starknet blockchain",
      example: JSON.stringify({
        contractAddress: "0x1234567890abcdef",
        entrypoint: "read",
        calldata: [1, 2, 3],
      }),
    },
    starknetTransactionSchema as JSONSchemaType<any>
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
