import { createContainer, createDreams, LogLevel } from "@daydreamsai/core";
import { cli } from "@daydreamsai/core/extensions";
import { deepResearch } from "./research";
import { tavily } from "@tavily/core";
import { anthropic } from "@ai-sdk/anthropic";
const container = createContainer();

container.singleton("tavily", () =>
  tavily({
    apiKey: process.env.TAVILY_API_KEY!,
  })
);

createDreams({
  logger: LogLevel.DEBUG,
  model: anthropic("claude-3-7-sonnet-latest"),
  debugger: async (contextId, keys, data) => {
    const [type, id] = keys;
    await Bun.write(`./logs/${contextId}/${id}-${type}.md`, data);
  },
  extensions: [cli, deepResearch],
  container,
}).start();
