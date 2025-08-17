import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDreams } from "../dreams";
import { context, createContextState, getContextWorkingMemory, saveContextState } from "../context";
import { createEngine } from "../engine";
import type { Agent, AnyContext } from "../types";
import * as z from "zod";
import {
  createMockLanguageModel,
  createTestMemory,
  createMockContextState,
} from "./test-utilities";

describe("Context-Engine Integration - Tier 2 (Simplified)", () => {
  let agent: Agent;

  afterEach(async () => {
    if (agent?.isBooted()) {
      await agent.stop();
    }
  });

  describe("Context State Management Integration", () => {
    it("should create and persist context state with working memory", async () => {
      // Create a simple chat context
      const chatContext = context({
        type: "integration-chat",
        schema: z.object({
          userId: z.string(),
        }),
        key: ({ userId }) => userId,
        create: ({ userId }) => ({
          messages: [],
          userId,
          createdAt: Date.now(),
        }),
        instructions: "You are a helpful assistant.",
      });

      // Create agent with basic setup
      agent = createDreams({
        model: createMockLanguageModel(),
        memory: createTestMemory(),
        contexts: [chatContext],
        logLevel: 2,
      });

      await agent.start();

      // Test 1: Create context state
      const contextState = await createContextState({
        agent,
        context: chatContext,
        args: { userId: "test-user" },
      });

      expect(contextState).toBeDefined();
      expect(contextState.id).toBe("integration-chat:test-user");
      expect(contextState.memory.userId).toBe("test-user");
      expect(contextState.memory.messages).toEqual([]);

      // Test 2: Get working memory for context
      const workingMemory = await getContextWorkingMemory(agent, contextState.id);

      expect(workingMemory).toBeDefined();
      expect(workingMemory.inputs).toEqual([]);
      expect(workingMemory.outputs).toEqual([]);
      expect(workingMemory.calls).toEqual([]);

      // Test 3: Save context state
      contextState.memory.messages.push("test message");
      await saveContextState(agent, contextState);

      // Test 4: Verify persistence
      const contexts = await agent.getContexts();
      expect(contexts).toHaveLength(1);
      expect(contexts[0].id).toBe("integration-chat:test-user");
    });

    it("should handle multiple contexts with isolated state", async () => {
      const userContext = context({
        type: "user-session",
        schema: z.object({
          userId: z.string(),
          sessionId: z.string(),
        }),
        key: ({ userId, sessionId }) => `${userId}-${sessionId}`,
        create: ({ userId, sessionId }) => ({
          userId,
          sessionId,
          preferences: {},
          lastActivity: Date.now(),
        }),
        instructions: "Manage user sessions.",
      });

      agent = createDreams({
        model: createMockLanguageModel(),
        memory: createTestMemory(),
        contexts: [userContext],
        logLevel: 2,
      });

      await agent.start();

      // Create multiple context states
      const user1Session1 = await createContextState({
        agent,
        context: userContext,
        args: { userId: "user1", sessionId: "session1" },
      });

      const user1Session2 = await createContextState({
        agent,
        context: userContext,
        args: { userId: "user1", sessionId: "session2" },
      });

      const user2Session1 = await createContextState({
        agent,
        context: userContext,
        args: { userId: "user2", sessionId: "session1" },
      });

      // Verify unique IDs
      expect(user1Session1.id).toBe("user-session:user1-session1");
      expect(user1Session2.id).toBe("user-session:user1-session2");
      expect(user2Session1.id).toBe("user-session:user2-session1");

      // Verify isolated memory
      expect(user1Session1.memory.userId).toBe("user1");
      expect(user1Session2.memory.userId).toBe("user1");
      expect(user2Session1.memory.userId).toBe("user2");

      expect(user1Session1.memory.sessionId).toBe("session1");
      expect(user1Session2.memory.sessionId).toBe("session2");
      expect(user2Session1.memory.sessionId).toBe("session1");

      // Save all contexts
      await saveContextState(agent, user1Session1);
      await saveContextState(agent, user1Session2);
      await saveContextState(agent, user2Session1);

      // Verify all contexts are tracked
      const contexts = await agent.getContexts();
      expect(contexts).toHaveLength(3);

      const contextIds = contexts.map(c => c.id).sort();
      expect(contextIds).toEqual([
        "user-session:user1-session1",
        "user-session:user1-session2", 
        "user-session:user2-session1"
      ]);
    });
  });

  describe("Engine Integration with Context", () => {
    it("should create engine with context state and working memory", async () => {
      const testContext = context({
        type: "engine-test",
        schema: z.object({ testId: z.string() }),
        create: ({ testId }) => ({ testId, data: [] }),
        instructions: "Test context for engine integration.",
      });

      agent = createDreams({
        model: createMockLanguageModel(),
        memory: createTestMemory(),
        contexts: [testContext],
        logLevel: 2,
      });

      await agent.start();

      // Create context state
      const contextState = await createContextState({
        agent,
        context: testContext,
        args: { testId: "engine-test-1" },
      });

      // Get working memory
      const workingMemory = await getContextWorkingMemory(agent, contextState.id);

      // Create engine with real context and working memory
      const engine = createEngine({
        agent,
        ctxState: contextState,
        workingMemory,
        subscriptions: new Set(),
        __chunkSubscriptions: new Set(),
      });

      // Test engine initialization
      expect(engine).toBeDefined();
      expect(engine.state.running).toBe(false);
      expect(engine.state.step).toBe(-1);
      expect(engine.state.ctxState).toBe(contextState);

      // Test engine start
      await engine.start();
      expect(engine.state.running).toBe(true);
      expect(engine.state.step).toBe(1);

      // Verify working memory gets step and run entries
      expect(workingMemory.steps).toHaveLength(1);
      expect(workingMemory.runs).toHaveLength(1);
      expect(workingMemory.steps[0].step).toBe(1);
      expect(workingMemory.runs[0].type).toBe("engine-test");

      // Stop engine
      await engine.stop();
      expect(engine.controller.signal.aborted).toBe(true);
    });

    it("should handle engine lifecycle with context hooks", async () => {
      const lifecycleEvents: string[] = [];

      const hookContext = context({
        type: "lifecycle-hooks",
        schema: z.object({ id: z.string() }),
        create: ({ id }) => {
          lifecycleEvents.push("create");
          return { id, events: ["created"] };
        },
        setup: async (args) => {
          lifecycleEvents.push("setup");
          return { setupTime: Date.now() };
        },
        onStep: async (args, ctx) => {
          lifecycleEvents.push("onStep");
          ctx.memory.events.push("step");
          return ctx;
        },
        onRun: async (args, ctx) => {
          lifecycleEvents.push("onRun");  
          ctx.memory.events.push("run");
          return ctx;
        },
        instructions: "Test context with lifecycle hooks.",
      });

      agent = createDreams({
        model: createMockLanguageModel(),
        memory: createTestMemory(),
        contexts: [hookContext],
        logLevel: 2,
      });

      await agent.start();

      // Create context state - this should trigger create and setup
      const contextState = await createContextState({
        agent,
        context: hookContext,
        args: { id: "lifecycle-test" },
      });

      expect(lifecycleEvents).toContain("create");
      expect(lifecycleEvents).toContain("setup");

      // Verify context memory was initialized properly
      expect(contextState.memory.id).toBe("lifecycle-test");
      expect(contextState.memory.events).toContain("created");
      expect(contextState.options.setupTime).toBeDefined();

      // Get working memory
      const workingMemory = await getContextWorkingMemory(agent, contextState.id);

      // Create and run engine - this should trigger onStep and onRun
      const engine = createEngine({
        agent,
        ctxState: contextState,
        workingMemory,
        subscriptions: new Set(),
        __chunkSubscriptions: new Set(),
      });

      await engine.start();

      // onStep and onRun should be triggered during engine start
      expect(lifecycleEvents).toContain("onStep");
      expect(lifecycleEvents).toContain("onRun");

      // Verify context memory was updated by hooks
      expect(contextState.memory.events).toContain("step");
      expect(contextState.memory.events).toContain("run");

      await engine.stop();
    });
  });

  describe("Memory Persistence Integration", () => {
    it("should persist and restore context state between agent instances", async () => {
      const memory = createTestMemory();

      const persistentContext = context({
        type: "persistent-test",
        schema: z.object({ dataId: z.string() }),
        create: ({ dataId }) => ({
          dataId,
          values: [],
          counter: 0,
        }),
        instructions: "Persistent test context.",
      });

      // First agent instance
      agent = createDreams({
        model: createMockLanguageModel(),
        memory,
        contexts: [persistentContext],
        logLevel: 2,
      });

      await agent.start();

      // Create and modify context
      const contextState1 = await createContextState({
        agent,
        context: persistentContext,
        args: { dataId: "test-data" },
      });

      contextState1.memory.values.push("value1", "value2");
      contextState1.memory.counter = 42;

      await saveContextState(agent, contextState1);
      await agent.stop();

      // Second agent instance with same memory
      const agent2 = createDreams({
        model: createMockLanguageModel(),
        memory, // Same memory instance
        contexts: [persistentContext],
        logLevel: 2,
      });

      await agent2.start();

      // Context should be restored from memory
      const contexts = await agent2.getContexts();
      expect(contexts).toHaveLength(1);
      expect(contexts[0].id).toBe("persistent-test:test-data");

      await agent2.stop();
      agent = agent2; // For cleanup
    });
  });
});