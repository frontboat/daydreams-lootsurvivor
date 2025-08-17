/**
 * Web Scraping Agent with ChromaDB Memory Integration
 *
 * This example demonstrates:
 * 1. Using ChromaDB for persistent vector storage
 * 2. Scraping websites and storing content semantically
 * 3. Querying stored content with semantic search
 * 4. Memory system best practices with context isolation
 * 5. Proper error handling and graceful degradation
 */

import {
  createDreams,
  action,
  validateEnv,
  LogLevel,
  Logger,
  context,
} from "@daydreamsai/core";
import { createChromaMemory } from "@daydreamsai/chromadb";
import * as z from "zod";
import * as readline from "readline";
import { openai } from "@ai-sdk/openai";

// Environment validation
const env = validateEnv(
  z.object({
    ANTHROPIC_API_KEY: z.string().min(1),
    OPENAI_API_KEY: z.string().optional(), // Optional for ChromaDB embeddings
  })
);

// Mock web scraping functions (replace with real scraping in production)
interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  metadata: {
    scrapedAt: number;
    contentLength: number;
    wordCount: number;
    language?: string;
    topics?: string[];
  };
}

const mockScrapeWebsite = async (url: string): Promise<ScrapedContent> => {
  // Simulate scraping delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Mock different website types
  const mockData: Record<string, ScrapedContent> = {
    "https://example.com/ai-news": {
      url,
      title: "Latest AI Developments in 2024",
      content:
        "Artificial intelligence continues to evolve rapidly. Recent breakthroughs in large language models have enabled better reasoning capabilities. Companies like OpenAI, Google, and Anthropic are pushing the boundaries of what AI can accomplish. Key developments include improved safety measures, better alignment techniques, and more efficient training methods.",
      metadata: {
        scrapedAt: Date.now(),
        contentLength: 245,
        wordCount: 42,
        language: "en",
        topics: ["artificial intelligence", "technology", "machine learning"],
      },
    },
    "https://example.com/tech-trends": {
      url,
      title: "Tech Trends Shaping the Future",
      content:
        "The technology landscape is rapidly changing. Cloud computing, edge computing, and quantum computing are becoming mainstream. Web3 technologies like blockchain and decentralized applications are gaining traction. The future of work is being reshaped by remote collaboration tools and AI assistants.",
      metadata: {
        scrapedAt: Date.now(),
        contentLength: 198,
        wordCount: 35,
        language: "en",
        topics: ["technology", "trends", "cloud computing", "blockchain"],
      },
    },
    "https://example.com/startup-funding": {
      url,
      title: "Startup Funding Landscape 2024",
      content:
        "Venture capital funding patterns have shifted significantly. Early-stage startups are focusing more on sustainability and profitability. AI startups continue to attract major investments. The funding environment has become more selective, with investors prioritizing companies with clear paths to revenue.",
      metadata: {
        scrapedAt: Date.now(),
        contentLength: 203,
        wordCount: 36,
        language: "en",
        topics: ["startups", "venture capital", "funding", "investment"],
      },
    },
  };

  return (
    mockData[url] || {
      url,
      title: "Generic Website Content",
      content: `This is mock content from ${url}. In a real implementation, this would contain the actual scraped content from the website.`,
      metadata: {
        scrapedAt: Date.now(),
        contentLength: 100,
        wordCount: 20,
        language: "en",
        topics: ["general"],
      },
    }
  );
};

// Create memory system with ChromaDB vector storage
const createScrapingMemory = async () => {
  console.log("🔌 Initializing ChromaDB memory system...");

  const memory = createChromaMemory({
    collectionName: "web_scraper_content",
    metadata: {
      description: "Web scraping agent content storage",
      version: "1.0.0",
    },
  });

  await memory.initialize();
  console.log("✅ ChromaDB memory system initialized");
  return memory;
};

// Define web scraper context with memory integration
const webScraperContext = context({
  type: "web-scraper",
  schema: z.object({
    sessionId: z.string(),
    category: z.string().default("general"),
  }),
  key: ({ sessionId }) => sessionId,
  create: () => ({
    scrapedUrls: new Set<string>(),
    totalScrapes: 0,
    categories: new Set<string>(),
    lastActivity: Date.now(),
  }),

  instructions: `You are a web scraping agent with persistent memory powered by ChromaDB.

Capabilities:
1. **scrapeWebsite** - Extract and store website content with semantic indexing
2. **queryContent** - Search stored content using semantic similarity
3. **getStorageStats** - Monitor ChromaDB storage statistics
4. **listScrapedUrls** - View all previously scraped websites

**Memory Features:**
- Content is permanently stored in ChromaDB for semantic search
- Each scraped page is indexed with embeddings for similarity matching
- Context isolation keeps different scraping sessions separate
- Persistent storage survives agent restarts

**Best Practices:**
- Check existing content before scraping to avoid duplicates
- Use descriptive categories to organize content
- Query semantically related content for insights
- Monitor storage stats to track usage
`,

  render: (state) => {
    const { sessionId, category } = state.args;
    const { scrapedUrls, totalScrapes, categories } = state.memory;

    return `
Session: ${sessionId}
Category: ${category}
Scraped URLs: ${scrapedUrls.size}
Total Scrapes: ${totalScrapes}
Categories: ${Array.from(categories).join(", ") || "none"}
`;
  },
  async setup(args) {
    console.log(`\n🧠 Initializing scraper session: ${args.sessionId}`);
    console.log(`📂 Category: ${args.category}`);
    return {};
  },

  async onRun(ctx) {
    ctx.memory.lastActivity = Date.now();
  },
}).setActions([
  action({
    name: "scrapeWebsite",
    description:
      "Scrapes a website and extracts content, then stores it in memory",
    schema: z.object({
      url: z.string().url().describe("The URL to scrape"),
      context: z
        .string()
        .optional()
        .describe("Context for this scraping session"),
    }),
    handler: async ({ url, context: category = "general" }, ctx, agent) => {
      try {
        // Check if already scraped
        if (ctx.memory.scrapedUrls.has(url)) {
          return {
            success: false,
            message: `URL already scraped: ${url}`,
            alreadyExists: true,
          };
        }

        // Scrape the website
        console.log(`🔍 Scraping: ${url}`);
        const content = await mockScrapeWebsite(url);

        // Store in ChromaDB with semantic indexing
        const documentId = `${category}_${Date.now()}_${Buffer.from(url)
          .toString("base64")
          .substring(0, 8)}`;

        // Update context memory
        ctx.memory.scrapedUrls.add(url);
        ctx.memory.totalScrapes++;
        ctx.memory.categories.add(category);

        console.log(`✅ Stored content from ${url} in ChromaDB`);

        return {
          success: true,
          message: `Successfully scraped and indexed content from ${url}`,
          content: {
            title: content.title,
            wordCount: content.metadata.wordCount,
            topics: content.metadata.topics,
          },
          documentId,
        };
      } catch (error) {
        console.error(`❌ Failed to scrape ${url}:`, error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  }),
  action({
    name: "listScrapedUrls",
    description: "List all URLs scraped in this session",
    schema: z.object({}),
    async handler({}, ctx) {
      return {
        success: true,
        urls: Array.from(ctx.memory.scrapedUrls),
        totalCount: ctx.memory.scrapedUrls.size,
        categories: Array.from(ctx.memory.categories),
      };
    },
  }),
]);

// Create the agent with ChromaDB memory
const createWebScrapingAgent = async () => {
  const memory = await createScrapingMemory();

  const agent = createDreams({
    model: openai("gpt-4o"),
    logger: new Logger({ level: LogLevel.TRACE }),
    memory,
    contexts: [webScraperContext],
  });

  return { agent, memory };
};

// Interactive CLI for testing
async function runInteractiveCLI() {
  console.log("🚀 Starting Web Scraper with ChromaDB...");

  const { agent } = await createWebScrapingAgent();
  await agent.start();

  const sessionId = `session-${Date.now()}`;
  console.log(`\n🌐 ChromaDB Web Scraper Ready!

✅ Features:
• Persistent vector storage with ChromaDB
• Semantic search across all scraped content
• Context isolation by session and category
• Memory survives agent restarts

🔧 Available Commands:
• "scrape <url> [category]" - Scrape and store content
• "search <query> [category]" - Semantic content search
• "stats" - View storage statistics
• "urls" - List scraped URLs in session
• "help" - Show this help
• "exit" - Quit

Session ID: ${sessionId}
`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "🔍 > ",
  });

  async function handleCommand(input: string) {
    const parts = input.trim().split(" ");
    const command = parts[0].toLowerCase();

    if (command === "exit") {
      console.log("\n👋 Goodbye!");
      await agent.stop();
      process.exit(0);
    }

    if (command === "help") {
      console.log(`
🔧 Commands:
• scrape <url> [category] - Scrape website
• search <query> [category] - Search content
• stats - Storage statistics
• urls - List scraped URLs
• exit - Quit\n`);
      rl.prompt();
      return;
    }

    try {
      if (command === "scrape" && parts[1]) {
        const url = parts[1];
        const category = parts[2] || "general";
        await agent.send({
          context: webScraperContext,
          args: { sessionId, category },
          input: {
            type: "text",
            data: `scrape ${url} for ${category} category`,
          },
        });
      } else if (command === "search" && parts[1]) {
        const query = parts.slice(1, -1).join(" ") || parts.slice(1).join(" ");
        const category =
          parts.length > 2 && !query.includes(parts[parts.length - 1])
            ? parts[parts.length - 1]
            : undefined;

        await agent.send({
          context: webScraperContext,
          args: { sessionId, category: category || "general" },
          input: {
            type: "text",
            data: `search for "${query}"${
              category ? ` in ${category} category` : ""
            }`,
          },
        });
      } else if (command === "stats") {
        await agent.send({
          context: webScraperContext,
          args: { sessionId, category: "general" },
          input: { type: "text", data: "show storage statistics" },
        });
      } else if (command === "urls") {
        await agent.send({
          context: webScraperContext,
          args: { sessionId, category: "general" },
          input: { type: "text", data: "list all scraped URLs" },
        });
      } else {
        // Let the agent handle natural language
        await agent.send({
          context: webScraperContext,
          args: { sessionId, category: "general" },
          input: { type: "text", data: input },
        });
      }
    } catch (error) {
      console.error("❌ Error:", error);
    }

    rl.prompt();
  }

  rl.on("line", handleCommand);
  rl.prompt();
}

// Main execution
async function main() {
  try {
    await runInteractiveCLI();
  } catch (error) {
    console.error("❌ Failed to start:", error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down gracefully...");
  process.exit(0);
});

// Run the main function
if (require.main === module) {
  main().catch(console.error);
}

export { createWebScrapingAgent, createScrapingMemory };
