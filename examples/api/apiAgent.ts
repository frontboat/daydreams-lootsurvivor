import { z } from "zod";
import {
    createDreams,
    validateEnv,
    LogLevel,
    createMemoryStore,
    createVectorStore,
} from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import { openai } from "@ai-sdk/openai";
import { buildApiExtension } from "./apiExtension";

// Validate environment variables
const env = validateEnv(
    z.object({
        API_SCHEMA_URL: z
            .string()
            .url(),
    })
);

async function main() {
    // Build extension
    const apiDocsExt = await buildApiExtension(env.API_SCHEMA_URL);

    // Create the API Agent
    const agent = createDreams({
        logger: LogLevel.INFO,
        model: openai("gpt-4o"),
        extensions: [cliExtension, apiDocsExt],
        memory: {
            store: createMemoryStore(),
            vector: createVectorStore(),
            vectorModel: openai("gpt-4o"),
        }
    });

    // Start the agent with an initial goal
    agent.start({
        id: "api-agent",
        initialGoal: "Help the user query information using the API.",
        initialTasks: [
            "Learn about available API endpoints from the context",
            "Wait for the user to ask for specific information"
        ],
    });

    // Graceful shutdown
    process.on("SIGINT", () => {
        console.log("Shutting down API Agent...");
        process.exit(0);
    });
}

// Run the agent
main().catch(err => {
    console.error("Error starting agent:", err);
    process.exit(1);
});