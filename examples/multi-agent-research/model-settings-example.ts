/**
 * Model Settings Example
 *
 * This example demonstrates how to configure model settings at different levels:
 * 1. Agent level (global defaults)
 * 2. Context level (per-context overrides)
 * 3. Runtime level (per-run overrides)
 *
 * Precedence order: Runtime > Context > Agent
 */

import { createDreams, context } from "@daydreamsai/core";
import { openrouter } from "@openrouter/ai-sdk-provider";
import * as z from "zod/v4";

// Context with custom model settings
const fastChatContext = context({
  type: "fast-chat",
  model: openrouter("anthropic/claude-3-haiku"),
  modelSettings: {
    temperature: 0.7, // More creative for chat
    maxTokens: 2048, // Shorter responses for chat
    stopSequences: ["\n\n"], // Stop at double newlines
    providerOptions: {
      anthropic: {
        max_tokens: 2048,
      },
    },
  },
  schema: z.object({
    userId: z.string(),
  }),
});

// Context with reasoning model and custom settings
const researchContext = context({
  type: "research",
  model: openrouter("deepseek/deepseek-reasoning"),
  modelSettings: {
    temperature: 0.1, // Very focused for research
    maxTokens: 32768, // Long responses for detailed research
    stopSequences: ["\n</research>"],
    providerOptions: {
      openrouter: {
        reasoning: {
          max_tokens: 32768,
          top_p: 0.9,
        },
      },
    },
  },
  schema: z.object({
    query: z.string(),
  }),
});

// Context without custom model settings (will use agent defaults)
const basicContext = context({
  type: "basic",
  schema: z.object({
    input: z.string(),
  }),
});

// Create agent with default model settings
const agent = createDreams({
  // Agent-level model settings (lowest precedence)
  model: openrouter("google/gemini-2.5-pro"),
  modelSettings: {
    temperature: 0.5, // Balanced default
    maxTokens: 4096, // Standard token limit
    stopSequences: ["\n</response>"],
    providerOptions: {
      openrouter: {
        reasoning: {
          max_tokens: 16384,
        },
      },
      anthropic: {
        max_tokens: 4096,
      },
    },
  },
});

async function demonstrateModelSettings() {
  console.log("🔧 Model Settings Demonstration\n");

  await agent.start();

  // 1. Context with custom model settings (overrides agent defaults)
  console.log("1️⃣ Fast Chat Context (uses Claude Haiku + custom settings):");
  console.log("   - Model: Claude Haiku");
  console.log("   - Temperature: 0.7 (more creative)");
  console.log("   - Max Tokens: 2048 (shorter responses)");

  await agent.run({
    context: fastChatContext,
    args: { userId: "user123" },
  });

  // 2. Research context with reasoning model
  console.log(
    "\n2️⃣ Research Context (uses DeepSeek Reasoning + custom settings):"
  );
  console.log("   - Model: DeepSeek Reasoning");
  console.log("   - Temperature: 0.1 (very focused)");
  console.log("   - Max Tokens: 32768 (detailed responses)");

  await agent.run({
    context: researchContext,
    args: { query: "Latest AI developments" },
  });

  // 3. Basic context (uses agent defaults)
  console.log("\n3️⃣ Basic Context (uses agent model + agent settings):");
  console.log("   - Model: Gemini 2.5 Pro (from agent)");
  console.log("   - Temperature: 0.5 (from agent defaults)");
  console.log("   - Max Tokens: 4096 (from agent defaults)");

  await agent.run({
    context: basicContext,
    args: { input: "Hello world" },
  });

  // 4. Runtime override (highest precedence)
  console.log("\n4️⃣ Runtime Override (overrides everything):");
  console.log("   - Context: Fast Chat");
  console.log("   - Runtime Temperature: 0.1 (overrides context 0.7)");
  console.log("   - Runtime Max Tokens: 1024 (overrides context 2048)");

  await agent.run({
    context: fastChatContext,
    args: { userId: "user456" },
    // Runtime model settings (highest precedence)
    modelSettings: {
      temperature: 0.1,
      maxTokens: 1024,
      providerOptions: {
        anthropic: {
          max_tokens: 1024,
          temperature: 0.1,
        },
      },
    },
  });
}

// Model Settings Precedence Summary
console.log(`
📋 Model Settings Precedence Summary:

Level 1: Agent Settings (Global Defaults)
┌─────────────────────────────────────────┐
│ agent = createDreams({                  │
│   modelSettings: {                      │
│     temperature: 0.5,                   │
│     maxTokens: 4096,                    │
│     // ... other settings               │
│   }                                     │
│ })                                      │
└─────────────────────────────────────────┘

Level 2: Context Settings (Per-Context Overrides)
┌─────────────────────────────────────────┐
│ const myContext = context({             │
│   modelSettings: {                      │
│     temperature: 0.1,  // Overrides     │
│     maxTokens: 8192,   // agent defaults│
│   }                                     │
│ })                                      │
└─────────────────────────────────────────┘

Level 3: Runtime Settings (Per-Run Overrides)
┌─────────────────────────────────────────┐
│ agent.run({                             │
│   context: myContext,                   │
│   args: { ... },                        │
│   modelSettings: {     // Highest       │
│     temperature: 0.8   // precedence    │
│   }                                     │
│ })                                      │
└─────────────────────────────────────────┘

Final Settings: { temperature: 0.8, maxTokens: 8192 }
(Runtime temp + Context maxTokens + Agent defaults for others)
`);

// Run the demonstration
demonstrateModelSettings().catch(console.error);
