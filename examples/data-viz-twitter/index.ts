import { enhancedTwitter } from "@daydreamsai/twitter";
import { createDreams, LogLevel, validateEnv } from "@daydreamsai/core";
import { z } from "zod";
import { openrouter } from "@openrouter/ai-sdk-provider";

const env = validateEnv(
  z.object({
    TWITTER_USERNAME: z.string().min(1, "TWITTER_USERNAME is required"),
    TWITTER_PASSWORD: z.string().min(1, "TWITTER_PASSWORD is required"),
    TWITTER_EMAIL: z.string().min(1, "TWITTER_EMAIL is required"),
    OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  })
);

console.log(env);

const agent = createDreams({
  logLevel: LogLevel.DEBUG,
  model: openrouter("google/gemini-2.5-flash-preview-05-20"),
  extensions: [enhancedTwitter],
});

// Start the agent
await agent.start();
