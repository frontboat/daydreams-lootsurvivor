import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDreams } from "../dreams";
import { context } from "../context";
import { action } from "../utils";
import type { Agent, AnyContext } from "../types";
import * as z from "zod";
import {
  createSilentTestAgent,
  createMockLanguageModel,
  createTestMemory,
} from "./test-utilities";

describe("Context-Engine Integration - Tier 2", () => {
  let agent: Agent;

  afterEach(async () => {
    if (agent?.isBooted()) {
      await agent.stop();
    }
  });

  describe("Context Creation and Execution", () => {
    it("should create and execute context with working memory persistence", async () => {
      // Create a realistic chat context
      const chatContext = context({
        type: "chat",
        schema: z.object({
          userId: z.string(),
          sessionId: z.string().optional(),
        }),
        create: ({ userId }) => ({
          messages: [],
          userId,
          startTime: Date.now(),
        }),
        instructions: "You are a helpful assistant in a chat conversation.",
      });

      // Create agent with real context and basic I/O
      agent = createDreams({
        model: createMockLanguageModel({
          responses: [
            "<think>User is greeting me, I should respond</think><output type='text'>Hello! How can I help you today?</output>",
          ],
        }),
        memory: createTestMemory(),
        contexts: [chatContext],
        inputs: {
          text: {
            schema: z.string(),
            handler: async (content: string) => ({
              data: content,
              params: {}
            })
          }
        },
        outputs: {
          text: {
            schema: z.string(),
            handler: async (data: string) => ({
              data,
              processed: true
            })
          }
        },
        logLevel: 2, // ERROR level to reduce noise
      });

      await agent.start();

      // Execute a conversation
      const result = await agent.send({
        context: chatContext,
        args: { userId: "user123", sessionId: "session456" },
        input: { type: "text", data: "Hello" },
      });

      // Verify the complete integration
      expect(result).toBeDefined();
      expect(result.outputs).toHaveLength(1);
      expect(result.outputs[0].content).toBe("Hello! How can I help you today?");

      // Verify context was created
      const contexts = await agent.getContexts();
      expect(contexts).toHaveLength(1);
      expect(contexts[0].type).toBe("chat");
      expect(contexts[0].id).toBe("chat:user123");

      // Verify working memory was persisted
      const contextId = "chat:user123";
      const workingMemory = await agent.memory.working.get(contextId);
      expect(workingMemory.inputs).toHaveLength(1);
      expect(workingMemory.outputs).toHaveLength(1);
      expect(workingMemory.thoughts).toHaveLength(1);
    });

    it("should handle context switching during execution", async () => {
      // Create two different contexts
      const chatContext = context({
        type: "chat",
        schema: z.object({ userId: z.string() }),
        create: () => ({ messages: [] }),
        instructions: "You are a chat assistant.",
      });

      const taskContext = context({
        type: "task",
        schema: z.object({ taskId: z.string() }),
        create: () => ({ steps: [], status: "pending" }),
        instructions: "You are a task management assistant.",
      });

      agent = createDreams({
        model: createMockLanguageModel({
          responses: [
            "<output type='text'>Chat response</output>",
            "<output type='text'>Task response</output>",
          ],
        }),
        memory: createTestMemory(),
        contexts: [chatContext, taskContext],
        inputs: {
          text: {
            schema: z.string(),
            handler: async (content: string) => ({ data: content, params: {} })
          }
        },
        outputs: {
          text: {
            schema: z.string(),
            handler: async (data: string) => ({ data, processed: true })
          }
        },
        logLevel: 2,
      });

      await agent.start();

      // Execute in chat context
      const chatResult = await agent.send({
        context: chatContext,
        args: { userId: "user1" },
        input: { type: "text", data: "Hello" },
      });

      // Execute in task context
      const taskResult = await agent.send({
        context: taskContext,
        args: { taskId: "task1" },
        input: { type: "text", data: "Create task" },
      });

      // Verify both contexts were created and work independently
      expect(chatResult.outputs[0].content).toBe("Chat response");
      expect(taskResult.outputs[0].content).toBe("Task response");

      const contexts = await agent.getContexts();
      expect(contexts).toHaveLength(2);

      const contextTypes = contexts.map(c => c.type).sort();
      expect(contextTypes).toEqual(["chat", "task"]);

      // Verify independent working memories
      const chatMemory = await agent.memory.working.get("chat:user1");
      const taskMemory = await agent.memory.working.get("task:task1");
      
      expect(chatMemory.inputs).toHaveLength(1);
      expect(taskMemory.inputs).toHaveLength(1);
      expect(chatMemory.inputs[0].content).toBe("Hello");
      expect(taskMemory.inputs[0].content).toBe("Create task");
    });

    it("should maintain context state across multiple runs", async () => {
      let messageCount = 0;
      const chatContext = context({
        type: "persistent-chat",
        schema: z.object({ userId: z.string() }),
        create: () => ({ 
          messageHistory: [],
          conversationCount: 0 
        }),
        onStep: async (args, ctx) => {
          // Update context memory with each interaction
          ctx.memory.conversationCount++;
          return ctx;
        },
        instructions: "You are a persistent chat assistant.",
      });

      agent = createDreams({
        model: createMockLanguageModel({
          responses: [
            "<output type='text'>First response</output>",
            "<output type='text'>Second response</output>",
            "<output type='text'>Third response</output>",
          ],
        }),
        memory: createTestMemory(),
        contexts: [chatContext],
        inputs: {
          text: {
            schema: z.string(),
            handler: async (content: string) => ({ data: content, params: {} })
          }
        },
        outputs: {
          text: {
            schema: z.string(),
            handler: async (data: string) => ({ data, processed: true })
          }
        },
        logLevel: 2,
      });

      await agent.start();

      const contextArgs = { userId: "persistent-user" };

      // First interaction
      await agent.send({
        context: chatContext,
        args: contextArgs,
        input: { type: "text", data: "Message 1" },
      });

      // Second interaction - should maintain state
      await agent.send({
        context: chatContext,
        args: contextArgs,
        input: { type: "text", data: "Message 2" },
      });

      // Third interaction - should continue maintaining state
      await agent.send({
        context: chatContext,
        args: contextArgs,
        input: { type: "text", data: "Message 3" },
      });

      // Verify context state was maintained across runs
      const contexts = await agent.getContexts();
      expect(contexts).toHaveLength(1);

      // Verify working memory accumulated across runs
      const workingMemory = await agent.memory.working.get("persistent-chat:persistent-user");
      expect(workingMemory.inputs).toHaveLength(3);
      expect(workingMemory.outputs).toHaveLength(3);
      
      // Verify messages are in correct order
      expect(workingMemory.inputs[0].content).toBe("Message 1");
      expect(workingMemory.inputs[1].content).toBe("Message 2"); 
      expect(workingMemory.inputs[2].content).toBe("Message 3");
    });

    it("should execute actions within context and persist results", async () => {
      // Create a search action
      const searchAction = action({
        name: "search",
        schema: z.object({
          query: z.string(),
        }),
        handler: async ({ query }) => {
          // Simulate search
          return {
            results: [`Result for: ${query}`],
            count: 1,
          };
        },
      });

      const searchContext = context({
        type: "search-chat",
        schema: z.object({ userId: z.string() }),
        create: () => ({ searchHistory: [] }),
        actions: [searchAction],
        instructions: "You can search for information using the search action.",
      });

      agent = createDreams({
        model: createMockLanguageModel({
          responses: [
            "<think>User wants to search, I'll use the search action</think><action_call name='search'>{'query': 'test query'}</action_call><output type='text'>I found some results for you!</output>",
          ],
        }),
        memory: createTestMemory(),
        contexts: [searchContext],
        inputs: {
          text: {
            schema: z.string(),
            handler: async (content: string) => ({ data: content, params: {} })
          }
        },
        outputs: {
          text: {
            schema: z.string(),
            handler: async (data: string) => ({ data, processed: true })
          }
        },
        logLevel: 2,
      });

      await agent.start();

      // Execute search within context
      const result = await agent.send({
        context: searchContext,
        args: { userId: "search-user" },
        input: { type: "text", data: "Search for test query" },
      });

      // Verify action was executed and result included
      expect(result.calls).toHaveLength(1);
      expect(result.results).toHaveLength(1);
      expect(result.outputs).toHaveLength(1);

      const actionCall = result.calls[0];
      const actionResult = result.results[0];

      expect(actionCall.name).toBe("search");
      expect(actionCall.data.query).toBe("test query");
      expect(actionResult.data.results).toEqual(["Result for: test query"]);

      // Verify persistence in working memory
      const workingMemory = await agent.memory.working.get("search-chat:search-user");
      expect(workingMemory.calls).toHaveLength(1);
      expect(workingMemory.results).toHaveLength(1);
      expect(workingMemory.thoughts).toHaveLength(1);
      expect(workingMemory.outputs).toHaveLength(1);

      // Verify action results are accessible in working memory
      expect(workingMemory.results[0].data.count).toBe(1);
    });
  });

  describe("Context Memory Integration", () => {
    it("should persist context-specific memory between agent restarts", async () => {
      const memory = createTestMemory();
      
      // Create context with custom memory structure
      const projectContext = context({
        type: "project", 
        schema: z.object({ projectId: z.string() }),
        create: ({ projectId }) => ({
          projectId,
          files: [],
          lastModified: Date.now(),
        }),
        save: async (state) => {
          // Custom save logic for context memory
          await memory.kv.set(`project-memory:${state.id}`, state.memory);
        },
        load: async (id) => {
          // Custom load logic for context memory
          return await memory.kv.get(`project-memory:${id}`);
        },
        instructions: "You are working on a software project.",
      });

      // First agent instance
      agent = createDreams({
        model: createMockLanguageModel({
          responses: ["<output type='text'>Working on project</output>"],
        }),
        memory,
        contexts: [projectContext],
        inputs: {
          text: {
            schema: z.string(),
            handler: async (content: string) => ({ data: content, params: {} })
          }
        },
        outputs: {
          text: {
            schema: z.string(),
            handler: async (data: string) => ({ data, processed: true })
          }
        },
        logLevel: 2,
      });

      await agent.start();

      // Create context and add some data
      await agent.send({
        context: projectContext,
        args: { projectId: "proj123" },
        input: { type: "text", data: "Start working" },
      });

      await agent.stop();

      // Create second agent instance with same memory
      const agent2 = createDreams({
        model: createMockLanguageModel({
          responses: ["<output type='text'>Continuing project work</output>"],
        }),
        memory,
        contexts: [projectContext],
        inputs: {
          text: {
            schema: z.string(),
            handler: async (content: string) => ({ data: content, params: {} })
          }
        },
        outputs: {
          text: {
            schema: z.string(),
            handler: async (data: string) => ({ data, processed: true })
          }
        },
        logLevel: 2,
      });

      await agent2.start();

      // Context should be restored from memory
      await agent2.send({
        context: projectContext,
        args: { projectId: "proj123" },
        input: { type: "text", data: "Continue working" },
      });

      // Verify context was restored
      const contexts = await agent2.getContexts();
      expect(contexts).toHaveLength(1);
      expect(contexts[0].type).toBe("project");

      // Verify working memory accumulated across agent restarts
      const workingMemory = await agent2.memory.working.get("project:proj123");
      expect(workingMemory.inputs).toHaveLength(2); // Both messages
      expect(workingMemory.outputs).toHaveLength(2); // Both responses

      await agent2.stop();
      agent = agent2; // For cleanup
    });

    it("should handle context memory isolation", async () => {
      const sharedMemory = createTestMemory();

      const isolatedContext = context({
        type: "isolated",
        schema: z.object({ 
          userId: z.string(),
          namespace: z.string() 
        }),
        key: ({ userId, namespace }) => `${namespace}-${userId}`,
        create: ({ userId, namespace }) => ({
          userId,
          namespace,
          data: `${namespace} data for ${userId}`,
        }),
        instructions: "You work in an isolated namespace.",
      });

      agent = createDreams({
        model: createMockLanguageModel({
          responses: [
            "<output type='text'>Namespace A response</output>",
            "<output type='text'>Namespace B response</output>",
          ],
        }),
        memory: sharedMemory,
        contexts: [isolatedContext],
        inputs: {
          text: {
            schema: z.string(),
            handler: async (content: string) => ({ data: content, params: {} })
          }
        },
        outputs: {
          text: {
            schema: z.string(),
            handler: async (data: string) => ({ data, processed: true })
          }
        },
        logLevel: 2,
      });

      await agent.start();

      // Create contexts in different namespaces
      await agent.send({
        context: isolatedContext,
        args: { userId: "user1", namespace: "nsA" },
        input: { type: "text", data: "Message A" },
      });

      await agent.send({
        context: isolatedContext,
        args: { userId: "user1", namespace: "nsB" },
        input: { type: "text", data: "Message B" },
      });

      // Verify contexts are isolated
      const contexts = await agent.getContexts();
      expect(contexts).toHaveLength(2);

      const contextIds = contexts.map(c => c.id).sort();
      expect(contextIds).toEqual(["isolated:nsA-user1", "isolated:nsB-user1"]);

      // Verify isolated working memories
      const memoryA = await agent.memory.working.get("isolated:nsA-user1");
      const memoryB = await agent.memory.working.get("isolated:nsB-user1");

      expect(memoryA.inputs).toHaveLength(1);
      expect(memoryB.inputs).toHaveLength(1);
      expect(memoryA.inputs[0].content).toBe("Message A");
      expect(memoryB.inputs[0].content).toBe("Message B");
    });
  });

  describe("Context Lifecycle Integration", () => {
    it("should execute complete context lifecycle with hooks", async () => {
      const lifecycleEvents: string[] = [];

      const lifecycleContext = context({
        type: "lifecycle",
        schema: z.object({ sessionId: z.string() }),
        create: ({ sessionId }) => {
          lifecycleEvents.push("create");
          return { sessionId, events: ["created"] };
        },
        setup: async (args, settings) => {
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
        save: async (state) => {
          lifecycleEvents.push("save");
          // Use the agent's memory system
          await agent.memory.kv.set(`lifecycle-data:${state.id}`, state.memory);
        },
        instructions: "You track lifecycle events.",
      });

      agent = createDreams({
        model: createMockLanguageModel({
          responses: ["<output type='text'>Lifecycle response</output>"],
        }),
        memory: createTestMemory(),
        contexts: [lifecycleContext],
        inputs: {
          text: {
            schema: z.string(),
            handler: async (content: string) => ({ data: content, params: {} })
          }
        },
        outputs: {
          text: {
            schema: z.string(),
            handler: async (data: string) => ({ data, processed: true })
          }
        },
        logLevel: 2,
      });

      await agent.start();

      // Execute a message to trigger full lifecycle
      await agent.send({
        context: lifecycleContext,
        args: { sessionId: "session123" },
        input: { type: "text", data: "Test lifecycle" },
      });

      // Verify all lifecycle events were triggered in correct order
      expect(lifecycleEvents).toEqual([
        "create",
        "setup", 
        "onStep",
        "onRun",
        "save"
      ]);

      // Verify context memory includes lifecycle data
      const contextId = "lifecycle:session123";
      const savedData = await agent.memory.kv.get(`lifecycle-data:${contextId}`);
      expect(savedData).toBeDefined();
      expect(savedData.sessionId).toBe("session123");
      expect(savedData.events).toContain("created");
      expect(savedData.events).toContain("step");
      expect(savedData.events).toContain("run");
    });
  });
});