import type { MemoryManager, WorkingMemory, AnyRef } from "./types";
import { generateText } from "ai";

/**
 * Built-in memory managers that users can easily adopt
 */

/**
 * Token-based memory limiter that prunes based on estimated token count
 */
export function tokenLimiter(maxTokens: number): MemoryManager {
  return {
    maxSize: Math.floor(maxTokens / 4), // Rough estimation: 4 chars per token TODO: add tiktoken
    strategy: "fifo",
    shouldPrune: async (ctx, workingMemory, newEntry) => {
      const estimatedTokens = estimateTokenCount(workingMemory);
      return estimatedTokens >= maxTokens;
    },
    preserve: {
      recentInputs: 3,
      recentOutputs: 3,
    },
  };
}

/**
 * Smart memory manager with AI-powered compression
 */
export function smartMemoryManager(options: {
  maxSize: number;
  compressionThreshold?: number;
  preserveImportant?: boolean;
}): MemoryManager {
  return {
    maxSize: options.maxSize,
    strategy: "smart",
    compress: async (ctx, entries, agent) => {
      if (!agent.model) {
        return `Compressed ${entries.length} entries (no model available for AI compression)`;
      }

      const conversationEntries = entries
        .filter((entry) => entry.ref === "input" || entry.ref === "output")
        .slice(-10)
        .map((entry) => {
          const type = entry.ref === "input" ? "User" : "Assistant";
          const content =
            "content" in entry ? entry.content : JSON.stringify(entry);
          return `${type}: ${content}`;
        })
        .join("\n");

      if (!conversationEntries) {
        return `Compressed ${entries.length} system entries`;
      }

      try {
        const prompt = `Summarize this conversation segment in 2-3 concise sentences. Focus on key topics, decisions, and important information:

${conversationEntries}

Summary:`;

        const response = await generateText({
          model: agent.model,
          prompt,
          maxTokens: 2000,
          temperature: 0.3,
        });

        return response.text.trim();
      } catch (error) {
        console.warn("AI compression failed:", error);
        return `Compressed ${entries.length} entries (${
          entries.filter((e) => e.ref === "input").length
        } inputs, ${entries.filter((e) => e.ref === "output").length} outputs)`;
      }
    },
    preserve: {
      recentInputs: options.preserveImportant ? 5 : 2,
      recentOutputs: options.preserveImportant ? 5 : 2,
    },
  };
}

/**
 * Context-aware memory manager that preserves task-relevant information
 */
export function contextAwareManager(options: {
  maxSize: number;
  taskKeywords?: string[];
  preserveErrors?: boolean;
}): MemoryManager {
  return {
    maxSize: options.maxSize,
    strategy: "custom",
    shouldPrune: async (ctx, workingMemory, newEntry) => {
      const currentSize =
        workingMemory.inputs.length +
        workingMemory.outputs.length +
        workingMemory.calls.length +
        workingMemory.results.length;
      return currentSize >= options.maxSize;
    },
    onMemoryPressure: async (ctx, workingMemory) => {
      const { taskKeywords = [], preserveErrors = true } = options;

      const preserveEntry = (entry: AnyRef): boolean => {
        if (preserveErrors && "error" in entry && entry.error) {
          return true;
        }

        if (taskKeywords.length > 0) {
          const content =
            "content" in entry ? entry.content : JSON.stringify(entry);
          const hasKeyword = taskKeywords.some((keyword) =>
            content.toLowerCase().includes(keyword.toLowerCase())
          );
          if (hasKeyword) return true;
        }

        return false;
      };

      return {
        ...workingMemory,
        inputs: [
          ...workingMemory.inputs.filter(preserveEntry),
          ...workingMemory.inputs.slice(-Math.max(5, options.maxSize * 0.2)),
        ],
        outputs: [
          ...workingMemory.outputs.filter(preserveEntry),
          ...workingMemory.outputs.slice(-Math.max(5, options.maxSize * 0.2)),
        ],
        thoughts: workingMemory.thoughts.slice(
          -Math.max(3, options.maxSize * 0.1)
        ),
        calls: workingMemory.calls.slice(-Math.max(10, options.maxSize * 0.3)),
        results: workingMemory.results.slice(
          -Math.max(10, options.maxSize * 0.3)
        ),
      };
    },
  };
}

/**
 * Simple FIFO memory manager with preservation rules
 */
export function fifoManager(options: {
  maxSize: number;
  preserveInputs?: number;
  preserveOutputs?: number;
  preserveActions?: string[];
}): MemoryManager {
  return {
    maxSize: options.maxSize,
    strategy: "fifo",
    preserve: {
      recentInputs: options.preserveInputs || 3,
      recentOutputs: options.preserveOutputs || 3,
      actionNames: options.preserveActions || [],
    },
  };
}

/**
 * Utility function to estimate token count for memory entries
 */
function estimateTokenCount(workingMemory: WorkingMemory): number {
  let totalChars = 0;

  // Count characters in all text content
  workingMemory.inputs.forEach((entry) => {
    totalChars += (entry.content?.toString() || "").length;
  });

  workingMemory.outputs.forEach((entry) => {
    totalChars += (entry.content?.toString() || "").length;
  });

  workingMemory.thoughts.forEach((entry) => {
    totalChars += entry.content.length;
  });

  workingMemory.calls.forEach((entry) => {
    totalChars += entry.content.length;
  });

  workingMemory.results.forEach((entry) => {
    totalChars += JSON.stringify(entry.data || "").length;
  });

  // Rough estimation: 4 characters per token on average
  return Math.ceil(totalChars / 4);
}

/**
 * Memory manager that combines multiple strategies
 */
export function hybridManager(strategies: {
  primary: MemoryManager;
  fallback?: MemoryManager;
  useTokenLimit?: number;
}): MemoryManager {
  return {
    maxSize: strategies.primary.maxSize,
    strategy: "custom",
    shouldPrune: async (ctx, workingMemory, newEntry, agent) => {
      // Check token limit first if specified
      if (strategies.useTokenLimit) {
        const tokenCount = estimateTokenCount(workingMemory);
        if (tokenCount >= strategies.useTokenLimit) {
          return true;
        }
      }

      // Use primary strategy's shouldPrune
      if (strategies.primary.shouldPrune) {
        return await strategies.primary.shouldPrune(
          ctx,
          workingMemory,
          newEntry,
          agent
        );
      }

      // Fallback to size check
      const currentSize =
        workingMemory.inputs.length +
        workingMemory.outputs.length +
        workingMemory.calls.length +
        workingMemory.results.length;
      return currentSize >= (strategies.primary.maxSize || 100);
    },
    onMemoryPressure: async (ctx, workingMemory, agent) => {
      try {
        if (strategies.primary.onMemoryPressure) {
          return await strategies.primary.onMemoryPressure(
            ctx,
            workingMemory,
            agent
          );
        }
      } catch (error) {
        console.warn("Primary memory strategy failed, using fallback:", error);
        if (strategies.fallback?.onMemoryPressure) {
          return await strategies.fallback.onMemoryPressure(
            ctx,
            workingMemory,
            agent
          );
        }
      }

      return workingMemory;
    },
    compress: strategies.primary.compress,
    preserve: strategies.primary.preserve,
  };
}
