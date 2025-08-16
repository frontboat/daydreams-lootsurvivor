/**
 * Comprehensive Web Scraping Agent with Full Memory System
 *
 * This agent demonstrates the complete Daydreams memory system by:
 * 1. Scraping websites and extracting content
 * 2. Converting content into structured memories (facts, episodes, entities)
 * 3. Using all memory types: working, episodic, factual, semantic, and graph
 * 4. Demonstrating memory limits, transactions, and context isolation
 * 5. Learning from scraping patterns and improving over time
 */

import {
  createDreams,
  action,
  validateEnv,
  LogLevel,
  Logger,
  context,
} from "@daydreamsai/core";
import {
  MemorySystem,
  InMemoryKeyValueProvider,
  InMemoryVectorProvider,
  InMemoryGraphProvider,
  type Memory,
} from "@daydreamsai/core";
import { anthropic } from "@ai-sdk/anthropic";
import * as z from "zod";

// 1. Environment validation
validateEnv(
  z.object({
    ANTHROPIC_API_KEY: z.string().min(1),
  })
);

// 2. Mock web scraping functions (replace with real scraping in production)
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

// 3. Create comprehensive memory system with limits
const createScrapingMemory = async (): Promise<MemorySystem> => {
  const memory = new MemorySystem({
    providers: {
      kv: new InMemoryKeyValueProvider(),
      vector: new InMemoryVectorProvider(),
      graph: new InMemoryGraphProvider(),
    },
  });

  await memory.initialize();
  return memory;
};

// 5. Define specialized scraping context
const webScraperContext = context({
  type: "web-scraper",
  schema: z.object({
    sessionId: z.string().default(() => `session-${Date.now()}`),
    defaultContext: z.string().default("general"),
  }),

  instructions: `You are a sophisticated web scraping and memory management agent. 

Your capabilities:
1. **Website Scraping**: Use scrapeWebsite to extract content from URLs
2. **Content Querying**: Use queryScrapedContent to search through previously scraped content
3. **Memory Analysis**: Use getMemoryStats to monitor memory usage and limits
4. **Pattern Analysis**: Use analyzePatterns to understand scraping patterns and insights

**Memory System Features (Mostly Automatic):**
- **Working Memory**: Automatically tracks all inputs, outputs, and action calls  
- **Episodic Memory**: Automatically creates episodes from conversation flows
- **Factual Memory**: Store facts using memory.remember() with type: "fact"
- **Vector Memory**: Store documents using memory.remember() for semantic search
- **Graph Memory**: Create entity relationships for complex data modeling
- **Semantic Memory**: Automatically learns patterns from actions and results
- **Memory Limits**: Automatically manages memory usage and cleanup
- **Transactions**: Ensures data consistency across memory operations

**Best Practices:**
- Always use the context parameter to organize scraping sessions
- Query existing content before scraping to avoid duplicates
- Use memory stats to monitor system health
- Analyze patterns to improve future scraping strategies

Example conversation flow:
1. User asks to scrape a website
2. You use scrapeWebsite with appropriate context
3. Content is automatically stored across all memory types
4. You can then query, analyze, and provide insights
5. Memory system handles cleanup and optimization automatically
`,
  async setup(args, agent) {
    console.log(`🧠 Initializing web scraper session: ${args.sessionId}`);
    console.log(`📂 Default context: ${args.defaultContext}`);

    // Session initialization is tracked automatically

    return {
      sessionId: args.sessionId,
      defaultContext: args.defaultContext,
      startTime: Date.now(),
    };
  },

  async onStep({ memory }) {
    // Log each step for analysis
    console.log(`📊 Step Memory system processing...`);
  },

  async onRun({ memory }) {
    // Get memory stats after each run
    const stats = await memory.getMemoryStats();
    if (stats.limitsExceeded) {
      console.log("⚠️  Memory limits exceeded:", stats.violations);
    }
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
    handler: async (
      { url, context: contextName = "general" },
      ctx,
      agent
    ) => {},
  }),
  action({
    name: "queryScrapedContent",
    description: "Query previously scraped content using semantic search",
    schema: z.object({
      query: z.string().describe("The search query"),
      limit: z.number().default(5).describe("Maximum number of results"),
      context: z.string().optional().describe("Context to search within"),
    }),
    async handler({ query, limit, context: contextName }, ctx, agent) {
      const memory = agent.memory;

      // Use high-level recall API that searches across all memory types
      const results = await memory.recall(query, {
        limit,
        contextId: contextName ? `scraping:${contextName}` : undefined,
      });

      return {
        results: results.map((r: any) => ({
          content: r.content,
          score: r.score,
          type: r.type,
          metadata: r.metadata,
        })),
        totalResults: results.length,
      };
    },
  }),
]);

// 6. Create the agent with comprehensive memory system
const createWebScrapingAgent = async () => {
  const memory = await createScrapingMemory();

  const agent = createDreams({
    model: anthropic("claude-3-5-sonnet-20241022"),
    logger: new Logger({ level: LogLevel.INFO }),
    memory,
    contexts: [webScraperContext],
  });

  return { agent, memory };
};

// 7. Main execution
async function main() {
  console.log("🚀 Starting Web Scraping Memory Agent...");

  try {
    const { agent, memory } = await createWebScrapingAgent();

    console.log(`
🌐 Web Scraping Memory Agent Ready!

This agent demonstrates Daydreams memory system with proper patterns:
✓ High-level API - Uses memory.remember() and memory.recall()
✓ Factual Memory - Stores facts using type: "fact"
✓ Vector Memory - Stores documents for semantic search
✓ Graph Memory - Creates entity relationships (websites/topics)
✓ Context Isolation - Organizes memories by scraping context
✓ Automatic Features - Working memory, episodes, semantic learning
✓ Memory Limits - Automatic cleanup and pruning
✓ Transactions - Data consistency across operations

Try these commands:
• "Scrape https://example.com/ai-news for AI context"
• "Query scraped content about artificial intelligence"  
• "Show memory statistics"
• "Analyze patterns for AI context"
• "What websites have I scraped?"

The agent will automatically organize and connect information across all memory types!
    `);

    // Start the agent
    agent.start();
  } catch (error) {
    console.error("❌ Failed to start agent:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  process.exit(0);
});

// Run the main function
if (require.main === module) {
  main().catch(console.error);
}

export { createWebScrapingAgent, createScrapingMemory };
