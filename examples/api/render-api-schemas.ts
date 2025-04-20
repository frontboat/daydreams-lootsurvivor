import { z } from "zod";
import {
    createDreams, LogLevel, createVectorStore, context, action, http
} from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import { groq } from "@ai-sdk/groq";
import { fetchAction } from "./fetchAction";
import * as readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { createMongoMemoryStore, MongoMemoryStore, type MongoMemoryOptions } from "@daydreamsai/mongodb";

// --- Define OpenAPI Context Memory and Actions ---
type OpenApiMemory = {
    apis: Map<string, { schemaKey: string; description?: string; url: string }>;
    loadedSchemas: Map<string, any>; // Runtime cache
};

// Remove the explicit type alias and annotation for openapiContext
// const openapiContext: OpenApiContextType = context<OpenApiMemory>({ ... });
const openapiContext = context<OpenApiMemory>({
    type: "openapiManager",
    schema: z.object({}),
    create(): OpenApiMemory {
        return {
            apis: new Map(),
            loadedSchemas: new Map(),
        };
    },
    async setup(args, settings, agent) {
        // Directly return the initial memory state structure
        // Load persistent data within this setup if needed before returning
        const savedApis = await agent.memory.store.get<[string, any][]>('openapi:known_apis');
        return {
            apis: new Map(savedApis || []),
            loadedSchemas: new Map() // Always start fresh for loaded runtime cache
        };
    },
    // 'save' should return the data to be persisted by the core agent logic if custom logic needed,
    // but here we can rely on the default persistence of state.memory if setup returns the full state.
    // Remove the custom save or ensure it correctly returns the memory part to be saved.
    // async save(state) {
    //     // No need to call agent.memory.store.set here, core logic handles state.memory persistence
    //     // If you needed complex logic to PREPARE data for saving, do it here and return the prepared object.
    // },
    instructions: `Manage and utilize OpenAPI schemas. Available APIs are listed below. Use 'load_api' to access the full details of an installed API before using 'fetch'.`,
    // Adjust render return type to satisfy Context interface (e.g., return JSON string)
    render(state) { // Let state type be inferred
        const renderData = {
            available_apis: Array.from(state.memory.apis.entries()).map(([name, meta]) => ({
                name,
                description: meta.description || 'No description',
                url: meta.url
            })),
            currently_loaded: Array.from(state.memory.loadedSchemas.keys()),
            // Remove rendering full details to keep prompt size down
            // loaded_schema_details: state.memory.loadedSchemas.size > 0
            //    ? Object.fromEntries(state.memory.loadedSchemas.entries())
            //    : undefined
        };
        // Return a JSON string representation
        return JSON.stringify(renderData, null, 2);
    },
}).setActions([
    action({
        name: "install_api",
        description: "Fetches an OpenAPI schema from a URL, stores it persistently, and makes its metadata known.",
        schema: z.object({ url: z.string().url(), name: z.string().optional(), description: z.string().optional() }),
        // Remove explicit ctx type to allow inference
        async handler(args, ctx, agent) {
            const apiName = args.name || args.url.split('/').pop()?.replace(/\.[^/.]+$/, "") || `api-${Date.now()}`;
            const schemaKey = `schema:${apiName}`;

            // 1. Fetch the schema content using http utility
            let schemaContent: string;
            try {
                const response = await http.get.request(args.url); // Use core http
                schemaContent = await response.text();
                if (!response.ok) {
                    throw new Error(`HTTP Error ${response.status}: ${schemaContent}`);
                }
            } catch (error: any) {
                console.error(`Failed to fetch schema from ${args.url}`, error);
                return { success: false, error: `Failed to fetch schema from ${args.url}: ${error.message}` };
            }

            // 2. Store the full schema content persistently
            await agent.memory.store.set(schemaKey, schemaContent);

            // 3. Store metadata in the context's memory (ctx.memory is now correctly typed via inference)
            // Ensure the context's memory is initialized if this is the first modification
            if (!ctx.memory.apis) { ctx.memory.apis = new Map(); }
            ctx.memory.apis.set(apiName, { schemaKey, description: args.description, url: args.url });

            return { success: true, apiName, message: `API '${apiName}' installed.` };
        }
    }),
    action({
        name: "load_api",
        description: "Loads the full details of a previously installed API schema into the current runtime context from persistent storage.",
        schema: z.object({ name: z.string() }),
        // Remove explicit ctx type to allow inference
        async handler(args, ctx, agent) {
            // Check if context memory is initialized
            if (!ctx.memory.apis) {
                return { success: false, error: `API metadata memory not initialized.` };
            }
            if (!ctx.memory.loadedSchemas) { ctx.memory.loadedSchemas = new Map(); }


            if (!ctx.memory.apis.has(args.name)) {
                return { success: false, error: `API '${args.name}' is not installed. Use 'install_api' first.` };
            }
            if (ctx.memory.loadedSchemas.has(args.name)) {
                return { success: true, message: `API '${args.name}' already loaded.` };
            }

            const apiInfo = ctx.memory.apis.get(args.name)!;
            const schemaContent = await agent.memory.store.get<string | object>(apiInfo.schemaKey); // Specify expected type

            if (schemaContent === null || schemaContent === undefined) {
                return { success: false, error: `Failed to retrieve schema content for '${args.name}' from storage (key: ${apiInfo.schemaKey}).` };
            }

            ctx.memory.loadedSchemas.set(args.name, schemaContent);

            return { success: true, message: `API '${args.name}' loaded.` };
        }
    }),
    // Add list_apis action
    action({
        name: "list_apis",
        description: "Lists installed and loaded APIs.",
        schema: undefined, // Correct schema for no arguments
        async handler(ctx, agent) { // Adjusted signature for actions with schema: undefined
            // Ensure memory is initialized before access
            const installed = ctx.memory.apis ? Array.from(ctx.memory.apis.keys()) : [];
            const loaded = ctx.memory.loadedSchemas ? Array.from(ctx.memory.loadedSchemas.keys()) : [];
            return { installed, loaded };
        }
    })
]);

// --- Define a simple default context ---
const defaultContext = context({ // Add required fields
    type: "chat",
    schema: z.object({
        input: z.string()
    }),
    instructions: "You are a helpful assistant. You can also manage API schemas using the openapiManager.",
});


async function main() {
    const mongoOptions: MongoMemoryOptions = {
        uri: process.env.MONGO_URI || "mongodb://localhost:27017",
        dbName: "apiAgentSchemas",
        collectionName: "agentMemory"
    };
    // Ensure Mongo store is created correctly - it returns a Promise
    const persistentStore = await createMongoMemoryStore(mongoOptions);

    const agent = createDreams({
        logger: LogLevel.INFO,
        model: groq("deepseek-r1-distill-llama-70b"),
        extensions: [cliExtension],
        actions: [fetchAction],
        contexts: [openapiContext, defaultContext],
        memory: {
            store: persistentStore,
            vector: createVectorStore(),
        }
    });

    // Agent start should handle initialization now via context.setup
    await agent.start();

    const rl = readline.createInterface({ input, output });
    console.log("API Agent Ready. Install schemas ('install_api url=...') or ask questions. Type 'exit' to quit.");

    while (true) {
        const userInput = await rl.question('> ');
        if (userInput.toLowerCase() === 'exit') break;

        console.log(`[User]: ${userInput}`);
        console.log("--- Invoking Agent ---");

        try {
            await agent.run({
                context: defaultContext,
                args: { input: userInput },
                contexts: [{ context: openapiContext, args: {} }] // Pass context definition
            });
            console.log("--- Agent Run Complete ---");
        } catch (error) { console.error("Error during agent run:", error); }
        console.log("----------------------");
    }

    rl.close();
    await agent.stop();
    // Ensure close method exists before calling
    if (typeof (persistentStore as MongoMemoryStore).close === 'function') {
        await (persistentStore as MongoMemoryStore).close();
    }
    console.log("Agent stopped.");
}

main().catch(err => { console.error("Error in main:", err); process.exit(1); });