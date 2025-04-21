# API Agent using Generic Fetch Action

This directory demonstrates a Daydreams agent (`example-api-schema.ts`) that
interacts with APIs dynamically using a single, generic fetch action
(`fetchAction.ts`).

EXAMPLE-API-SCHEMA.ts is an agent that uses the cli, and you tell it "fetch this URL schema and do XYZ".
RENDER-API-SCHEMA.ts is an agent that uses mongodb and stores schemas that can be retrieved via a tool call for prompt injection (ie loading and unloading contexts).

## Overview

> TODO: add in rendering api contexts tool call for injection into state when
> needed.

1. start **mongodb** docker

```bash
docker run --name some-mongo -p 27017:27017 -v mongo-data:/data/db -d mongo
```

2. laziest _temp hackfix_ patch `packages/mongo/src/mongo.ts` paste this (then
   rebuild)
   > it just changed the package id structure but i should just adjust agent to
   > work i think

```ts
import { Collection, MongoClient } from "mongodb";
import type { MemoryStore } from "@daydreamsai/core";

export interface MongoMemoryOptions {
  uri: string;
  dbName?: string;
  collectionName?: string;
}

export class MongoMemoryStore implements MemoryStore {
  private client: MongoClient;
  private collection: Collection | null = null;
  private readonly dbName: string;
  private readonly collectionName: string;

  constructor(options: MongoMemoryOptions) {
    this.client = new MongoClient(options.uri);
    this.dbName = options.dbName || "dreams_memory";
    this.collectionName = options.collectionName || "conversations";
  }

  /**
   * Initialize the MongoDB connection
   */
  async initialize(): Promise<void> {
    await this.client.connect();
    const db = this.client.db(this.dbName);
    this.collection = db.collection(this.collectionName);
  }

  /**
   * Retrieves a value from the store
   * @param key - Key to look up
   * @returns The stored value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    if (!this.collection) throw new Error("MongoDB not initialized");

    const doc = await this.collection.findOne({ key: key });
    if (!doc) return null;

    return doc.value as T;
  }

  /**
   * Stores a value in the store
   * @param key - Key to store under
   * @param value - Value to store
   */
  async set(key: string, value: any): Promise<void> {
    if (!this.collection) throw new Error("MongoDB not initialized");

    await this.collection.updateOne(
      { key: key },
      { $set: { key: key, value: value } },
      { upsert: true }
    );
  }

  /**
   * Removes a specific entry from the store
   * @param key - Key to remove
   */
  async delete(key: string): Promise<void> {
    if (!this.collection) throw new Error("MongoDB not initialized");

    await this.collection.deleteOne({ key: key });
  }

  /**
   * Removes all entries from the store
   */
  async clear(): Promise<void> {
    if (!this.collection) throw new Error("MongoDB not initialized");

    await this.collection.deleteMany({});
  }

  /**
   * Close the MongoDB connection
   */
  async close(): Promise<void> {
    await this.client.close();
  }
}

/**
 * Creates a new MongoDB-backed memory store
 * @param options - MongoDB connection options
 * @returns A MemoryStore implementation using MongoDB for storage
 */
export async function createMongoMemoryStore(
  options: MongoMemoryOptions
): Promise<MemoryStore> {
  const store = new MongoMemoryStore(options);
  await store.initialize();
  return store;
}
```

3. run the agent and tell it to fetch a schema like
   `https://raw.githubusercontent.com/open-meteo/open-meteo/refs/heads/main/openapi.yml`

It should fetch and install (i think) and then the map gets loaded into main
prompt, and inside that it can choose to load whatever openapi schema into the
context in next step.

```bash
bun run examples/api/render-api-schemas.ts
```

This agent uses a single fetch to learn what data is available and how to
interact with it:

- **No Pre-loading:** It does **not** require an API schema URL to be set as an
  environment variable beforehand, loads via an action. Downside is exactly
  that, no control of context - check TODO
- **Generic `fetchAction`:** It utilizes `fetchAction.ts`, a reusable action
  that can make arbitrary HTTP requests based on parameters provided by the
  agent (URL, method, headers, params, body, responseType). It uses
  `@daydreamsai/core`'s built-in `http` utility and handles optional JSON
  parsing and structured success/error responses.
- **Dynamic Workflow:** The agent's initial goal prompts it to first ask the
  user for an OpenAPI schema URL. It then uses the `fetch` action (with
  `responseType: 'text'`) to retrieve the schema content. After analyzing the
  schema text, it waits for user API requests. When a request comes in (e.g.,
  "Get weather in Berlin"), it uses the `fetch` action again, constructing the
  necessary parameters (like URL, query params based on the schema, and setting
  `responseType: 'json'` if appropriate) to call the target API.

- `example-api-schema.ts`: The main script for the agent.
- `fetchAction.ts`: Defines the generic `fetch` action.

**TLDR:**

1.  Add necessary LLM API keys (e.g., `OPENAI_API_KEY`) to your `.env` file in
    the workspace root.
2.  Install deps (run from workspace root):
    ```bash
    bun install
    ```
3.  Run the agent (from workspace root):
    ```bash
    bun run examples/api/example-api-schema.ts
    ```
    Send a message like "using this schema
    https://raw.githubusercontent.com/open-meteo/open-meteo/main/openapi.yml
    tell me what the temperature is in Los Angeles"

---

## Prerequisites & Setup

- [Bun](https://bun.sh/) (used for running the example and managing
  dependencies)
- LLM API Key (e.g., OpenAI, Anthropic) set in a `.env` file in the workspace
  root.

1.  **Navigate to the workspace root directory** (if you aren't already there).

2.  **Install dependencies:**

    Make sure all dependencies for the workspace (including this example) are
    installed. Run from the **workspace root**:

    ```bash
    bun install
    ```

## Configuration

This agent only requires the standard LLM provider API key (e.g.,
`OPENAI_API_KEY` or `ANTHROPIC_API_KEY`) in your root `.env` file.

## Running the Agent

**Important:** Run the agent from the **workspace root directory**. This is
necessary so that it can correctly load the `.env` file from the root.

```bash
bun run examples/api/example-api-schema.ts
```

The agent will start. Right now\* it works by user providing a URL to a schema.
(e.g., the Open-Meteo URL:
`https://raw.githubusercontent.com/open-meteo/open-meteo/main/openapi.yml`).
After fetching and analyzing it, you can ask API-related questions:

```
> Use the schema at https://raw.githubusercontent.com/open-meteo/open-meteo/main/openapi.yml
> Get the weather forecast for Berlin
```

## Troubleshooting

If you're running this example after cloning the daydreams repo, you might need
to build the core packages first.

1. Build core package located at `packages/core`:

```bash
cd packages/core/
bun run build
```

2. Build the cli package located at `packages/cli`:

```bash
cd packages/cli
bun run build
```

Then return to the workspace root to run the agent as described above.
