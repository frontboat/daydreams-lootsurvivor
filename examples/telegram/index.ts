import { createGroq } from "@ai-sdk/groq";
import { createDreams, LogLevel, validateEnv } from "@daydreamsai/core";
import { telegram } from "@daydreamsai/telegram";
import { deepResearch } from "../deep-research/research";
import { z } from "zod";

const env = validateEnv(
  z.object({
    TELEGRAM_TOKEN: z.string().min(1, "TELEGRAM_TOKEN is required"),
    TELEGRAM_BOT_NAME: z.string().min(1, "TELEGRAM_BOT_NAME is required"),
    GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
    TAVILY_API_KEY: z.string().min(1, "TAVILY_API_KEY is required"),
    OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  })
);

const groq = createGroq({
  apiKey: env.GROQ_API_KEY!,
});

createDreams({
  logger: LogLevel.DEBUG,
  model: groq("deepseek-r1-distill-llama-70b"),
  extensions: [telegram, deepResearch],
}).start();
