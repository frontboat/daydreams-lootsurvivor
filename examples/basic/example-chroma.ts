// This example shows how to use the MongoDB memory store to store and retrieve memories.
// IMPORTANT: You will need to run the docker-compose.yml file in the root of the project to run the MongoDB instance.

import { createGroq } from "@ai-sdk/groq";
import { openai } from "@ai-sdk/openai";
import {
  createContainer,
  createDreams,
  Logger,
  LogLevel,
  validateEnv,
} from "@daydreamsai/core";
import { createChromaVectorStore } from "@daydreamsai/chromadb";
import { createMongoMemoryStore } from "@daydreamsai/mongodb";
import { z } from "zod";
import { cliExtension } from "@daydreamsai/cli";

const env = validateEnv(
  z.object({
    GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
    OPENAI_API_KEY: z.string().min(1, "OPENAI_API_KEY is required"),
  })
);

const groq = createGroq({
  apiKey: env.GROQ_API_KEY!,
});

const mongo = await createMongoMemoryStore({
  collectionName: "agent",
  uri: "mongodb://localhost:27017",
});
const chroma = createChromaVectorStore("agent", "http://localhost:8000");

const agent = createDreams({
  container: createContainer(),
  logger: new Logger({ level: LogLevel.DEBUG }),
  model: groq("deepseek-r1-distill-llama-70b"),
  extensions: [cliExtension],
  memory: {
    store: mongo,
    vector: chroma,
    vectorModel: openai("gpt-4-turbo"),
  },
});

// Start the agent
await agent.start();
