<p align="center">
  <img src="./docs/public/Daydreams.png" alt="Daydreams" width="600">
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

Daydreams enables you to build AI agents that remember, learn, and persist state
across conversations. Define contexts with typed memory, create custom actions,
and let your agents manage complex multi-step workflows.

## Quick Example

```typescript
import { createDreams, context, action } from "@daydreamsai/core";
import { anthropic } from "@ai-sdk/anthropic";
import * as z from "zod";

// Define memory structure for each user
const userContext = context({
  type: "user",
  schema: z.object({ userId: z.string() }),
  create: () => ({
    preferences: {},
    conversationCount: 0,
  }),
});

// Create agent with custom action
const agent = await createDreams({
  model: anthropic("claude-3-5-sonnet-latest"),
  contexts: [userContext],
  actions: [
    action({
      name: "save-preference",
      schema: z.object({
        key: z.string(),
        value: z.string(),
      }),
      handler: async ({ key, value }, ctx) => {
        ctx.memory.preferences[key] = value;
        return `Saved: ${key} = ${value}`;
      },
    }),
  ],
}).start();

// Send message - state persists across calls
await agent.send({
  context: userContext,
  args: { userId: "alice" },
  input: { type: "text", data: "I prefer TypeScript over JavaScript" },
});
```

## Key Features

- **Type-safe contexts** - Define memory schemas with Zod validation
- **Persistent state** - Automatic storage and restoration across sessions
- **Custom actions** - Give agents tools to interact with your systems
- **Multi-context** - Handle multiple conversations simultaneously
- **Universal runtime** - Node.js, browsers, Deno, Bun, edge functions
- **Provider agnostic** - Works with any LLM via AI SDK adapters

## Installation

```bash
npm install @daydreamsai/core
```

**Quick setup:**

```bash
npx create-daydreams-agent my-agent
cd my-agent
npm run dev
```

## Core Concepts

### 1. Contexts

Isolated stateful environments for conversations or tasks:

```typescript
const chatContext = context({
  type: "chat",
  schema: z.object({ userId: z.string() }),
  create: () => ({ messages: [], settings: {} }),
  render: (state) =>
    `User: ${state.args.userId}\nMessages: ${state.memory.messages.length}`,
});
```

### 2. Actions

Type-safe functions your agent can execute:

```typescript
const searchAction = action({
  name: "web_search",
  description: "Search the web for information",
  schema: z.object({ query: z.string() }),
  handler: async ({ query }) => {
    // Your search implementation
    return { results: [...] };
  },
});
```

### 3. Memory

Dual-tier storage system:

- **Working Memory**: Temporary execution state (inputs, outputs, actions)
- **Context Memory**: Persistent data defined by your `create()` function

## Best Practices

✅ **Define clear memory schemas** - Use Zod for validation and type safety

```typescript
const schema = z.object({
  userId: z.string().min(1),
  sessionId: z.string().uuid(),
});
```

✅ **Use context keys for isolation** - Separate data by user, session, or
tenant

```typescript
const context = context({
  type: "user",
  schema: z.object({ userId: z.string() }),
  key: ({ userId }) => userId, // Each user gets isolated state
});
```

✅ **Design focused actions** - Single responsibility, clear schemas

```typescript
// Good: Specific, focused action
action({
  name: "send_email",
  schema: z.object({ to: z.string().email(), subject: z.string() }),
});

// Avoid: Generic, unclear actions
action({ name: "do_something", schema: z.any() });
```

✅ **Handle errors gracefully** - Actions should return meaningful error
messages

```typescript
handler: async ({ email }) => {
  try {
    await sendEmail(email);
    return { success: true };
  } catch (error) {
    return { error: "Failed to send email: " + error.message };
  }
};
```

✅ **Structure memory logically** - Organize data for easy access and updates

```typescript
create: () => ({
  user: { name: "", preferences: {} },
  session: { startTime: Date.now(), messageCount: 0 },
  history: { topics: [], decisions: [] },
});
```

## Documentation

**📖 [Complete Documentation](https://docs.dreams.fun)** - Everything you need
to know

### Essential Guides

- **[Getting Started](https://docs.dreams.fun/getting-started)** - Your first
  agent in 5 minutes
- **[Context System](https://docs.dreams.fun/concepts/contexts)** - Managing
  stateful conversations
- **[Actions & Tools](https://docs.dreams.fun/concepts/actions)** - Extending
  agent capabilities
- **[Memory & Persistence](https://docs.dreams.fun/concepts/memory)** - Storage
  and retrieval patterns
- **[Production Deployment](https://docs.dreams.fun/deployment)** - Scale your
  agents

### API Reference

- **[Core API](https://docs.dreams.fun/api/core)** - Complete API documentation
- **[Extension APIs](https://docs.dreams.fun/api/extensions)** - Platform
  integrations
- **[Types](https://docs.dreams.fun/api/types)** - TypeScript definitions

## Examples

Learn by example in the [`examples/`](./examples) directory:

- **[Basic Chat](./examples/basic/)** - Simple conversational agent
- **[Multi-Context](./examples/basic/multi-context.tsx)** - Handle multiple
  users
- **[Discord Bot](./examples/social/discord.ts)** - Platform integration
- **[Web Scraper](./examples/basic/web-scraper-memory-agent.ts)** - Data
  collection agent
- **[Game Agents](./examples/games/)** - Interactive game bots

## Extensions

### Platform Integrations

- **[@daydreamsai/discord](https://www.npmjs.com/package/@daydreamsai/discord)** -
  Discord bot integration
- **[@daydreamsai/twitter](https://www.npmjs.com/package/@daydreamsai/twitter)** -
  Twitter/X automation
- **[@daydreamsai/telegram](https://www.npmjs.com/package/@daydreamsai/telegram)** -
  Telegram bot support
- **[@daydreamsai/cli](https://www.npmjs.com/package/@daydreamsai/cli)** -
  Interactive CLI

### Storage & Memory

- **[@daydreamsai/supabase](https://www.npmjs.com/package/@daydreamsai/supabase)** -
  Supabase vector store
- **[@daydreamsai/chroma](https://www.npmjs.com/package/@daydreamsai/chroma)** -
  ChromaDB integration
- **[@daydreamsai/mongo](https://www.npmjs.com/package/@daydreamsai/mongo)** -
  MongoDB support

### Developer Tools

- **[@daydreamsai/create-agent](https://www.npmjs.com/package/create-daydreams-agent)** -
  Project scaffolding

## Development

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

- **[Discord](https://discord.gg/rt8ajxQvXh)** - Chat with developers
- **[Twitter](https://twitter.com/daydreamsagents)** - Updates and announcements
- **[GitHub Issues](https://github.com/daydreamsai/daydreams/issues)** - Bug
  reports and feature requests

---

**[MIT Licensed](./licence.md)** • Built by the [Daydreams](https://dreams.fun)
team
