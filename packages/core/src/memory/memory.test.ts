import { describe, it, expect, beforeEach } from "vitest";
import { createMemory, createMemoryStore, createVectorStore } from "./base";
import type { MemoryStore, VectorStore } from "../types";

describe("Memory Module", () => {
  describe("createMemoryStore", () => {
    let store: MemoryStore;

    beforeEach(() => {
      store = createMemoryStore();
    });

    it("should create an empty store", async () => {
      const keys = await store.keys();
      expect(keys).toEqual([]);
    });

    it("should store and retrieve values", async () => {
      await store.set("test-key", "test-value");
      const value = await store.get("test-key");
      expect(value).toBe("test-value");
    });

    it("should return null for non-existent keys", async () => {
      const value = await store.get("non-existent");
      expect(value).toBeNull();
    });

    it("should list all keys", async () => {
      await store.set("key1", "value1");
      await store.set("key2", "value2");
      await store.set("key3", "value3");

      const keys = await store.keys();
      expect(keys).toHaveLength(3);
      expect(keys).toContain("key1");
      expect(keys).toContain("key2");
      expect(keys).toContain("key3");
    });

    it("should filter keys by base prefix", async () => {
      await store.set("user:1", "user1");
      await store.set("user:2", "user2");
      await store.set("session:1", "session1");
      await store.set("session:2", "session2");

      const userKeys = await store.keys("user:");
      expect(userKeys).toHaveLength(2);
      expect(userKeys).toContain("user:1");
      expect(userKeys).toContain("user:2");

      const sessionKeys = await store.keys("session:");
      expect(sessionKeys).toHaveLength(2);
      expect(sessionKeys).toContain("session:1");
      expect(sessionKeys).toContain("session:2");
    });

    it("should delete specific keys", async () => {
      await store.set("key1", "value1");
      await store.set("key2", "value2");

      await store.delete("key1");

      expect(await store.get("key1")).toBeNull();
      expect(await store.get("key2")).toBe("value2");

      const keys = await store.keys();
      expect(keys).toHaveLength(1);
      expect(keys).toContain("key2");
    });

    it("should clear all data", async () => {
      await store.set("key1", "value1");
      await store.set("key2", "value2");
      await store.set("key3", "value3");

      await store.clear();

      const keys = await store.keys();
      expect(keys).toHaveLength(0);

      expect(await store.get("key1")).toBeNull();
      expect(await store.get("key2")).toBeNull();
      expect(await store.get("key3")).toBeNull();
    });

    it("should handle complex object values", async () => {
      const complexObject = {
        id: 1,
        name: "Test User",
        metadata: {
          created: new Date().toISOString(),
          tags: ["user", "test"],
        },
        nested: {
          deep: {
            value: "deep-value",
          },
        },
      };

      await store.set("complex", complexObject);
      const retrieved = await store.get("complex");

      expect(retrieved).toEqual(complexObject);
      expect((retrieved as any).metadata.tags).toEqual(["user", "test"]);
      expect((retrieved as any).nested.deep.value).toBe("deep-value");
    });

    it("should handle null and undefined values", async () => {
      await store.set("null-value", null);
      await store.set("undefined-value", undefined);

      expect(await store.get("null-value")).toBeNull();
      // The store implementation returns null for undefined values due to ?? null
      expect(await store.get("undefined-value")).toBeNull();
    });

    it("should overwrite existing values", async () => {
      await store.set("key", "original-value");
      expect(await store.get("key")).toBe("original-value");

      await store.set("key", "updated-value");
      expect(await store.get("key")).toBe("updated-value");
    });
  });

  describe("createVectorStore", () => {
    let vectorStore: VectorStore;

    beforeEach(() => {
      vectorStore = createVectorStore();
    });

    it("should create a no-op vector store", () => {
      expect(vectorStore).toBeDefined();
      expect(vectorStore.upsert).toBeInstanceOf(Function);
      expect(vectorStore.query).toBeInstanceOf(Function);
      expect(vectorStore.createIndex).toBeInstanceOf(Function);
      expect(vectorStore.deleteIndex).toBeInstanceOf(Function);
    });

    it("should handle upsert operations", async () => {
      const data = [
        { id: "1", text: "test document", vector: [0.1, 0.2, 0.3] },
        { id: "2", text: "another document", vector: [0.4, 0.5, 0.6] },
      ];

      // Should not throw and should resolve
      await expect(
        vectorStore.upsert("context-1", data)
      ).resolves.toBeUndefined();
    });

    it("should handle query operations", async () => {
      const results = await vectorStore.query("context-1", "test query");
      expect(results).toEqual([]);
    });

    it("should handle index operations", async () => {
      await expect(
        vectorStore.createIndex("test-index")
      ).resolves.toBeUndefined();
      await expect(
        vectorStore.deleteIndex("test-index")
      ).resolves.toBeUndefined();
    });
  });

  describe("createMemory", () => {
    let memoryStore: MemoryStore;
    let vectorStore: VectorStore;

    beforeEach(() => {
      memoryStore = createMemoryStore();
      vectorStore = createVectorStore();
    });

    it("should create a memory instance", () => {
      const memory = createMemory(memoryStore, vectorStore);

      expect(memory).toBeDefined();
      expect(memory.store).toBe(memoryStore);
      expect(memory.vector).toBe(vectorStore);
      expect(memory.vectorModel).toBeUndefined();
    });

    it("should create a memory instance with vector model", () => {
      const mockVectorModel = {
        // Mock implementation - in real use this would be a LanguageModelV1
        provider: "test",
        modelId: "test-model",
      } as any;

      const memory = createMemory(memoryStore, vectorStore, mockVectorModel);

      expect(memory).toBeDefined();
      expect(memory.store).toBe(memoryStore);
      expect(memory.vector).toBe(vectorStore);
      expect(memory.vectorModel).toBe(mockVectorModel);
    });

    it("should allow memory operations through the store", async () => {
      const memory = createMemory(memoryStore, vectorStore);

      await memory.store.set("conversation:1", {
        messages: ["Hello", "Hi there"],
        context: "greeting",
      });

      const conversation = await memory.store.get("conversation:1");
      expect((conversation as any).messages).toEqual(["Hello", "Hi there"]);
      expect((conversation as any).context).toBe("greeting");
    });

    it("should allow vector operations through the vector store", async () => {
      const memory = createMemory(memoryStore, vectorStore);

      const documents = [
        { id: "doc1", text: "AI is fascinating", embedding: [0.1, 0.2] },
        { id: "doc2", text: "Machine learning rocks", embedding: [0.3, 0.4] },
      ];

      await expect(
        memory.vector.upsert("session-1", documents)
      ).resolves.toBeUndefined();

      const results = await memory.vector.query("session-1", "AI technology");
      expect(results).toEqual([]);
    });
  });

  describe("Memory Integration", () => {
    it("should support conversation memory patterns", async () => {
      const memory = createMemory(createMemoryStore(), createVectorStore());

      // Simulate conversation storage
      await memory.store.set("user:123:conversation", {
        id: "conv-1",
        messages: [
          { role: "user", content: "What's the weather like?" },
          {
            role: "assistant",
            content: "I don't have access to current weather data.",
          },
        ],
        metadata: {
          created: new Date().toISOString(),
          lastUpdated: new Date().toISOString(),
        },
      });

      // Simulate user preferences
      await memory.store.set("user:123:preferences", {
        language: "en",
        timezone: "UTC",
        theme: "dark",
      });

      // Retrieve and verify
      const conversation = await memory.store.get("user:123:conversation");
      const preferences = await memory.store.get("user:123:preferences");

      expect((conversation as any).messages).toHaveLength(2);
      expect((conversation as any).messages[0].role).toBe("user");
      expect((preferences as any).language).toBe("en");
      expect((preferences as any).theme).toBe("dark");

      // Test key filtering
      const userKeys = await memory.store.keys("user:123:");
      expect(userKeys).toHaveLength(2);
      expect(userKeys).toContain("user:123:conversation");
      expect(userKeys).toContain("user:123:preferences");
    });

    it("should support session-based memory", async () => {
      const memory = createMemory(createMemoryStore(), createVectorStore());

      // Store session data
      const sessionId = "session-456";
      await memory.store.set(`${sessionId}:context`, {
        currentTask: "code-review",
        workingDirectory: "/project",
        activeFiles: ["src/index.ts", "src/utils.ts"],
      });

      await memory.store.set(`${sessionId}:history`, {
        commands: ["git status", "npm test", "git diff"],
        results: ["clean", "all tests pass", "no changes"],
      });

      // Retrieve session data
      const context = await memory.store.get(`${sessionId}:context`);
      const history = await memory.store.get(`${sessionId}:history`);

      expect((context as any).currentTask).toBe("code-review");
      expect((context as any).activeFiles).toHaveLength(2);
      expect((history as any).commands).toHaveLength(3);
      expect((history as any).results).toHaveLength(3);

      // Clean up session
      const sessionKeys = await memory.store.keys(`${sessionId}:`);
      for (const key of sessionKeys) {
        await memory.store.delete(key);
      }

      const keysAfterCleanup = await memory.store.keys(`${sessionId}:`);
      expect(keysAfterCleanup).toHaveLength(0);
    });
  });
});
