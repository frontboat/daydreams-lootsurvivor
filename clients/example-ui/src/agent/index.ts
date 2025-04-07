import {
  LogLevel,
  type MemoryStore,
  context,
  createContainer,
  createDreams,
  createMemory,
  createMemoryStore,
  createVectorStore,
  service,
} from "@daydreamsai/core";
import { chat } from "./chat";
import { groq, openai } from "./models";
import { z } from "zod";
import { createStorage, Storage } from "unstorage";
// import localStorageDriver from "unstorage/drivers/localstorage";
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

console.log(typeof window);

const remoteDbStorage = createStorage({
  driver: httpDriver({
    base:
      typeof window !== "undefined" ? "/api/storage" : "http://localhost:3000",
  }),
});

// const localStorage = createStorage({
//   driver: localStorageDriver({}),
// });

// localStorage.getKeys().then(async (keys) => {
//   const chats = keys
//     .filter((key) => key.startsWith("context:chat"))
//     .map((t) => t.slice("context:".length));
//   // const contexts = await localStorage.get<string[]>("contexts");

//   // // await localStorage.set(
//   // //   "contexts",
//   // //   Array.from(new Set([...(contexts ? contexts : []), ...chats]).values())
//   // // );
//   // console.log({ contexts, chats });
// });

// const booter = service({
//   async boot(container) {
//     const keys = await localStorage.getKeys();

//     // for (const key of keys) {
//     //   if (key === "contexts") continue;
//     //   await indexDbStorage.setItem(key, await localStorage.getItem(key));
//     // }

//     const chats = keys
//       .filter((key) => key.startsWith("context:chat"))
//       .map((t) => t.slice("context:".length));

//     const contexts = await indexDbStorage.get<string[]>("contexts");

//     await indexDbStorage.set(
//       "contexts",
//       Array.from(new Set([...(contexts ? contexts : []), ...chats]).values())
//     );
//   },
// });

export function createAgent() {
  const container = createContainer();

  return createDreams({
    logger: LogLevel.DEBUG,
    model: groq("deepseek-r1-distill-llama-70b"),
    container,
    memory: createMemory(
      createMemoryStoreFromStorage(remoteDbStorage),
      createVectorStore(),
      openai("gpt-4-turbo")
    ),
    context: agentContext,
    extensions: [chat],
    services: [],
  });
}
