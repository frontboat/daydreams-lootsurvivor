import { action, AnyAction, context, Schema } from "@daydreamsai/core";
import { JSONSchema7 } from "@ai-sdk/provider";
import { jsonSchema } from "@ai-sdk/ui-utils";
import { z } from "zod";
import type { SandboxTools } from "../../../../examples/server/tools/sandbox";
import { ToolSet } from "../../../../examples/server/utils";
import { Tool } from "ai";

export function createToolClient(server: string) {
  return {
    async ping() {
      const res = await fetch(`${server}/ping`);
      return res.text();
    },
    async listTools() {
      const res = await fetch(`${server}/api/tools`);
      return res.json();
    },
    async callTool({ name, args }: { name: string; args: any }) {
      const res = await fetch(`${server}/api/tools/${name}`, {
        method: "POST",
        body: JSON.stringify({ args }),
      });
      const data = await res.json();
      return data.result;
    },
  };
}

type ToolClient = ReturnType<typeof createToolClient>;

type ToolConfig = {
  name: string;
  parameters: JSONSchema7;
  description?: string;
};

export function createActionsFromTools(
  client: ToolClient,
  tools: ToolConfig[]
): AnyAction[] {
  return tools.map((tool) =>
    action({
      name: tool.name,
      description: tool.description,
      schema: jsonSchema<any>(tool.parameters) as any as Schema<any>,
      handler: async (args, ctx) => {
        return client.callTool({ name: tool.name, args });
      },
    })
  );
}

type InferToolResult<T extends Tool<any, any>> =
  T extends Tool<any, infer Result> ? Result : never;

type ClientProxy<T extends ToolSet> = {
  [K in keyof T]: (
    args: z.infer<T[K]["parameters"]>
  ) => Promise<InferToolResult<T[K]>>;
};

export function createToolClientProxy<T extends ToolSet>(
  client: ToolClient
): ClientProxy<T> {
  const handler: ProxyHandler<any> = {
    get(_, name) {
      console.log(name);
      if (typeof name === "symbol") throw new Error("symbol as key");
      return async (args: any) => {
        console.log({ args });

        return client.callTool({ name, args });
      };
    },
  };

  const proxy = new Proxy({}, handler);

  return proxy as ClientProxy<T>;
}

export const serverTools = context({
  type: "server-tools",
  schema: {
    id: z.string(),
    url: z.string(),
  },
  key: ({ id }) => id,
  async setup({ url }) {
    return {
      client: createToolClient(url),
      filter: null as null | ((tool: ToolConfig) => boolean),
    };
  },
  create() {
    return { enabled: false, tools: [] as ToolConfig[] };
  },
  render() {
    return "";
  },
  async loader({ memory, options }) {
    try {
      const { tools } = await options.client.listTools();
      memory.enabled = true;
      memory.tools = options.filter ? tools.filter(options.filter) : tools;
    } catch (error) {
      memory.enabled = false;
      console.error(error);
    }
  },
  async actions({ memory, options }) {
    if (!memory.enabled) return [];

    // const tools = await options.client.listTools();
    return createActionsFromTools(options.client, memory.tools);
  },
});
