// This example shows how to use Supabase with DaydreamsAI.

// Vector Model Provider: gpt-4-turbo                    via @ai-sdk/openai
// Model Provider:        google/gemini-2.0-flash-001    via @openrouter/ai-sdk-provider
// Memory Store:          @daydreamsai/supabase
// CLI Extension:         @daydreamsai/cli

import { openai } from "@ai-sdk/openai";
import {
  createContainer,
  createDreams,
  Logger,
  LogLevel,
  validateEnv,
} from "@daydreamsai/core";
import { createSupabaseBaseMemory } from "@daydreamsai/supabase";
import { z } from "zod";
import { cliExtension } from "@daydreamsai/cli";
import { openrouter } from "@openrouter/ai-sdk-provider";

validateEnv(
  z.object({
    OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
    SUPABASE_URL: z.string().min(1, "SUPABASE_URL is required"),
    SUPABASE_SERVICE_KEY: z.string().min(1, "SUPABASE_SERVICE_KEY is required"),
    OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
  })
);

const agent = createDreams({
  container: createContainer(),
  logger: new Logger({ level: LogLevel.DEBUG }),
  model: openrouter("google/gemini-2.0-flash-001"),
  extensions: [cliExtension],
  memory: createSupabaseBaseMemory({
    url: process.env.SUPABASE_URL!,
    key: process.env.SUPABASE_SERVICE_KEY!,
    memoryTableName: "agent",
    vectorTableName: "agentVectors",
    vectorModel: openai("gpt-4-turbo"),
  }),
});

// Start the agent
await agent.start();
