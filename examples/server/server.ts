import { type CoreMessage } from "ai";
import zodToJsonSchema from "zod-to-json-schema";
import { randomUUIDv7 } from "bun";
import type { ToolSet } from "./utils";
import { sanboxTools } from "./tools/sandbox";
import { basicTools } from "./tools/utils";

export function createServer<Tools extends ToolSet>({
  tools,
}: {
  tools: {
    [K in keyof Tools]: Tools[K];
  };
}) {
  const state = {
    tools: Object.entries(tools as ToolSet).map(([name, tool]) => ({
      name,
      ...tool,
    })),
  };

  console.log(state);

  const server = Bun.serve({
    port: 5555,
    // fetch(request, server) {
    //   console.log(request.url);
    //   return Response.json({ success: false });
    // },
    routes: {
      "/ping": () => {
        return new Response("pong");
      },
      "/api/tools": async (req) => {
        return Response.json({
          tools: state.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: zodToJsonSchema(tool.parameters, "schema").definitions![
              "schema"
            ],
          })),
        });
      },
      "/api/tools/:tool": async (req) => {
        if (req.method !== "POST") {
          return new Response("Method not allowed", {
            status: 405,
          });
        }

        const data = (await req.json()) as {
          args: any;
          messages?: CoreMessage[];
          toolCallId?: string;
        };

        const tool = state.tools.find((tool) => tool.name === req.params.tool)!;
        const args = tool.parameters.parse(data.args);
        const toolCallId = data.toolCallId ?? randomUUIDv7();

        try {
          const result = tool.execute
            ? await tool.execute(args, {
                messages: data.messages ?? [],
                toolCallId,
                abortSignal: req.signal,
              })
            : args;
          return Response.json({
            tool: req.params.tool,
            toolCallId,
            result,
          });
        } catch (error) {
          return Response.json({
            tool: req.params.tool,
            toolCallId,
            result: {
              error,
              message: error instanceof Error ? error.message : undefined,
            },
          });
        }
      },
    },
  });

  return { state, server, tools };
}

export type ServerTools = typeof tools;
const { state, server, tools } = createServer({
  tools: {
    ...sanboxTools,
    ...basicTools,
  },
});
