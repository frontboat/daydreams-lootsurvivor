import { z } from "zod";
import {
    createDreams,
    LogLevel,
    createMemoryStore,
    createVectorStore,
    validateEnv, // Keep validateEnv for potential future use
} from "@daydreamsai/core";
import { cliExtension } from "@daydreamsai/cli";
import { groq } from "@ai-sdk/groq";
import { fetchAction } from "./fetchAction"; // Import the new fetch action

// No API_SCHEMA_URL validation needed here
// const env = validateEnv(...);

async function main() {
    // Create the API Agent
    const agent = createDreams({
        logger: LogLevel.INFO,
        model: groq("deepseek-r1-distill-llama-70b"),
        extensions: [cliExtension], // Only CLI extension for input/output
        actions: [fetchAction], // Add the fetch action here
        memory: {
            store: createMemoryStore(),
            vector: createVectorStore(),
        }
    });

    // Start the agent with updated goal and tasks referencing the fetch action
    agent.start({
        id: "api-fetch-agent",
        initialGoal: "Help the user query information using APIs based on provided OpenAPI schemas.",
        initialTasks: [
            "Ask the user for the URL of an OpenAPI schema.",
            "Once provided, use the 'fetch' action to get the schema content.",
            "Analyze the schema to understand the available endpoints and parameters.",
            "Wait for the user to ask for specific information or API calls based on the schema.",
            "Use the 'fetch' action to execute the requested API calls, constructing the request based on the schema and user input.",
        ],
    });

    // Graceful shutdown
    process.on("SIGINT", () => {
        console.log("Shutting down API Fetch Agent...");
        process.exit(0);
    });
}

// Run the agent
main().catch(err => {
    console.error("Error starting agent:", err);
    process.exit(1);
});
