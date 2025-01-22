/**
 * Example demonstrating a Twitter bot using the Daydreams package.
 * This bot can:
 * - Monitor Twitter mentions and auto-reply
 * - Generate autonomous thoughts and tweet them
 * - Maintain conversation memory using ChromaDB
 * - Process inputs through a character-based personality
 */

import { Core } from "../packages/core/src/core/core";
import { tweetSchema, TwitterClient } from "../packages/core/src/io/twitter";
import { RoomManager } from "../packages/core/src/core/room-manager";
import { ChromaVectorDB } from "../packages/core/src/core/vector-db";
import { Processor } from "../packages/core/src/core/processor";
import { LLMClient } from "../packages/core/src/core/llm-client";
import { env } from "../packages/core/src/core/env";
import { LogLevel } from "../packages/core/src/types";
import chalk from "chalk";
import { defaultCharacter } from "../packages/core/src/core/character";

import { Consciousness } from "../packages/core/src/core/consciousness";
import type { AnySchema, JSONSchemaType } from "ajv";
import { z } from "zod";

async function main() {
  const loglevel = LogLevel.ERROR;
  // Initialize core dependencies
  const vectorDb = new ChromaVectorDB("twitter_agent", {
    chromaUrl: "http://localhost:8000",
    logLevel: loglevel,
  });

  await vectorDb.purge(); // Clear previous session data

  const roomManager = new RoomManager(vectorDb);

  const llmClient = new LLMClient({
    model: "deepseek/deepseek-r1", // High performance model
  });

  // Initialize processor with default character personality
  const processor = new Processor(
    vectorDb,
    llmClient,
    defaultCharacter,
    LogLevel.INFO
  );

  // Initialize core system
  const core = new Core(roomManager, vectorDb, processor, {
    logging: {
      level: loglevel,
      enableColors: true,
      enableTimestamp: true,
    },
  });

  // Set up Twitter client with credentials
  const twitter = new TwitterClient(
    {
      username: env.TWITTER_USERNAME,
      password: env.TWITTER_PASSWORD,
      email: env.TWITTER_EMAIL,
    },
    loglevel
  );

  // Initialize autonomous thought generation
  const consciousness = new Consciousness(llmClient, roomManager, {
    intervalMs: 300000, // Think every 5 minutes
    minConfidence: 0.7,
    logLevel: loglevel,
  });

  // Register input handler for Twitter mentions
  core.registerInput({
    name: "twitter_mentions",
    handler: async () => {
      console.log(chalk.blue("🔍 Checking Twitter mentions..."));
      // Create a static mentions input handler
      const mentionsInput = twitter.createMentionsInput(60000);
      const mentions = await mentionsInput.handler();

      // If no new mentions, return null to skip processing
      if (!mentions || mentions.length === 0) {
        return null;
      }

      return mentions;
    },
    response: z.object({
      type: z.string(),
      content: z.string(),
      metadata: z.record(z.any()),
    }),
    interval: 60000, // Check mentions every minute
  });

  // Register input handler for autonomous thoughts
  core.registerInput({
    name: "consciousness_thoughts",
    handler: async () => {
      console.log(chalk.blue("🧠 Generating thoughts..."));
      const thought = await consciousness.start();

      // If no thought was generated or it was already processed, skip
      if (!thought || !thought.content) {
        return null;
      }

      return thought;
    },
    response: z.object({
      type: z.string(),
      content: z.string(),
      metadata: z.record(z.any()),
    }),
    interval: 300000, // Generate thoughts every 5 minutes
  });

  // Register output handler for posting thoughts to Twitter
  core.registerOutput({
    name: "twitter_thought",
    handler: async (data: unknown) => {
      const thoughtData = data as { content: string };
      return twitter.createTweetOutput().handler({
        content: thoughtData.content,
      });
    },
    schema: z.object({
      content: z
        .string()
        .regex(/^[\x20-\x7E]*$/, "No emojis or non-ASCII characters allowed"),
    }),
  });

  // Register output handler for Twitter replies
  core.registerOutput({
    name: "twitter_reply",
    handler: async (data: unknown) => {
      const tweetData = data as { content: string; inReplyTo: string };
      return twitter.createTweetOutput().handler(tweetData);
    },
    schema: z.object({
      content: z.string(),
      inReplyTo: z
        .string()
        .optional()
        .describe("The tweet ID to reply to, if any"),
    }),
  });

  // Start monitoring
  console.log(chalk.cyan("🤖 Bot is now running and monitoring Twitter..."));
  console.log(chalk.cyan("Press Ctrl+C to stop"));

  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    console.log(chalk.yellow("\n\nShutting down..."));

    // Clean up resources
    await consciousness.stop();
    core.removeInput("twitter_mentions");
    core.removeInput("consciousness_thoughts");
    core.removeOutput("twitter_reply");
    core.removeOutput("twitter_thought");

    console.log(chalk.green("✅ Shutdown complete"));
    process.exit(0);
  });
}

// Run the example
main().catch((error) => {
  console.error(chalk.red("Fatal error:"), error);
  process.exit(1);
});
