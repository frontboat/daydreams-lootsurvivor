import { createStorage } from "unstorage";
import { createH3StorageHandler } from "unstorage/server";
import fsLiteDriver from "unstorage/drivers/fs-lite";
import { createApp, toWebHandler } from "h3";

const storage = createStorage({
  driver: fsLiteDriver({ base: "./storage" }),
});

const storageHandler = createH3StorageHandler(storage, {
  authorize(req) {
    console.log({ req });
  },
});

const app = createApp({ debug: true });

app.use(storageHandler);

const handler = toWebHandler(app);

Bun.serve({
  port: 3000,
  fetch: (request, server) => {
    try {
      return handler(request);
    } catch (error) {
      console.error(error);
      return new Response("Failed");
    }
  },
});
