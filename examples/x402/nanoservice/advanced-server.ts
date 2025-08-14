import { config } from "dotenv";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { paymentMiddleware, type Network, type Resource } from "x402-hono";
import {
  createDreams,
  context,
  action,
  LogLevel,
  output,
} from "@daydreamsai/core";
import { openai } from "@ai-sdk/openai";
import * as z from "zod";

config();

const facilitatorUrl = process.env.FACILITATOR_URL as Resource;
const payTo = process.env.ADDRESS as `0x${string}`;
const network = process.env.NETWORK as Network;
const openaiKey = process.env.OPENAI_API_KEY;

if (!facilitatorUrl || !payTo || !network || !openaiKey) {
  console.error("Missing required environment variables");
  process.exit(1);
}

// Define types for our service
interface ServiceMemory {
  tier: "basic" | "premium";
  credits: number;
  usage: {
    total: number;
    today: number;
    lastReset: Date;
  };
  preferences: {
    style?: "concise" | "detailed" | "technical";
    language?: string;
  };
  customData: Record<string, any>;
}

// Create a more advanced context with multiple capabilities
const serviceContext = context<ServiceMemory>({
  type: "nano-service",

  schema: z.object({
    userId: z.string().describe("User identifier"),
    service: z
      .enum(["assistant", "analyzer", "generator"])
      .describe("Service type"),
  }),

  create: () => ({
    tier: "basic",
    credits: 10,
    usage: {
      total: 0,
      today: 0,
      lastReset: new Date(),
    },
    preferences: {},
    customData: {},
  }),

  render: (state) => {
    const { tier, credits, usage, preferences } = state.memory;
    return `
Service: ${state.args.service}
User: ${state.args.userId}
Tier: ${tier} (${credits} credits)
Total Usage: ${usage.total} requests
Style: ${preferences.style || "default"}
${preferences.language ? `Language: ${preferences.language}` : ""}
    `.trim();
  },

  instructions: (state) => {
    const style = state.memory.preferences.style || "concise";
    const baseInstructions = `You are a ${state.args.service} nano service.`;

    const styleInstructions = {
      concise: "Provide brief, to-the-point responses.",
      detailed: "Provide comprehensive, well-explained responses.",
      technical: "Use technical language and include implementation details.",
    };

    return `${baseInstructions}\n${styleInstructions[style]}`;
  },

  onRun: async (ctx) => {
    // Track usage
    ctx.memory.usage.total++;

    // Reset daily usage if needed
    const today = new Date().toDateString();
    const lastReset = new Date(ctx.memory.usage.lastReset).toDateString();
    if (today !== lastReset) {
      ctx.memory.usage.today = 1;
      ctx.memory.usage.lastReset = new Date();
    } else {
      ctx.memory.usage.today++;
    }

    // Deduct credits for premium features
    if (ctx.memory.tier === "premium" && ctx.memory.credits > 0) {
      ctx.memory.credits--;
    }
  },
}).setActions([
  action({
    name: "analyze-text",
    description: "Analyze text for sentiment, keywords, or patterns",
    schema: z.object({
      text: z.string().describe("Text to analyze"),
      analysisType: z.enum(["sentiment", "keywords", "summary"]),
    }),
    handler: async ({ text, analysisType }, ctx) => {
      // Simulate different analysis types
      const analyses = {
        sentiment: {
          overall: "positive",
          score: 0.8,
          emotions: ["happy", "excited"],
        },
        keywords: {
          main: ["AI", "service", "nano"],
          frequency: { AI: 3, service: 2, nano: 1 },
        },
        summary: {
          brief: text.slice(0, 100) + "...",
          points: ["Key point 1", "Key point 2"],
        },
      };

      return {
        type: analysisType,
        result: analyses[analysisType],
        timestamp: new Date().toISOString(),
      };
    },
  }),

  action({
    name: "generate-content",
    description: "Generate content based on templates",
    schema: z.object({
      template: z.enum(["email", "article", "code"]),
      prompt: z.string(),
      options: z.record(z.string(), z.any()).optional(),
    }),
    handler: async ({ template, prompt, options }, ctx) => {
      const style = ctx.memory.preferences.style || "concise";

      return {
        template,
        content: `Generated ${template} based on: ${prompt}`,
        style,
        options,
      };
    },
  }),

  action({
    name: "update-preferences",
    description: "Update user preferences",
    schema: z.object({
      style: z.enum(["concise", "detailed", "technical"]).optional(),
      language: z.string().optional(),
    }),
    handler: async (prefs, ctx) => {
      Object.assign(ctx.memory.preferences, prefs);
      return {
        updated: true,
        preferences: ctx.memory.preferences,
      };
    },
  }),

  action({
    name: "store-data",
    description: "Store custom data for the user",
    schema: z.object({
      key: z.string(),
      value: z.any(),
    }),
    handler: async ({ key, value }, ctx) => {
      ctx.memory.customData[key] = value;
      return {
        stored: true,
        key,
      };
    },
  }),
]);

// Create the agent with multiple output types
const agent = createDreams({
  logLevel: LogLevel.INFO,
  model: openai("gpt-4o-mini"),
  contexts: [serviceContext],
  inputs: {
    text: {
      description: "User input",
      schema: z.string(),
    },
    command: {
      description: "Structured command",
      schema: z.object({
        action: z.string(),
        params: z.record(z.string(), z.any()),
      }),
    },
  },
  outputs: {
    text: {
      description: "Text response",
      schema: z.string(),
    },
    data: {
      description: "Structured data response",
      schema: z.object({
        type: z.string(),
        content: z.any(),
        metadata: z.record(z.string(), z.any()).optional(),
      }),
    },
  },
});

await agent.start();

// Create Hono app with middleware
const app = new Hono();

// Logging middleware
app.use("*", async (c: any, next: any) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${c.req.method} ${c.req.path} - ${c.res.status} ${ms}ms`);
});

console.log("Advanced AI Nano Service running on port 4021");

// Dynamic pricing based on service type
const servicePricing = {
  "/service/assistant": "$0.01",
  "/service/analyzer": "$0.02",
  "/service/generator": "$0.03",
};

// Apply payment middleware to all service endpoints
app.use(
  "/service/*",
  paymentMiddleware(payTo, servicePricing, { url: facilitatorUrl })
);

// Service endpoint with dynamic routing
app.post("/service/:type", async (c: any) => {
  const serviceType = c.req.param("type") as
    | "assistant"
    | "analyzer"
    | "generator";
  const validServices = ["assistant", "analyzer", "generator"];

  if (!validServices.includes(serviceType)) {
    return c.json({ error: "Invalid service type" }, 400);
  }

  try {
    const body = await c.req.json();
    const { query, userId = "anonymous", command } = body;

    if (!query && !command) {
      return c.json({ error: "Query or command is required" }, 400);
    }

    // Get or create context
    const contextState = await agent.getContext({
      context: serviceContext,
      args: { userId, service: serviceType },
    });

    // Determine input type
    const input = command
      ? { type: "command", data: command }
      : { type: "text", data: query };

    // Process request
    const result = await agent.send({
      context: serviceContext,
      args: { userId, service: serviceType },
      input,
    });

    // Extract response
    const outputs = result.filter((r) => r.ref === "output");
    const response = outputs
      .map((output) => {
        if ("data" in output) {
          return output.data;
        }
        return null;
      })
      .filter(Boolean);

    // Save context
    await agent.saveContext(contextState);

    return c.json({
      service: serviceType,
      response: response.length === 1 ? response[0] : response,
      usage: {
        total: contextState.memory.usage.total,
        today: contextState.memory.usage.today,
        credits: contextState.memory.credits,
      },
      userId,
    });
  } catch (error) {
    console.error("Service error:", error);
    return c.json({ error: "Service error occurred" }, 500);
  }
});

// Upgrade endpoint (free - just for demo)
app.post("/upgrade", async (c: any) => {
  const { userId, tier } = await c.req.json();

  if (!userId || !["basic", "premium"].includes(tier)) {
    return c.json({ error: "Invalid upgrade request" }, 400);
  }

  // In a real app, this would process payment and update database
  return c.json({
    message: "Upgrade successful",
    tier,
    credits: tier === "premium" ? 1000 : 10,
  });
});

// Stats endpoint
app.get("/stats/:userId", async (c: any) => {
  const userId = c.req.param("userId");

  try {
    // Get stats for all services
    const services = ["assistant", "analyzer", "generator"];
    const stats = await Promise.all(
      services.map(async (service) => {
        try {
          const state = await agent.getContext({
            context: serviceContext,
            args: { userId, service: service as any },
          });
          return {
            service,
            usage: state.memory.usage,
            tier: state.memory.tier,
          };
        } catch {
          return { service, usage: null };
        }
      })
    );

    return c.json({ userId, stats });
  } catch (error) {
    return c.json({ error: "Failed to get stats" }, 500);
  }
});

// Root endpoint with service catalog
app.get("/", (c: any) => {
  return c.json({
    name: "Advanced AI Nano Service",
    version: "2.0",
    services: {
      assistant: {
        price: "$0.01",
        description: "General AI assistant",
        capabilities: ["questions", "conversations", "help"],
      },
      analyzer: {
        price: "$0.02",
        description: "Text analysis service",
        capabilities: ["sentiment", "keywords", "summary"],
      },
      generator: {
        price: "$0.03",
        description: "Content generation service",
        capabilities: ["email", "article", "code"],
      },
    },
    endpoints: {
      "POST /service/:type": "Main service endpoint (paid)",
      "GET /stats/:userId": "User statistics (free)",
      "POST /upgrade": "Upgrade tier (demo)",
    },
    usage: {
      basic: {
        method: "POST",
        endpoint: "/service/assistant",
        body: {
          query: "Your question here",
          userId: "optional-user-id",
        },
      },
      advanced: {
        method: "POST",
        endpoint: "/service/analyzer",
        body: {
          command: {
            action: "analyze-text",
            params: {
              text: "Text to analyze",
              analysisType: "sentiment",
            },
          },
          userId: "user-id",
        },
      },
    },
    network,
  });
});

serve({
  fetch: app.fetch,
  port: 4021,
});
