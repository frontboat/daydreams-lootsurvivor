import { createDreams, Logger, LogLevel } from "@daydreamsai/core";
import { createMcpExtension } from "@daydreamsai/mcp";
import { cliExtension } from "@daydreamsai/cli";
import { openrouter } from "@openrouter/ai-sdk-provider";

/**
 * This example demonstrates how to create an agent that connects to multiple
 * MCP servers, in this case for Firecrawl (web scraping) and Blender (3D rendering).
 *
 * The agent will be able to access tools from both servers by specifying the
 * serverId in its action calls.
 */

createDreams({
    model: openrouter("google/gemini-2.0-flash-001"),
    logger: new Logger({
        level: LogLevel.INFO,
    }),
    extensions: [
        cliExtension,
        // Configure your MCPs
        createMcpExtension([
            {
                id: "firecrawl-mcp",
                name: "Firecrawl MCP Server",
                transport: {
                    type: "stdio",
                    command: "npx",
                    args: ["-y", "firecrawl-mcp"],
                },
            },
            {
                id: "blender-mcp",
                name: "Blender MCP Server",
                transport: {
                    type: "stdio",
                    command: "uvx",
                    args: ["blender-mcp"],
                },
            },
        ]),
    ],
}).start();
