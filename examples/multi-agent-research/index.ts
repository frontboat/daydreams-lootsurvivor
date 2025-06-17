import { createContainer, createDreams, LogLevel } from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import { multiAgentResearch } from "./multi-agent-research.js";
import { tavily } from "@tavily/core";
import { anthropic } from "@ai-sdk/anthropic";

const container = createContainer();

// Register external services
container.singleton("tavily", () =>
  tavily({
    apiKey: process.env.TAVILY_API_KEY!,
  })
);

// Create the multi-agent research system
const agent = createDreams({
  logLevel: LogLevel.DEBUG,
  model: anthropic("claude-sonnet-4-20250514"),
  reasoningModel: anthropic("claude-sonnet-4-20250514"), // Use same model for reasoning
  debugger: async (contextId, keys, data) => {
    const [type, id] = keys;
    // Create logs directory structure
    await Bun.write(`./logs/${contextId}/${id}-${type}.md`, data);
  },
  extensions: [cliExtension, multiAgentResearch],
  container,
});

// Start the system
agent.start().then(() => {
  console.log("🔬 Multi-Agent Research System started!");
  console.log("Try asking: 'Research the current state of AI agents in 2025'");
  console.log(
    "Or: 'what are all the companies in the united states working on AI agents in 2025? make a list of at least 100.'"
  );
});
