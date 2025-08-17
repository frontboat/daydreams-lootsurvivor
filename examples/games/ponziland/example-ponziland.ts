import { createDreams, createMemoryStore, LogLevel } from "@daydreamsai/core";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createChromaVectorStore } from "@daydreamsai/chroma";
import { StarknetChain } from "@daydreamsai/defai";
import { ponziland } from "./ponziland/ponziland";
import { Logger } from "@daydreamsai/core";
import { discord } from "@daydreamsai/discord";

let openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const chain = new StarknetChain({
  rpcUrl: process.env.STARKNET_RPC_URL ?? "",
  address: process.env.STARKNET_ADDRESS ?? "",
  privateKey: process.env.STARKNET_PRIVATE_KEY ?? "",
});

const logger = new Logger({
  level: LogLevel.ERROR,
});

const agent = createDreams({
  logger: logger,
  model: openrouter("google/gemini-2.0-flash-001"),
  extensions: [discord, ponziland(chain)],
  streaming: false,
});

// Start the agent
await agent.start();
