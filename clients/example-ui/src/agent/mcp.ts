import { z } from "zod";
import { action, context, http } from "@daydreamsai/core";

function createHttpJsonClient(
  serverUrl: string,
  defaultOptions: Partial<RequestInit> = {}
): {
  get: typeof http.get.json;
  post: typeof http.post.json;
} {
  return {
    get: (url, params, options) =>
      http.get.json(`${serverUrl}${url}`, params, {
        ...defaultOptions,
        ...options,
      }),
    post: (url, params, options) =>
      http.post.json(`${serverUrl}${url}`, params, {
        ...defaultOptions,
        ...options,
      }),
  };
}

function createMcpProxyClient(url: string) {
  const client = createHttpJsonClient(url);

  return {
    async listServers() {
      const { servers } = await client.get("/mcp/servers");
      return servers;
    },
    async listTools(serverId: string) {
      const { tools } = await client.get(`/mcp/servers/${serverId}/tools`);
      return tools;
    },
    async callTool({
      serverId,
      name,
      args,
    }: {
      serverId: string;
      name: string;
      args: any;
    }) {
      const { result } = await client.post(
        `/mcp/servers/${serverId}/tools/${name}`,
        {
          args,
        }
      );
      return result;
    },
  };
}

export const mcpContext = context({
  type: "mcp",
  description:
    "Each MCP server can provide multiple tools with different capabilities.",
  schema: { id: z.string() },
  key: ({ id }) => id,
  setup() {
    return {
      client: createMcpProxyClient("/api"),
    };
  },
  async create({ options }): Promise<{ servers: string[] }> {
    const servers = await options.client.listServers();
    return {
      servers,
    };
  },
  async loader({ memory, options }) {
    const servers = await options.client.listServers();
    memory.servers = servers;
  },
}).setActions([
  // Action to list available tools from a specific MCP server
  action({
    name: "mcp.listTools",
    description: "List available tools from an MCP server",
    schema: {
      serverId: z.string().describe("ID of the MCP server to query"),
    },
    async handler({ serverId }, { options }) {
      const tools = await options.client.listTools(serverId);
      return { tools };
    },
  }),
  // Action to call a tool on a specific MCP server
  action({
    name: "mcp.callTool",
    description: "Call a tool on an MCP server",
    schema: {
      serverId: z.string().describe("ID of the MCP server to query"),
      name: z.string().describe("Name of the tool to call"),
      arguments: z
        .record(z.any())
        .optional()
        .describe("Arguments for the tool"),
    },
    async handler({ serverId, name, arguments: args }, { options }) {
      const result = await options.client.callTool({
        serverId,
        name,
        args,
      });

      return result;
    },
  }),
  // // Action to list available prompts from a specific MCP server
  // action({
  //   name: "mcp.listPrompts",
  //   description: "List available prompts from an MCP server",
  //   schema: {
  //     serverId: z.string().describe("ID of the MCP server to query"),
  //   },
  //   async handler({ serverId }, { options }) {
  //     const prompts = await options.client.listPrompts(serverId);
  //     return { prompts };
  //   },
  // }),

  // // Action to get a prompt from a specific MCP server
  // action({
  //   name: "mcp.getPrompt",
  //   description: "Get a prompt from an MCP server",
  //   schema: {
  //     serverId: z.string().describe("ID of the MCP server to query"),
  //     name: z.string().describe("Name of the prompt to get"),
  //     arguments: z
  //       .record(z.any())
  //       .optional()
  //       .describe("Arguments for the prompt"),
  //   },
  //   async handler({ serverId, name, arguments: args }, ctx, agent) {
  //     const client = clients.get(serverId);
  //     if (!client) {
  //       return {
  //         error: `MCP server with ID '${serverId}' not found`,
  //       };
  //     }

  //     const prompt = await client.getPrompt({
  //       name,
  //       arguments: args || {},
  //     });
  //     return { prompt };
  //   },
  // }),

  // // Action to list available resources from a specific MCP server
  // action({
  //   name: "mcp.listResources",
  //   description: "List available resources from an MCP server",
  //   schema: {
  //     serverId: z.string().describe("ID of the MCP server to query"),
  //   },
  //   async handler({ serverId }, ctx) {
  //     const client = clients.get(serverId);
  //     if (!client) {
  //       return {
  //         error: `MCP server with ID '${serverId}' not found`,
  //       };
  //     }

  //     const resources = await client.listResources();
  //     return { resources };
  //   },
  // }),

  // // Action to read a resource from a specific MCP server
  // action({
  //   name: "mcp.readResource",
  //   description: "Read a resource from an MCP server",
  //   schema: {
  //     serverId: z.string().describe("ID of the MCP server to query"),
  //     uri: z.string().describe("URI of the resource to read"),
  //   },
  //   async handler({ serverId, uri }, ctx) {
  //     const client = clients.get(serverId);
  //     if (!client) {
  //       return {
  //         error: `MCP server with ID '${serverId}' not found`,
  //       };
  //     }

  //     const resource = await client.readResource({
  //       uri,
  //     });

  //     return { resource };
  //   },
  // }),
]);
