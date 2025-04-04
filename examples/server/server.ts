import { generateText, tool, type CoreMessage, type Tool } from "ai";
import { z } from "zod";
import { Sandbox } from "@e2b/code-interpreter";
import zodToJsonSchema from "zod-to-json-schema";
import { createContainer, http } from "@daydreamsai/core";
import { tavily, type TavilyClient } from "@tavily/core";
import { randomUUIDv7, env } from "bun";

const e2bApiKey = env.E2B_API_KEY;

const container = createContainer();

container.singleton("tavily", () =>
  tavily({
    apiKey: env.TAVILY_API_KEY!,
  })
);

type ToolSet = Record<string, Tool<any, any>>;

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

  return { state, server };
}

const { state, server } = createServer({
  tools: {
    getWeather: tool({
      parameters: z.object({ location: z.string() }),
      description: "get the weather for a location",
      execute: async ({ location }, options) => {
        const geolocation = await http.get.json<{
          results: { latitude: number; longitude: number }[];
        }>("https://geocoding-api.open-meteo.com/v1/search", {
          name: location,
          count: 1,
          language: "en",
          format: "json",
        });
        if (geolocation.results[0]) {
          const res = await http.get.json<{ test: true }>(
            "https://api.open-meteo.com/v1/forecast",
            {
              latitude: geolocation.results[0].latitude,
              longitude: geolocation.results[0].longitude,
              current_weather: "true", // Request current weather data
            }
          );

          return res;
        }

        return "Failed";
      },
    }),
    "tavily.search": tool({
      description: "Execute a search query using Tavily Search.",
      parameters: z.object({
        query: z.string().describe("The search query to execute with Tavily."),
        topic: z
          .enum(["general", "news"])
          .optional()
          .default("general")
          .describe(
            "The category of the search.news is useful for retrieving real-time updates, particularly about politics, sports, and major current events covered by mainstream media sources. general is for broader, more general-purpose searches that may include a wide range of sources."
          ),
        searchDepth: z
          .enum(["basic", "advanced"])
          .default("basic")
          .optional()
          .describe(
            "The depth of the search. advanced search is tailored to retrieve the most relevant sources and content snippets for your query, while basic search provides generic content snippets from each source."
          ),
      }),
      async execute({ query, topic, searchDepth }) {
        const response = await container
          .resolve<TavilyClient>("tavily")
          .search(query, {
            searchDepth,
            topic,
          });

        return {
          results: response.results.map((result) => ({
            title: result.title,
            url: result.url,
            content: result.content,
          })),
          totalResults: response.results.length,
        };
      },
    }),
    "tavily.extract": tool({
      description:
        "Extract web page content from one or more specified URLs using Tavily Extract.",
      parameters: z.object({
        urls: z
          .array(z.string())
          .describe("A list of URLs to extract content from."),

        extractDepth: z
          .enum(["basic", "advanced"])
          .default("basic")
          .optional()
          .describe(
            "The depth of the extraction process. advanced extraction retrieves more data, including tables and embedded content, with higher success but may increase latency.basic extraction costs 1 credit per 5 successful URL extractions, while advanced extraction costs 2 credits per 5 successful URL extractions."
          ),
      }),
      async execute({ urls, extractDepth }) {
        const response = await container
          .resolve<TavilyClient>("tavily")
          .extract(urls, {
            extractDepth,
          });

        return {
          results: response.results.map((result) => ({
            url: result.url,
            content: result.rawContent,
            images: result.images,
          })),
          totalResults: response.results.length,
        };
      },
    }),
    "sandbox.runCode": tool({
      parameters: z.object({
        code: z.string(),
        language: z.enum(["python", "js"]),
        sandboxId: z.string(),
      }),
      execute: async ({ code, language, sandboxId }) => {
        const sdx = sandboxId
          ? await Sandbox.connect(sandboxId, { apiKey: e2bApiKey })
          : await Sandbox.create({ apiKey: e2bApiKey });

        const response = await sdx.runCode(code, {
          language,
          onStdout(output) {
            console.log("out", output);
          },
          onStderr(output) {
            console.log("err", output);
          },
        });

        return response;
      },
    }),
    "sandbox.files.list": tool({
      parameters: z.object({
        path: z.string(),
        sandboxId: z.string(),
      }),
      execute: async ({ path, sandboxId }) => {
        const sdx = sandboxId
          ? await Sandbox.connect(sandboxId, { apiKey: e2bApiKey })
          : await Sandbox.create({ apiKey: e2bApiKey });
        return await sdx.files.list(path);
      },
    }),
    "sandbox.files.read": tool({
      parameters: z.object({
        path: z.string(),
        sandboxId: z.string(),
      }),
      execute: async ({ path, sandboxId }) => {
        const sdx = sandboxId
          ? await Sandbox.connect(sandboxId, { apiKey: e2bApiKey })
          : await Sandbox.create({ apiKey: e2bApiKey });
        return await sdx.files.read(path);
      },
    }),
    "sandbox.files.write": tool({
      parameters: z.object({
        path: z.string(),
        content: z.string(),
        sandboxId: z.string(),
      }),
      execute: async ({ path, content, sandboxId }) => {
        const sdx = sandboxId
          ? await Sandbox.connect(sandboxId, { apiKey: e2bApiKey })
          : await Sandbox.create({ apiKey: e2bApiKey });
        return await sdx.files.write(path, content);
      },
    }),
    "sandbox.files.rename": tool({
      parameters: z.object({
        oldPath: z.string(),
        newPath: z.string(),
        sandboxId: z.string(),
      }),
      execute: async ({ oldPath, newPath, sandboxId }) => {
        const sdx = sandboxId
          ? await Sandbox.connect(sandboxId, { apiKey: e2bApiKey })
          : await Sandbox.create({ apiKey: e2bApiKey });
        return await sdx.files.rename(oldPath, newPath);
      },
    }),
    "sandbox.commands.run": tool({
      parameters: z.object({
        sandboxId: z.string(),
        cmd: z.string(),
        background: z.boolean().optional().default(false),
        // cwd: z.string().optional().describe("the working directory"),
        envs: z.record(z.string()).optional(),
      }),
      execute: async ({ cmd, background, envs, sandboxId }) => {
        const sdx = sandboxId
          ? await Sandbox.connect(sandboxId, { apiKey: e2bApiKey })
          : await Sandbox.create({ apiKey: e2bApiKey });
        return await sdx.commands.run(cmd, {
          background: background as any,
          // cwd,
          envs,
          onStdout(data) {
            console.log(data);
          },
        });
      },
    }),
  },
});
