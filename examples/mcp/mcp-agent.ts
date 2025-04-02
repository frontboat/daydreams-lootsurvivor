import { createDreams } from "@daydreamsai/core";
import { createMcpExtension } from "@daydreamsai/core/extensions";
import { LogLevel } from "@daydreamsai/core";
import path from "path";
import { anthropic } from "@ai-sdk/anthropic";
import { cli } from "@daydreamsai/core/extensions";

/**
 * This example demonstrates how to create an agent that connects to an MCP server
 * and uses its resources through the MCP extension.
 *
 * It sets up a connection to a local MCP server that provides access to resources
 * like application logs.
 */

// Create an agent with the MCP extension
createDreams({
  model: anthropic("claude-3-7-sonnet-latest"),
  logger: LogLevel.INFO,

  // Add the MCP extension with the example server configuration
  extensions: [
    cli,
    createMcpExtension([
      {
        id: "example-server",
        name: "Example Resource Server",
        transport: {
          type: "stdio",
          command: "node",
          args: [path.join(__dirname, "mcp-server-example.mjs")],
        },
      },
    ]),
  ],
}).start();
