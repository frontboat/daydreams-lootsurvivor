import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  tokenLimiter,
  smartMemoryManager,
  contextAwareManager,
  fifoManager,
  hybridManager,
} from "../memory-managers";
import type { WorkingMemory, AgentContext, Agent } from "../types";

// Mock the AI module before importing
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

// Mock types
const createMockWorkingMemory = (
  overrides: Partial<WorkingMemory> = {}
): WorkingMemory => ({
  inputs: [],
  outputs: [],
  thoughts: [],
  calls: [],
  results: [],
  events: [],
  steps: [],
  runs: [],
  ...overrides,
});

const createMockAgentContext = (
  overrides: Partial<AgentContext> = {}
): AgentContext => ({
  id: "test:context",
  context: {} as any,
  args: {},
  options: {},
  settings: {},
  memory: {},
  workingMemory: createMockWorkingMemory(),
  ...overrides,
});

const createMockAgent = (overrides: Partial<Agent> = {}): Agent =>
  ({
    model: {
      provider: "test",
      modelId: "test-model",
    } as any,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    },
    ...overrides,
  } as any);

describe("Memory Managers", () => {
  describe("tokenLimiter", () => {
    it("should create a memory manager with correct configuration", () => {
      const manager = tokenLimiter(1000);

      expect(manager.maxSize).toBe(250); // 1000 / 4
      expect(manager.strategy).toBe("fifo");
      expect(manager.preserve?.recentInputs).toBe(3);
      expect(manager.preserve?.recentOutputs).toBe(3);
    });

    it("should determine pruning based on token count", async () => {
      const manager = tokenLimiter(50); // Very small limit for testing
      const workingMemory = createMockWorkingMemory({
        inputs: [
          {
            ref: "input",
            id: "1",
            type: "user",
            content:
              "This is a long input message that should exceed token limit when combined with other entries. Let me add more text to ensure we exceed 50 tokens which is roughly 200 characters.",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
        ],
        outputs: [
          {
            ref: "output",
            id: "2",
            type: "assistant",
            content:
              "This is a long output message that adds to the token count. This should definitely push us over the 50 token limit when combined with the input above.",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
        ],
      });

      const context = createMockAgentContext();
      const agent = createMockAgent();
      const shouldPrune = await manager.shouldPrune?.(
        context,
        workingMemory,
        workingMemory.inputs[0],
        agent
      );

      expect(shouldPrune).toBe(true);
    });

    it("should not prune when under token limit", async () => {
      const manager = tokenLimiter(10000); // Large limit
      const workingMemory = createMockWorkingMemory({
        inputs: [
          {
            ref: "input",
            id: "1",
            type: "user",
            content: "Short",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
        ],
      });

      const context = createMockAgentContext();
      const agent = createMockAgent();
      const shouldPrune = await manager.shouldPrune?.(
        context,
        workingMemory,
        workingMemory.inputs[0],
        agent
      );

      expect(shouldPrune).toBe(false);
    });
  });

  describe("smartMemoryManager", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("should create a memory manager with AI compression", () => {
      const manager = smartMemoryManager({ maxSize: 100 });

      expect(manager.maxSize).toBe(100);
      expect(manager.strategy).toBe("smart");
      expect(manager.compress).toBeDefined();
      expect(manager.preserve?.recentInputs).toBe(2);
      expect(manager.preserve?.recentOutputs).toBe(2);
    });

    it("should preserve more entries when preserveImportant is true", () => {
      const manager = smartMemoryManager({
        maxSize: 100,
        preserveImportant: true,
      });

      expect(manager.preserve?.recentInputs).toBe(5);
      expect(manager.preserve?.recentOutputs).toBe(5);
    });

    it("should handle AI compression when model is available", async () => {
      const { generateText } = await import("ai");
      vi.mocked(generateText).mockResolvedValue({
        text: "Summarized conversation about testing",
      } as any);

      const manager = smartMemoryManager({ maxSize: 100 });
      const mockAgent = createMockAgent();
      const mockContext = createMockAgentContext();

      const entries = [
        {
          ref: "input" as const,
          id: "1",
          type: "user",
          content: "Hello",
          data: {},
          timestamp: Date.now(),
          processed: false,
        },
        {
          ref: "output" as const,
          id: "2",
          type: "assistant",
          content: "Hi there",
          data: {},
          timestamp: Date.now(),
          processed: false,
        },
      ];

      const result = await manager.compress?.(mockContext, entries, mockAgent);

      expect(result).toContain("Summarized conversation");
    });

    it("should handle AI compression failure gracefully", async () => {
      const { generateText } = await import("ai");
      vi.mocked(generateText).mockRejectedValue(new Error("API error"));

      const manager = smartMemoryManager({ maxSize: 100 });
      const mockAgent = createMockAgent();
      const mockContext = createMockAgentContext();

      const entries = [
        {
          ref: "input" as const,
          id: "1",
          type: "user",
          content: "Hello",
          data: {},
          timestamp: Date.now(),
          processed: false,
        },
        {
          ref: "output" as const,
          id: "2",
          type: "assistant",
          content: "Hi there",
          data: {},
          timestamp: Date.now(),
          processed: false,
        },
      ];

      const result = await manager.compress?.(mockContext, entries, mockAgent);

      expect(result).toContain("Compressed 2 entries");
      expect(mockAgent.logger.warn).toHaveBeenCalledWith(
        "AI compression failed:",
        expect.stringContaining("API error")
      );
    });

    it("should return fallback message when no model is available", async () => {
      const manager = smartMemoryManager({ maxSize: 100 });
      const mockAgent = createMockAgent({ model: undefined });
      const mockContext = createMockAgentContext();

      const entries = [
        {
          ref: "input" as const,
          id: "1",
          type: "user",
          content: "Hello",
          data: {},
          timestamp: Date.now(),
          processed: false,
        },
      ];

      const result = await manager.compress?.(mockContext, entries, mockAgent);

      expect(result).toBe(
        "Compressed 1 entries (no model available for AI compression)"
      );
    });

    it("should handle empty conversation entries", async () => {
      const manager = smartMemoryManager({ maxSize: 100 });
      const mockAgent = createMockAgent();
      const mockContext = createMockAgentContext();

      const entries = [
        {
          ref: "thought" as const,
          id: "1",
          content: "Internal thought",
          timestamp: Date.now(),
          processed: false,
        },
      ];

      const result = await manager.compress?.(mockContext, entries, mockAgent);

      expect(result).toBe("Compressed 1 system entries");
    });
  });

  describe("contextAwareManager", () => {
    it("should create a context-aware memory manager", () => {
      const manager = contextAwareManager({ maxSize: 50 });

      expect(manager.maxSize).toBe(50);
      expect(manager.strategy).toBe("custom");
      expect(manager.shouldPrune).toBeDefined();
      expect(manager.onMemoryPressure).toBeDefined();
    });

    it("should determine pruning based on total entry count", async () => {
      const manager = contextAwareManager({ maxSize: 5 });
      const workingMemory = createMockWorkingMemory({
        inputs: [
          {
            ref: "input",
            id: "1",
            type: "user",
            content: "Test 1",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
          {
            ref: "input",
            id: "2",
            type: "user",
            content: "Test 2",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
        ],
        outputs: [
          {
            ref: "output",
            id: "3",
            type: "assistant",
            content: "Response 1",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
          {
            ref: "output",
            id: "4",
            type: "assistant",
            content: "Response 2",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
        ],
        calls: [
          {
            ref: "action_call",
            id: "5",
            name: "action",
            content: "call",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
        ],
        results: [
          {
            ref: "action_result",
            id: "6",
            callId: "5",
            name: "action",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
        ],
      });

      const context = createMockAgentContext();
      const agent = createMockAgent();
      const shouldPrune = await manager.shouldPrune?.(
        context,
        workingMemory,
        workingMemory.inputs[0],
        agent
      );

      expect(shouldPrune).toBe(true); // 6 entries > 5 maxSize
    });

    it("should preserve entries with errors when preserveErrors is true", async () => {
      const manager = contextAwareManager({
        maxSize: 10,
        preserveErrors: true,
      });
      const workingMemory = createMockWorkingMemory({
        inputs: [
          {
            ref: "input",
            id: "1",
            type: "user",
            content: "Normal input",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
          {
            ref: "input",
            id: "2",
            type: "user",
            content: "Error input",
            data: {},
            timestamp: Date.now(),
            processed: false,
            error: "Something went wrong",
          } as any,
          {
            ref: "input",
            id: "3",
            type: "user",
            content: "Another normal",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
        ],
        outputs: [
          {
            ref: "output",
            id: "4",
            type: "assistant",
            content: "Normal output",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
          {
            ref: "output",
            id: "5",
            type: "assistant",
            content: "Error output",
            data: {},
            timestamp: Date.now(),
            processed: false,
            error: "API failed",
          },
        ],
      });

      const context = createMockAgentContext();
      const agent = createMockAgent();
      const result = await manager.onMemoryPressure?.(
        context,
        workingMemory,
        agent
      );

      expect(result).toBeDefined();
      expect(result!.inputs).toContain(workingMemory.inputs[1]); // Error input preserved
      expect(result!.outputs).toContain(workingMemory.outputs[1]); // Error output preserved
    });

    it("should preserve entries with task keywords", async () => {
      const manager = contextAwareManager({
        maxSize: 10,
        taskKeywords: ["important", "critical"],
      });
      const workingMemory = createMockWorkingMemory({
        inputs: [
          {
            ref: "input",
            id: "1",
            type: "user",
            content: "Normal message",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
          {
            ref: "input",
            id: "2",
            type: "user",
            content: "This is IMPORTANT information",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
          {
            ref: "input",
            id: "3",
            type: "user",
            content: "Critical system update",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
          {
            ref: "input",
            id: "4",
            type: "user",
            content: "Just another message",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
        ],
      });

      const context = createMockAgentContext();
      const agent = createMockAgent();
      const result = await manager.onMemoryPressure?.(
        context,
        workingMemory,
        agent
      );

      expect(result).toBeDefined();
      expect(result!.inputs).toContain(workingMemory.inputs[1]); // Important keyword
      expect(result!.inputs).toContain(workingMemory.inputs[2]); // Critical keyword
    });

    it("should avoid duplicates in combined arrays", async () => {
      const manager = contextAwareManager({ maxSize: 10 });
      const recentInput = {
        ref: "input" as const,
        id: "recent",
        type: "user",
        content: "Recent input",
        data: {},
        timestamp: Date.now(),
        processed: false,
      };
      const workingMemory = createMockWorkingMemory({
        inputs: [
          {
            ref: "input",
            id: "1",
            type: "user",
            content: "Old input",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
          recentInput, // This should appear in both preserved and recent
        ],
      });

      const context = createMockAgentContext();
      const agent = createMockAgent();
      const result = await manager.onMemoryPressure?.(
        context,
        workingMemory,
        agent
      );

      expect(result).toBeDefined();
      // Should not have duplicates
      const inputIds = result!.inputs.map((input) => input.id);
      const uniqueIds = new Set(inputIds);
      expect(inputIds.length).toBe(uniqueIds.size);
    });

    it("should trim other arrays based on maxSize percentages", async () => {
      const manager = contextAwareManager({ maxSize: 100 });
      const workingMemory = createMockWorkingMemory({
        thoughts: Array(50)
          .fill(null)
          .map((_, i) => ({
            ref: "thought" as const,
            id: `thought-${i}`,
            content: `Thought ${i}`,
            timestamp: Date.now(),
            processed: false,
          })),
        calls: Array(80)
          .fill(null)
          .map((_, i) => ({
            ref: "action_call" as const,
            id: `call-${i}`,
            name: "action",
            content: `Call ${i}`,
            data: {},
            timestamp: Date.now(),
            processed: false,
          })),
        results: Array(90)
          .fill(null)
          .map((_, i) => ({
            ref: "action_result" as const,
            id: `result-${i}`,
            callId: `call-${i}`,
            name: "action",
            data: { result: i },
            timestamp: Date.now(),
            processed: false,
          })),
      });

      const context = createMockAgentContext();
      const agent = createMockAgent();
      const result = await manager.onMemoryPressure?.(
        context,
        workingMemory,
        agent
      );

      expect(result).toBeDefined();
      // Should keep last 10% (10) or minimum 3 thoughts
      expect(result!.thoughts.length).toBe(Math.max(3, 100 * 0.1));
      // Should keep last 30% (30) or minimum 10 calls/results
      expect(result!.calls.length).toBe(Math.max(10, 100 * 0.3));
      expect(result!.results.length).toBe(Math.max(10, 100 * 0.3));
    });
  });

  describe("fifoManager", () => {
    it("should create a FIFO memory manager with default settings", () => {
      const manager = fifoManager({ maxSize: 50 });

      expect(manager.maxSize).toBe(50);
      expect(manager.strategy).toBe("fifo");
      expect(manager.preserve?.recentInputs).toBe(3);
      expect(manager.preserve?.recentOutputs).toBe(3);
      expect(manager.preserve?.actionNames).toEqual([]);
    });

    it("should use custom preservation settings", () => {
      const manager = fifoManager({
        maxSize: 50,
        preserveInputs: 5,
        preserveOutputs: 7,
        preserveActions: ["search", "analyze"],
      });

      expect(manager.preserve?.recentInputs).toBe(5);
      expect(manager.preserve?.recentOutputs).toBe(7);
      expect(manager.preserve?.actionNames).toEqual(["search", "analyze"]);
    });
  });

  describe("hybridManager", () => {
    it("should create a hybrid manager with primary strategy", () => {
      const primaryManager = fifoManager({ maxSize: 100 });
      const manager = hybridManager({ primary: primaryManager });

      expect(manager.maxSize).toBe(100);
      expect(manager.strategy).toBe("custom");
      expect(manager.shouldPrune).toBeDefined();
      expect(manager.onMemoryPressure).toBeDefined();
    });

    it("should check token limit first when specified", async () => {
      const primaryManager = fifoManager({ maxSize: 1000 });
      const manager = hybridManager({
        primary: primaryManager,
        useTokenLimit: 10, // Very small token limit
      });

      const workingMemory = createMockWorkingMemory({
        inputs: [
          {
            ref: "input",
            id: "1",
            type: "user",
            content:
              "This is a very long input that should exceed the token limit",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
        ],
      });

      const context = createMockAgentContext();
      const mockAgent = createMockAgent();
      const shouldPrune = await manager.shouldPrune?.(
        context,
        workingMemory,
        workingMemory.inputs[0],
        mockAgent
      );

      expect(shouldPrune).toBe(true);
    });

    it("should use primary strategy's shouldPrune when no token limit", async () => {
      const primaryManager = {
        maxSize: 5,
        strategy: "custom" as const,
        shouldPrune: vi.fn().mockResolvedValue(true),
      };
      const manager = hybridManager({ primary: primaryManager });

      const workingMemory = createMockWorkingMemory();
      const context = createMockAgentContext();
      const mockAgent = createMockAgent();

      await manager.shouldPrune?.(
        context,
        workingMemory,
        workingMemory.inputs[0],
        mockAgent
      );

      expect(primaryManager.shouldPrune).toHaveBeenCalledWith(
        context,
        workingMemory,
        workingMemory.inputs[0],
        mockAgent
      );
    });

    it("should fallback to size check when no custom shouldPrune", async () => {
      const primaryManager = { maxSize: 2, strategy: "fifo" as const };
      const manager = hybridManager({ primary: primaryManager });

      const workingMemory = createMockWorkingMemory({
        inputs: [
          {
            ref: "input",
            id: "1",
            type: "user",
            content: "Input 1",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
          {
            ref: "input",
            id: "2",
            type: "user",
            content: "Input 2",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
        ],
        outputs: [
          {
            ref: "output",
            id: "3",
            type: "assistant",
            content: "Output 1",
            data: {},
            timestamp: Date.now(),
            processed: false,
          },
        ],
      });

      const context = createMockAgentContext();
      const agent = createMockAgent();
      const shouldPrune = await manager.shouldPrune?.(
        context,
        workingMemory,
        workingMemory.inputs[0],
        agent
      );

      expect(shouldPrune).toBe(true); // 3 entries >= 2 maxSize
    });

    it("should use fallback strategy when primary fails", async () => {
      const primaryManager = {
        maxSize: 100,
        strategy: "custom" as const,
        onMemoryPressure: vi
          .fn()
          .mockRejectedValue(new Error("Primary failed")),
      };
      const fallbackManager = {
        maxSize: 100,
        strategy: "custom" as const,
        onMemoryPressure: vi.fn().mockResolvedValue(createMockWorkingMemory()),
      };
      const manager = hybridManager({
        primary: primaryManager,
        fallback: fallbackManager,
      });

      const workingMemory = createMockWorkingMemory();
      const context = createMockAgentContext();
      const mockAgent = createMockAgent();

      const result = await manager.onMemoryPressure?.(
        context,
        workingMemory,
        mockAgent
      );

      expect(primaryManager.onMemoryPressure).toHaveBeenCalled();
      expect(fallbackManager.onMemoryPressure).toHaveBeenCalled();
      expect(mockAgent.logger.warn).toHaveBeenCalledWith(
        "Primary memory strategy failed, using fallback:",
        "{}" // JSON.stringify(Error) produces empty object
      );
      expect(result).toBeDefined();
    });

    it("should return original memory when all strategies fail", async () => {
      const primaryManager = {
        maxSize: 100,
        strategy: "custom" as const,
        onMemoryPressure: vi
          .fn()
          .mockRejectedValue(new Error("Primary failed")),
      };
      const manager = hybridManager({ primary: primaryManager });

      const workingMemory = createMockWorkingMemory();
      const context = createMockAgentContext();
      const mockAgent = createMockAgent();

      const result = await manager.onMemoryPressure?.(
        context,
        workingMemory,
        mockAgent
      );

      expect(result).toBe(workingMemory);
    });

    it("should inherit compress and preserve from primary strategy", () => {
      const primaryManager = {
        maxSize: 100,
        strategy: "smart" as const,
        compress: vi.fn(),
        preserve: { recentInputs: 5, recentOutputs: 5 },
      };
      const manager = hybridManager({ primary: primaryManager });

      expect(manager.compress).toBe(primaryManager.compress);
      expect(manager.preserve).toBe(primaryManager.preserve);
    });
  });
});
