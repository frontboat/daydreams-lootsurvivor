import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";

/**
 * Creates and connects an MCP client to a server
 * @param options Configuration options for the MCP client
 * @returns Connected MCP client instance
 */
export async function createMcpClient(options: {
  // Client identification
  clientInfo?: {
    name: string;
    version: string;
  };
  // Transport configuration
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
  // Capabilities to request from the server
  capabilities?: {
    prompts?: Record<string, unknown>;
    resources?: Record<string, unknown>;
    tools?: Record<string, unknown>;
  };
}) {
  // Set default client info if not provided
  const clientInfo = options.clientInfo || {
    name: "generic-mcp-client",
    version: "1.0.0",
  };

  // Set default capabilities if not provided
  const capabilities = options.capabilities || {
    prompts: {},
    resources: {},
    tools: {},
  };

  // Create the appropriate transport based on the type
  let transport;
  if (options.transport.type === "stdio") {
    if (!options.transport.command) {
      throw new Error("Command is required for stdio transport");
    }

    transport = new StdioClientTransport({
      command: options.transport.command,
      args: options.transport.args || [],
    });
  } else if (options.transport.type === "sse") {
    if (!options.transport.serverUrl) {
      throw new Error("Server URL is required for SSE transport");
    }

    // Create the SSE transport with the correct configuration
    // Convert string URL to URL object
    const serverUrl = new URL(options.transport.serverUrl);
    transport = new SSEClientTransport(serverUrl);
  } else {
    throw new Error(`Unsupported transport type: ${options.transport.type}`);
  }

  // Create the client
  const client = new Client(clientInfo, { capabilities });

  // Connect to the server
  await client.connect(transport);

  return client;
}

// Example usage:
/*
// Connect to a stdio-based server
const stdioClient = await createMcpClient({
  clientInfo: {
    name: "my-agent",
    version: "1.0.0",
  },
  transport: {
    type: "stdio",
    command: "node",
    args: ["server.js"],
  },
  capabilities: {
    prompts: {},
    resources: {},
    tools: {},
  },
});

// Connect to an SSE-based server
const sseClient = await createMcpClient({
  transport: {
    type: "sse",
    serverUrl: "http://localhost:3001",
  },
});

// List prompts
const prompts = await client.listPrompts();

// Get a prompt
const prompt = await client.getPrompt({
  name: "example-prompt",
  arguments: {
    arg1: "value",
  },
});

// List resources
const resources = await client.listResources();

// Read a resource
const resource = await client.readResource({
  uri: "file:///example.txt",
});

// Call a tool
const result = await client.callTool({
  name: "example-tool",
  arguments: {
    arg1: "value",
  },
});
*/
