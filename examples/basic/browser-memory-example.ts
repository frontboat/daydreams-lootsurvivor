/**
 * Example of using the Memory System in a browser environment
 */
import {
  MemorySystem,
  InMemoryKeyValueProvider,
  InMemoryVectorProvider,
  InMemoryGraphProvider,
  type Memory,
} from "@daydreamsai/core";

// Create and initialize the memory system
export async function createBrowserMemory(): Promise<Memory> {
  // Create the memory system with in-memory providers
  const memory = new MemorySystem({
    providers: {
      kv: new InMemoryKeyValueProvider(),
      vector: new InMemoryVectorProvider(),
      graph: new InMemoryGraphProvider(),
    },
  });

  // IMPORTANT: You must initialize the memory system before using it
  // This initializes all providers and sets them to ready state
  await memory.initialize();

  return memory;
}

// Example usage
async function example() {
  try {
    // Create and initialize memory
    const memory = await createBrowserMemory();

    // Now you can use the memory system
    await memory.remember("Hello from the browser!", {
      key: "greeting",
      type: "fact",
    });

    // Recall memories
    const results = await memory.recall("browser greeting");
    console.log("Recalled memories:", results);

    // Working memory example
    memory.working.set("user_name", "Alice");
    const userName = memory.working.get("user_name");
    console.log("User name from working memory:", userName);

    // Don't forget to close when done
    await memory.close();
  } catch (error) {
    console.error("Memory system error:", error);
  }
}

// Run the example
example();
