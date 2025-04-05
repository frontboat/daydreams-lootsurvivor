import {
  type MemoryStore,
  context,
  createContainer,
  createDreams,
  createMemory,
  createMemoryStore,
  createVectorStore,
} from "@daydreamsai/core";
import { chat } from "./chat";
import { groq, openai } from "./models";
import { z } from "zod";
import { createStorage, Storage } from "unstorage";
import indexedDbDriver from "unstorage/drivers/indexedb";
import httpDriver from "unstorage/drivers/http";

function createMemoryStoreFromStorage<TStorage extends Storage>(
  storage: TStorage
): MemoryStore {
  return {
    ...storage,
    async delete(key) {
      return storage.remove(key);
    },
  };
}

const agentContext = context({
  type: "agent",
  schema: z.object({}),
  key: () => "agent",
});

const indexDbStorage = createStorage({
  driver: indexedDbDriver({ dbName: "daydreams", base: "agent" }),
});

const remoteDbStorage = createStorage({
  driver: httpDriver({
    base: "/api/storage",
  }),
});

export function createAgent() {
  const container = createContainer();

  return createDreams({
    model: groq("deepseek-r1-distill-llama-70b"),
    container,
    memory: createMemory(
      createMemoryStoreFromStorage(indexDbStorage),
      createVectorStore(),
      openai("gpt-4-turbo")
    ),
    context: agentContext,
    extensions: [chat],
  });
}
