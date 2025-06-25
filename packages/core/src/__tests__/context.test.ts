import { describe, it, expect, beforeEach, vi } from "vitest";
import * as z from "zod/v4";
import {
  context,
  createWorkingMemory,
  getWorkingMemoryLogs,
  getWorkingMemoryAllLogs,
  formatWorkingMemory,
  pushToWorkingMemory,
  getContextId,
} from "../context";
import type { WorkingMemory, AnyRef, ContextSettings } from "../types";

describe("Context Module", () => {
  describe("context", () => {
    it("should create a basic context configuration", () => {
      const testContext = context({
        type: "test-context",
        description: "A test context",
      });

      expect(testContext.type).toBe("test-context");
      expect(testContext.description).toBe("A test context");
      expect(testContext.setActions).toBeInstanceOf(Function);
      expect(testContext.setInputs).toBeInstanceOf(Function);
      expect(testContext.setOutputs).toBeInstanceOf(Function);
      expect(testContext.use).toBeInstanceOf(Function);
    });

    it("should create a context with schema", () => {
      const testContext = context({
        type: "typed-context",
        schema: z.object({
          userId: z.string(),
          options: z.object({
            debug: z.boolean(),
          }),
        }),
      });

      expect(testContext.type).toBe("typed-context");
      expect(testContext.schema).toBeDefined();
    });

    it("should allow setting actions", () => {
      const testContext = context({
        type: "actionable-context",
      });

      const mockActions = [{ name: "test-action", handler: vi.fn() }] as any;

      const updatedContext = testContext.setActions(mockActions);
      expect(updatedContext.actions).toBe(mockActions);
    });

    it("should allow setting inputs and outputs", () => {
      const testContext = context({
        type: "io-context",
      });

      const inputs = { input1: z.string() };
      const outputs = { output1: z.string() };

      testContext.setInputs(inputs);
      testContext.setOutputs(outputs);

      expect(testContext.inputs).toBe(inputs);
      expect(testContext.outputs).toBe(outputs);
    });

    it("should support composers", () => {
      const testContext = context({
        type: "composable-context",
      });

      const composer1 = vi.fn();
      const composer2 = vi.fn();

      testContext.use(composer1);
      testContext.use(composer2);

      expect(testContext.__composers).toHaveLength(2);
      expect(testContext.__composers).toContain(composer1);
      expect(testContext.__composers).toContain(composer2);
    });
  });

  describe("createWorkingMemory", () => {
    it("should create empty working memory", () => {
      const memory = createWorkingMemory();

      expect(memory).toBeDefined();
      expect(memory.inputs).toEqual([]);
      expect(memory.outputs).toEqual([]);
      expect(memory.thoughts).toEqual([]);
      expect(memory.calls).toEqual([]);
      expect(memory.results).toEqual([]);
      expect(memory.runs).toEqual([]);
      expect(memory.steps).toEqual([]);
      expect(memory.events).toEqual([]);
    });
  });

  describe("pushToWorkingMemory", () => {
    let memory: WorkingMemory;

    beforeEach(() => {
      memory = createWorkingMemory();
    });

    it("should push action calls to calls array", () => {
      const actionCall: AnyRef = {
        ref: "action_call",
        timestamp: Date.now(),
        data: { action: "test", params: {} },
      } as any;

      pushToWorkingMemory(memory, actionCall);
      expect(memory.calls).toHaveLength(1);
      expect(memory.calls[0]).toBe(actionCall);
    });

    it("should push action results to results array", () => {
      const actionResult: AnyRef = {
        ref: "action_result",
        timestamp: Date.now(),
        data: { result: "success" },
      } as any;

      pushToWorkingMemory(memory, actionResult);
      expect(memory.results).toHaveLength(1);
      expect(memory.results[0]).toBe(actionResult);
    });

    it("should push inputs to inputs array", () => {
      const input: AnyRef = {
        ref: "input",
        timestamp: Date.now(),
        data: { message: "user input" },
      } as any;

      pushToWorkingMemory(memory, input);
      expect(memory.inputs).toHaveLength(1);
      expect(memory.inputs[0]).toBe(input);
    });

    it("should push outputs to outputs array", () => {
      const output: AnyRef = {
        ref: "output",
        timestamp: Date.now(),
        data: { response: "assistant output" },
      } as any;

      pushToWorkingMemory(memory, output);
      expect(memory.outputs).toHaveLength(1);
      expect(memory.outputs[0]).toBe(output);
    });

    it("should push thoughts to thoughts array", () => {
      const thought: AnyRef = {
        ref: "thought",
        timestamp: Date.now(),
        data: { thinking: "internal reasoning" },
      } as any;

      pushToWorkingMemory(memory, thought);
      expect(memory.thoughts).toHaveLength(1);
      expect(memory.thoughts[0]).toBe(thought);
    });

    it("should push events to events array", () => {
      const event: AnyRef = {
        ref: "event",
        timestamp: Date.now(),
        data: { event: "state_change" },
      } as any;

      pushToWorkingMemory(memory, event);
      expect(memory.events).toHaveLength(1);
      expect(memory.events[0]).toBe(event);
    });

    it("should push steps to steps array", () => {
      const step: AnyRef = {
        ref: "step",
        timestamp: Date.now(),
        data: { step: "processing" },
      } as any;

      pushToWorkingMemory(memory, step);
      expect(memory.steps).toHaveLength(1);
      expect(memory.steps[0]).toBe(step);
    });

    it("should push runs to runs array", () => {
      const run: AnyRef = {
        ref: "run",
        timestamp: Date.now(),
        data: { run: "execution" },
      } as any;

      pushToWorkingMemory(memory, run);
      expect(memory.runs).toHaveLength(1);
      expect(memory.runs[0]).toBe(run);
    });

    it("should throw error for invalid ref type", () => {
      const invalidRef: AnyRef = {
        ref: "invalid" as any,
        timestamp: Date.now(),
        data: {},
      } as any;

      expect(() => pushToWorkingMemory(memory, invalidRef)).toThrow(
        "invalid ref"
      );
    });

    it("should throw error for null memory", () => {
      const ref: AnyRef = {
        ref: "input",
        timestamp: Date.now(),
        data: {},
      } as any;

      expect(() => pushToWorkingMemory(null as any, ref)).toThrow(
        "workingMemory and ref must not be null or undefined"
      );
    });

    it("should throw error for null ref", () => {
      expect(() => pushToWorkingMemory(memory, null as any)).toThrow(
        "workingMemory and ref must not be null or undefined"
      );
    });
  });

  describe("getWorkingMemoryLogs", () => {
    let memory: WorkingMemory;

    beforeEach(() => {
      memory = createWorkingMemory();

      // Add some test data with different timestamps
      const baseTime = Date.now();

      memory.inputs.push({
        ref: "input",
        timestamp: baseTime + 100,
        data: { message: "input 1" },
      } as any);

      memory.outputs.push({
        ref: "output",
        timestamp: baseTime + 300,
        data: { response: "output 1" },
      } as any);

      memory.calls.push({
        ref: "action_call",
        timestamp: baseTime + 200,
        data: { action: "call 1" },
      } as any);

      memory.thoughts.push({
        ref: "thought",
        timestamp: baseTime + 50,
        data: { thinking: "thought 1" },
      } as any);

      memory.results.push({
        ref: "action_result",
        timestamp: baseTime + 400,
        data: { result: "result 1" },
      } as any);

      memory.events.push({
        ref: "event",
        timestamp: baseTime + 150,
        data: { event: "event 1" },
      } as any);
    });

    it("should retrieve and sort all logs including thoughts", () => {
      const logs = getWorkingMemoryLogs(memory, true);

      expect(logs).toHaveLength(6);

      // Should be sorted by timestamp
      expect(logs[0].ref).toBe("thought"); // baseTime + 50
      expect(logs[1].ref).toBe("input"); // baseTime + 100
      expect(logs[2].ref).toBe("event"); // baseTime + 150
      expect(logs[3].ref).toBe("action_call"); // baseTime + 200
      expect(logs[4].ref).toBe("output"); // baseTime + 300
      expect(logs[5].ref).toBe("action_result"); // baseTime + 400
    });

    it("should retrieve and sort logs excluding thoughts", () => {
      const logs = getWorkingMemoryLogs(memory, false);

      expect(logs).toHaveLength(5);

      // Should not include thoughts
      const refTypes = logs.map((log) => log.ref);
      expect(refTypes).not.toContain("thought");
      expect(refTypes).toContain("input");
      expect(refTypes).toContain("output");
      expect(refTypes).toContain("action_call");
      expect(refTypes).toContain("action_result");
      expect(refTypes).toContain("event");
    });

    it("should handle empty memory arrays", () => {
      const emptyMemory = createWorkingMemory();
      const logs = getWorkingMemoryLogs(emptyMemory);

      expect(logs).toEqual([]);
    });
  });

  describe("getWorkingMemoryAllLogs", () => {
    let memory: WorkingMemory;

    beforeEach(() => {
      memory = createWorkingMemory();

      const baseTime = Date.now();

      memory.steps.push({
        ref: "step",
        timestamp: baseTime + 250,
        data: { step: "step 1" },
      } as any);

      memory.runs.push({
        ref: "run",
        timestamp: baseTime + 350,
        data: { run: "run 1" },
      } as any);
    });

    it("should include steps and runs in addition to regular logs", () => {
      const allLogs = getWorkingMemoryAllLogs(memory);

      const refTypes = allLogs.map((log) => log.ref);
      expect(refTypes).toContain("step");
      expect(refTypes).toContain("run");
    });
  });

  describe("getContextId", () => {
    it("should generate context ID without key", () => {
      const testContext = context({
        type: "simple-context",
      });

      const id = getContextId(testContext, {});
      expect(id).toBe("simple-context");
    });

    it("should generate context ID with key", () => {
      const testContext = context({
        type: "keyed-context",
        key: (args: { userId: string }) => `user-${args.userId}`,
        schema: z.object({ userId: z.string() }),
      });

      const id = getContextId(testContext, { userId: "123" });
      expect(id).toBe("keyed-context:user-123");
    });

    it("should handle complex key generation", () => {
      const testContext = context({
        type: "complex-context",
        key: (args: { tenant: string; project: string }) =>
          `${args.tenant}/${args.project}`,
        schema: z.object({
          tenant: z.string(),
          project: z.string(),
        }),
      });

      const id = getContextId(testContext, {
        tenant: "acme-corp",
        project: "web-app",
      });
      expect(id).toBe("complex-context:acme-corp/web-app");
    });
  });

  describe("formatWorkingMemory", () => {
    it("should format processed logs", () => {
      const memory: Partial<WorkingMemory> = {
        inputs: [
          {
            ref: "input",
            timestamp: Date.now(),
            processed: true,
            data: { message: "test input" },
          } as any,
        ],
        outputs: [
          {
            ref: "output",
            timestamp: Date.now() + 100,
            processed: false,
            data: { response: "test output" },
          } as any,
        ],
      };

      const processedLogs = formatWorkingMemory({
        memory,
        processed: true,
      });

      expect(processedLogs).toBeDefined();
      expect(Array.isArray(processedLogs)).toBe(true);
    });

    it("should limit logs by size", () => {
      const memory: Partial<WorkingMemory> = {
        inputs: Array.from({ length: 10 }, (_, i) => ({
          ref: "input",
          timestamp: Date.now() + i,
          processed: true,
          data: { message: `input ${i}` },
        })) as any,
      };

      const limitedLogs = formatWorkingMemory({
        memory,
        processed: true,
        size: 5,
      });

      expect(limitedLogs.length).toBeLessThanOrEqual(5);
    });
  });

  describe("Context Integration", () => {
    it("should support complex context workflows", () => {
      // Create a context for a chat session
      const chatContext = context({
        type: "chat-session",
        key: (args: { sessionId: string }) => args.sessionId,
        schema: z.object({
          sessionId: z.string(),
          userId: z.string(),
          preferences: z.object({
            language: z.string(),
            theme: z.string(),
          }),
        }),
      });

      // Test context creation and ID generation
      const args = {
        sessionId: "session-123",
        userId: "user-456",
        preferences: {
          language: "en",
          theme: "dark",
        },
      };

      const contextId = getContextId(chatContext, args);
      expect(contextId).toBe("chat-session:session-123");

      // Test working memory management
      const memory = createWorkingMemory();

      const userMessage: AnyRef = {
        ref: "input",
        timestamp: Date.now(),
        data: { role: "user", content: "Hello!" },
      } as any;

      const assistantMessage: AnyRef = {
        ref: "output",
        timestamp: Date.now() + 100,
        data: { role: "assistant", content: "Hi there!" },
      } as any;

      pushToWorkingMemory(memory, userMessage);
      pushToWorkingMemory(memory, assistantMessage);

      const conversationLogs = getWorkingMemoryLogs(memory);
      expect(conversationLogs).toHaveLength(2);
      expect(conversationLogs[0].ref).toBe("input");
      expect(conversationLogs[1].ref).toBe("output");
    });
  });
});
