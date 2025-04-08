import { createMcpClient } from "@daydreamsai/mcp";
import { Client as McpClient } from "@modelcontextprotocol/sdk/client/index.js";
import path from "path";
import { env } from "bun";

export interface McpServerConfig {
  id: string;
  name: string;
  transport:
    | {
        type: "stdio";
        // For stdio transport
        command?: string;
        args?: string[];
      }
    | {
        type: "sse";
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
  env?: Record<string, string>;
}

export async function createMcpProxyServer({
  servers,
}: {
  servers: McpServerConfig[];
}) {
  const clients = new Map<string, McpClient>();

  for (const config of servers) {
    const client = await createMcpClient(config);
    clients.set(config.id, client);
  }

  const server = Bun.serve({
    port: 8787,
    // fetch(request, server) {
    //   console.log(request.url);
    //   return Response.json({ success: false });
    // },
    routes: {
      "/ping": () => {
        return new Response("pong");
      },
      "/api/servers": async (req) => {
        return Response.json({
          servers: servers.map(({ id, name }) => ({ id, name })),
        });
      },
      "/api/servers/:serverId/tools": async (req) => {
        const { serverId } = req.params;
        const client = clients.get(serverId);
        if (!client) throw new Error("Unknow client");
        const { tools } = await client!.listTools();
        return Response.json({
          tools,
        });
      },
      "/api/servers/:serverId/tools/:tool": async (req) => {
        if (req.method !== "POST") {
          return new Response("Method not allowed", {
            status: 405,
          });
        }

        const { serverId, tool } = req.params;
        const client = clients.get(serverId);
        if (!client) throw new Error("Unknow client");

        const data = (await req.json()) as {
          args: any;
        };

        try {
          const result = await client.callTool({
            name: tool,
            arguments: data.args,
          });

          // const toolResult = JSON.parse((result.content as any)[0].text);
          return Response.json({
            serverId,
            tool: req.params.tool,
            result: result.content,
          });
        } catch (error) {
          return Response.json({
            serverId,
            tool,
            result: {
              error,
              message: error instanceof Error ? error.message : undefined,
            },
          });
        }
      },
      "/api/servers/:serverId/prompts": async (req) => {
        const { serverId } = req.params;
        const client = clients.get(serverId);
        if (!client) throw new Error("Unknow client");
        const res = await client!.listPrompts();
        return Response.json(res);
      },
      "/api/servers/:serverId/resources": async (req) => {
        const { serverId } = req.params;
        const client = clients.get(serverId);
        if (!client) throw new Error("Unknow client");
        const res = await client!.listResources();
        return Response.json(res);
      },
    },
  });

  return { server };
}

const { server } = await createMcpProxyServer({
  servers: [
    {
      id: "example-server",
      name: "Example Resource Server",
      transport: {
        type: "stdio",
        command: "tsx",
        args: [path.join(__dirname, "../mcp/mcp-server-example.ts")],
      },
    },
    {
      id: "github",
      name: "GitHub MCP Server",
      transport: {
        type: "stdio",
        command: "docker",
        args: [
          "run",
          "-i",
          "--rm",
          "-e",
          "GITHUB_PERSONAL_ACCESS_TOKEN",
          "ghcr.io/github/github-mcp-server",
        ],
      },
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: env.GITHUB_TOKEN!,
      },
    },
  ],
});
