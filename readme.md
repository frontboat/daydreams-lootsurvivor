<p align="center">
  <img src="./docs/public/new-logo.png" alt="Daydreams" width="600">
</p>

<p align="center">
  <strong>TypeScript Framework for Stateful AI Agents</strong>
</p>

<p align="center">
  <a href="https://docs.dreams.fun"><img src="https://img.shields.io/badge/docs-dreams.fun-blue?style=flat-square" alt="Documentation"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square" alt="License: MIT"></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript"></a>
  <a href="https://github.com/daydreamsai/daydreams/stargazers"><img src="https://img.shields.io/github/stars/daydreamsai/daydreams?style=flat-square" alt="GitHub stars"></a>
</p>

Daydreams is the **first AI framework with composable contexts** - isolated
workspaces that combine for complex behaviors. Build agents that remember,
learn, and scale with **true memory**, **MCP integration**, and
**TypeScript-first** design.

## 🌟 The Power of Context Composition

Unlike other frameworks, Daydreams lets you compose contexts using `.use()` -
creating powerful agents from modular components:

```typescript
import { createDreams, context, action } from "@daydreamsai/core";
import { openai } from "@ai-sdk/openai";

// Base analytics context - tracks user behavior
const analyticsContext = context({
  type: "analytics",
  create: () => ({ events: [], sessions: 0 }),
}).setActions([
  action({
    name: "trackEvent",
    schema: { event: z.string() },
    handler: async ({ event }, ctx) => {
      ctx.memory.events.push({ event, timestamp: Date.now() });
      return { tracked: true };
    },
  }),
]);

// Customer support context that composes with analytics
const supportContext = context({
  type: "support",
  schema: z.object({
    customerId: z.string(),
    tier: z.enum(["free", "premium"]),
  }),
  create: () => ({ tickets: [] }),
})
  // 🌟 The magic: compose contexts together
  .use((state) => [
    { context: analyticsContext, args: { userId: state.args.customerId } },
    // Conditional composition based on customer tier
    ...(state.args.tier === "premium" ? [{ context: premiumContext }] : []),
  ])
  .instructions(
    (state) =>
      `You are a ${state.args.tier} customer support agent. Track all interactions.`
  );

// Agent automatically gets ALL composed functionality
const agent = createDreams({
  model: openai("gpt-4o"),
  contexts: [supportContext],
});

// Customer gets support + analytics + premium features (if applicable)
await agent.send({
  context: supportContext,
  args: { customerId: "alice", tier: "premium" },
  input: "I need help with billing",
});
```

**Result**: Your agent seamlessly combines customer support, analytics tracking,
and premium features in a single conversation. No manual integration required.

## 🔌 Universal MCP Integration

Connect to **any** [Model Context Protocol](https://modelcontextprotocol.io)
server for instant access to external tools:

```typescript
import { createMcpExtension } from "@daydreamsai/mcp";

const agent = createDreams({
  extensions: [
    createMcpExtension([
      {
        id: "filesystem",
        transport: {
          type: "stdio",
          command: "npx",
          args: ["@modelcontextprotocol/server-filesystem", "./docs"],
        },
      },
      {
        id: "database",
        transport: {
          type: "stdio",
          command: "npx",
          args: ["@modelcontextprotocol/server-sqlite", "./data.db"],
        },
      },
    ]),
  ],
});

// Use MCP tools in any action
const searchAction = action({
  name: "search-docs",
  handler: async ({ query }, ctx) => {
    // Read files via MCP
    const docs = await ctx.callAction("mcp.listResources", {
      serverId: "filesystem",
    });

    // Query database via MCP
    const results = await ctx.callAction("mcp.callTool", {
      serverId: "database",
      name: "query",
      arguments: { sql: `SELECT * FROM docs WHERE content LIKE '%${query}%'` },
    });

    return { docs, results };
  },
});
```

**Result**: Your agent instantly gets file system access, database querying, web
scraping, 3D rendering, and more through the growing MCP ecosystem.

## ⚡ Quick Start

```bash
npm install @daydreamsai/core
```

Or scaffold a new agent:

```bash
npx create-daydreams-agent my-agent
cd my-agent && npm run dev
```

## ✨ Key Features

**🧩 Composable Contexts** - Build complex agents from simple, reusable
contexts  
**🔌 Native MCP Support** - Universal access to external tools and services  
**💾 Persistent Memory** - True stateful agents that remember across sessions  
**⚡ Full TypeScript** - Complete type safety with excellent developer
experience  
**🎯 Context Isolation** - Automatic separation of user data and conversations  
**🔧 Action Scoping** - Context-specific capabilities and permissions  
**🌐 Universal Runtime** - Works in Node.js, browsers, Deno, Bun, and edge
functions  
**🏗️ Modular Extensions** - Clean plugin architecture for platforms and services

## 🏗️ Core Architecture

### Context System

**Isolated stateful workspaces** for different conversation types:

```typescript
const userContext = context({
  type: "user",
  schema: z.object({ userId: z.string() }),
  create: () => ({ preferences: {}, history: [] }),
  render: (state) =>
    `User: ${state.args.userId} | History: ${state.memory.history.length} items`,
});
```

### Memory System

**Dual-tier storage** with automatic persistence:

- **Working Memory**: Temporary execution state (inputs, outputs, actions)
- **Context Memory**: Persistent data defined by your `create()` function

### Action System

**Type-safe functions** with context access and schema validation:

```typescript
const savePreference = action({
  name: "save-preference",
  description: "Save a user preference",
  schema: z.object({ key: z.string(), value: z.string() }),
  handler: async ({ key, value }, ctx) => {
    ctx.memory.preferences[key] = value;
    return { saved: `${key} = ${value}` };
  },
});
```

### Extension System

**Modular integrations** for platforms and services:

```typescript
import { discordExtension } from "@daydreamsai/discord";
import { supabaseExtension } from "@daydreamsai/supabase";

const agent = createDreams({
  extensions: [
    discordExtension({ token: process.env.DISCORD_TOKEN }),
    supabaseExtension({ url: process.env.SUPABASE_URL }),
  ],
});
```

## 🎯 Context Patterns

### Single Context - Simple & Focused

Perfect for straightforward bots:

```typescript
const faqBot = context({
  type: "faq",
  instructions: "Answer questions about our product",
});
```

### Multiple Contexts - Separate Workspaces

When you need isolated functionality:

```typescript
const agent = createDreams({
  contexts: [
    chatContext, // User conversations
    gameContext, // Game sessions
    adminContext, // Admin functions
  ],
});
```

### 🌟 Composed Contexts - Maximum Power

**This is where Daydreams excels** - contexts working together:

```typescript
const smartAssistant = context({
  type: "assistant",
  schema: z.object({ userId: z.string(), plan: z.enum(["free", "pro"]) }),
}).use((state) => [
  // Always include user profile
  { context: profileContext, args: { userId: state.args.userId } },
  // Always include basic analytics
  { context: analyticsContext, args: { userId: state.args.userId } },
  // Add premium features for pro users
  ...(state.args.plan === "pro" ? [{ context: premiumContext }] : []),
]);
```

**[📖 Learn More About Contexts →](https://docs.dreams.fun/docs/core/concepts/contexts)**

## 🔌 MCP Integration

Daydreams provides **native** Model Context Protocol support through extensions:

```typescript
import { createMcpExtension } from "@daydreamsai/mcp";

// Connect to any MCP server
createMcpExtension([
  // Local servers via stdio
  {
    id: "files",
    transport: { type: "stdio", command: "mcp-server", args: ["./data"] },
  },
  // Remote servers via HTTP/SSE
  {
    id: "api",
    transport: { type: "sse", serverUrl: "https://mcp-api.example.com" },
  },
]);
```

**Popular MCP Servers**:

- **Database Access**: SQLite, PostgreSQL, MySQL
- **File Systems**: Local files, cloud storage, git repos
- **Web Services**: Search, scraping, APIs, social media
- **Developer Tools**: Code execution, testing, deployment
- **Specialized**: 3D rendering, image processing, analytics

**[📖 Learn More About MCP →](https://docs.dreams.fun/docs/core/concepts/mcp)**

## 📚 Documentation

**🏠 [Complete Documentation](https://docs.dreams.fun)** - Everything you need
to build production agents

### Essential Guides

- **[First Agent](https://docs.dreams.fun/docs/core/first-agent)** - Build your
  first agent in 5 minutes
- **[Context System](https://docs.dreams.fun/docs/core/concepts/contexts)** -
  Master stateful conversations
- **[MCP Integration](https://docs.dreams.fun/docs/core/concepts/mcp)** -
  Connect to external tools
- **[Extensions](https://docs.dreams.fun/docs/core/concepts/extensions)** -
  Platform integrations

### Tutorials

- **[Basic Agent](https://docs.dreams.fun/docs/tutorials/basic/single-context)** -
  Simple conversational bot
- **[Multi-Context Agent](https://docs.dreams.fun/docs/tutorials/basic/multi-context-agent)** -
  Handle multiple workflows
- **[MCP Setup](https://docs.dreams.fun/docs/tutorials/mcp/mcp-guide)** -
  Connect external servers
- **[x402 Nanoservice](https://docs.dreams.fun/docs/tutorials/x402/server)** -
  Paid AI services

## 🚀 Extensions & Ecosystem

### Platform Integrations

- **[@daydreamsai/discord](https://npmjs.com/package/@daydreamsai/discord)** -
  Discord bot support
- **[@daydreamsai/twitter](https://npmjs.com/package/@daydreamsai/twitter)** -
  Twitter/X automation
- **[@daydreamsai/telegram](https://npmjs.com/package/@daydreamsai/telegram)** -
  Telegram bots
- **[@daydreamsai/cli](https://npmjs.com/package/@daydreamsai/cli)** -
  Interactive terminal

### Storage & Memory

- **[@daydreamsai/supabase](https://npmjs.com/package/@daydreamsai/supabase)** -
  Supabase vector store
- **[@daydreamsai/chroma](https://npmjs.com/package/@daydreamsai/chroma)** -
  ChromaDB integration
- **[@daydreamsai/mongo](https://npmjs.com/package/@daydreamsai/mongo)** -
  MongoDB persistence

### Developer Tools

- **[@daydreamsai/mcp](https://npmjs.com/package/@daydreamsai/mcp)** - Model
  Context Protocol
- **[create-daydreams-agent](https://npmjs.com/package/create-daydreams-agent)** -
  Project scaffolding

## 🏃‍♂️ Examples

Explore working examples in [`examples/`](./examples):

- **[Basic Chat](./examples/basic/)** - Simple conversational agents
- **[Multi-Context](./examples/basic/multi-context.tsx)** - Multiple
  conversation types
- **[Discord Bot](./examples/social/discord.ts)** - Platform integration example
- **[MCP Integration](./examples/mcp/)** - External tool connections
- **[x402 Nanoservice](./examples/x402/)** - Paid AI services with micropayments

## 🛠️ Development

### Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for
guidelines.

**Development setup:**

```bash
git clone https://github.com/daydreamsai/daydreams.git
cd daydreams
pnpm install
./scripts/build.sh --watch
bun run packages/core  # Run tests
```

### Community

- **[Discord](https://discord.gg/rt8ajxQvXh)** - Chat with developers and get
  help
- **[GitHub Issues](https://github.com/daydreamsai/daydreams/issues)** - Bug
  reports and feature requests
- **[Documentation](https://docs.dreams.fun)** - Complete guides and API
  reference

## ✨ Why Daydreams?

**🧩 Composable by Design** - Build complex agents from simple, reusable
contexts  
**🔌 MCP Native** - Universal access to external tools and services  
**💾 True State** - Persistent memory that survives restarts and scales  
**⚡ TypeScript First** - Full type safety with excellent DX  
**🌐 Universal Runtime** - Works everywhere JavaScript runs  
**🏗️ Production Ready** - Built for scale with monitoring and error handling

---

**[MIT Licensed](./licence.md)** • Built with ❤️ by the
[Daydreams](https://dreams.fun) team
