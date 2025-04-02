import { z } from "zod";
import { createMcpClient } from "./client";
import type { Extension, ActionCall } from "../../types";
import { Logger } from "../../logger";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { extension } from "../../utils";

export interface McpServerConfig {
  id: string;
  name: string;
  transport: {
    type: "stdio" | "sse";
    // For stdio transport
    command?: string;
    args?: string[];
    // For SSE transport
    serverUrl?: string;
    sseEndpoint?: string;
    messageEndpoint?: string;
  };
  capabilities?: {
    prompts?: Record<string, unknown>;
    resources?: Record<string, unknown>;
    tools?: Record<string, unknown>;
  };
}

/**
 * Creates an extension that connects to one or more MCP servers
 * and exposes their capabilities as actions within the agent system.
 *
 * @param servers Configuration for one or more MCP servers to connect to
 * @returns An extension that can be added to the agent's extensions list
 */
export function createMcpExtension(servers: McpServerConfig[]): Extension {
  const clients = new Map<string, Client>();

  return extension({
    name: "mcp",

    // Initialize MCP clients when the extension is installed
    async install(agent) {
      const logger = agent.container.resolve<Logger>("logger");

      logger.info("mcp:extension", "Installing MCP extension", {
        serversCount: servers.length,
      });

      // Connect to each configured MCP server
      for (const server of servers) {
        logger.debug("mcp:extension", "Connecting to MCP server", {
          id: server.id,
          name: server.name,
          transportType: server.transport.type,
        });

        try {
          const client = await createMcpClient({
            clientInfo: {
              name: `daydreams-mcp-client`,
              version: "1.0.0",
            },
            transport: server.transport,
            capabilities: server.capabilities,
          });

          clients.set(server.id, client);
          logger.info("mcp:extension", "Connected to MCP server", {
            id: server.id,
            name: server.name,
          });
        } catch (error) {
          logger.error("mcp:extension", "Failed to connect to MCP server", {
            id: server.id,
            name: server.name,
            error,
          });
        }
      }
    },

    // Define actions for interacting with MCP servers
    actions: [
      // Action to list available prompts from a specific MCP server
      {
        name: "mcp.listPrompts",
        description: "List available prompts from an MCP server",
        schema: z.object({
          serverId: z.string().describe("ID of the MCP server to query"),
        }),
        async handler(call: ActionCall<{ serverId: string }>, ctx, agent) {
          const logger = agent.container.resolve<Logger>("logger");
          const { serverId } = call.data;

          const client = clients.get(serverId);
          if (!client) {
            return {
              error: `MCP server with ID '${serverId}' not found`,
            };
          }

          try {
            const prompts = await client.listPrompts();
            return { prompts };
          } catch (error) {
            logger.error("mcp:action", "Failed to list prompts", {
              serverId,
              error,
            });
            return { error: String(error) };
          }
        },
      },

      // Action to get a prompt from a specific MCP server
      {
        name: "mcp.getPrompt",
        description: "Get a prompt from an MCP server",
        schema: z.object({
          serverId: z.string().describe("ID of the MCP server to query"),
          name: z.string().describe("Name of the prompt to get"),
          arguments: z
            .record(z.any())
            .optional()
            .describe("Arguments for the prompt"),
        }),
        async handler(
          call: ActionCall<{
            serverId: string;
            name: string;
            arguments?: Record<string, any>;
          }>,
          ctx,
          agent
        ) {
          const logger = agent.container.resolve<Logger>("logger");
          const { serverId, name, arguments: args } = call.data;

          const client = clients.get(serverId);
          if (!client) {
            return {
              error: `MCP server with ID '${serverId}' not found`,
            };
          }

          try {
            const prompt = await client.getPrompt({
              name,
              arguments: args || {},
            });
            return { prompt };
          } catch (error) {
            logger.error("mcp:action", "Failed to get prompt", {
              serverId,
              name,
              error,
            });
            return { error: String(error) };
          }
        },
      },

      // Action to list available resources from a specific MCP server
      {
        name: "mcp.listResources",
        description: "List available resources from an MCP server",
        schema: z.object({
          serverId: z.string().describe("ID of the MCP server to query"),
        }),
        async handler(call: ActionCall<{ serverId: string }>, ctx, agent) {
          const logger = agent.container.resolve<Logger>("logger");
          const { serverId } = call.data;

          const client = clients.get(serverId);
          if (!client) {
            return {
              error: `MCP server with ID '${serverId}' not found`,
            };
          }

          try {
            const resources = await client.listResources();
            return { resources };
          } catch (error) {
            logger.error("mcp:action", "Failed to list resources", {
              serverId,
              error,
            });
            return { error: String(error) };
          }
        },
      },

      // Action to read a resource from a specific MCP server
      {
        name: "mcp.readResource",
        description: "Read a resource from an MCP server",
        schema: z.object({
          serverId: z.string().describe("ID of the MCP server to query"),
          uri: z.string().describe("URI of the resource to read"),
        }),
        async handler(
          call: ActionCall<{ serverId: string; uri: string }>,
          ctx,
          agent
        ) {
          const logger = agent.container.resolve<Logger>("logger");
          const { serverId, uri } = call.data;

          const client = clients.get(serverId);
          if (!client) {
            return {
              error: `MCP server with ID '${serverId}' not found`,
            };
          }

          try {
            const resource = await client.readResource({
              uri,
            });
            return { resource };
          } catch (error) {
            logger.error("mcp:action", "Failed to read resource", {
              serverId,
              uri,
              error,
            });
            return { error: String(error) };
          }
        },
      },

      // Action to call a tool on a specific MCP server
      {
        name: "mcp.callTool",
        description: "Call a tool on an MCP server",
        schema: z.object({
          serverId: z.string().describe("ID of the MCP server to query"),
          name: z.string().describe("Name of the tool to call"),
          arguments: z
            .record(z.any())
            .optional()
            .describe("Arguments for the tool"),
        }),
        async handler(
          call: ActionCall<{
            serverId: string;
            name: string;
            arguments?: Record<string, any>;
          }>,
          ctx,
          agent
        ) {
          const logger = agent.container.resolve<Logger>("logger");
          const { serverId, name, arguments: args } = call.data;

          const client = clients.get(serverId);
          if (!client) {
            return {
              error: `MCP server with ID '${serverId}' not found`,
            };
          }

          try {
            const result = await client.callTool({
              name,
              arguments: args || {},
            });
            return { result };
          } catch (error) {
            logger.error("mcp:action", "Failed to call tool", {
              serverId,
              name,
              error,
            });
            return { error: String(error) };
          }
        },
      },

      // Action to list all connected MCP servers
      {
        name: "mcp.listServers",
        description: "List all connected MCP servers",
        schema: undefined,
        async handler() {
          const serverList = servers.map((server) => ({
            id: server.id,
            name: server.name,
            connected: clients.has(server.id),
            transportType: server.transport.type,
          }));

          return { servers: serverList };
        },
      },

      // Action to list available tools from a specific MCP server
      {
        name: "mcp.listTools",
        description: "List available tools from an MCP server",
        schema: z.object({
          serverId: z.string().describe("ID of the MCP server to query"),
        }),
        async handler(call: ActionCall<{ serverId: string }>, ctx, agent) {
          const logger = agent.container.resolve<Logger>("logger");
          const { serverId } = call.data;

          const client = clients.get(serverId);
          if (!client) {
            return {
              error: `MCP server with ID '${serverId}' not found`,
            };
          }

          try {
            const tools = await client.listTools();
            return { tools };
          } catch (error) {
            logger.error("mcp:action", "Failed to list tools", {
              serverId,
              error,
            });
            return { error: String(error) };
          }
        },
      },
    ],
  });
}
