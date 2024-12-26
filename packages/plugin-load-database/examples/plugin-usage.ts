import { AgentRuntime } from "@ai16z/eliza";
import { createDatabaseLoaderPlugin } from "../src/index.js";

// Example database adapter implementation (mock for demonstration)
const mockDatabaseAdapter = {
    async init() {},
    async close() {},
    // ... other required methods
};

async function demonstratePluginUsage() {
    try {
        // Create a new runtime instance with the database loader plugin
        const runtime = new AgentRuntime({
            token: "mock-token",
            modelProvider: "openai", // or your preferred model provider
            databaseAdapter: mockDatabaseAdapter,
            plugins: [createDatabaseLoaderPlugin()]
        });

        // Example 1: Save a single memory
        console.log("Example 1: Saving a single memory");
        const saveResult = await runtime.triggerAction("save-memory", {
            memory: {
                text: "This is an important memory to save",
                source: "example-usage"
            }
        });
        console.log("Save result:", saveResult);

        // Example 2: Load multiple memories
        console.log("\nExample 2: Loading multiple memories");
        const loadResult = await runtime.triggerAction("load-data", {
            data: [
                {
                    text: "First memory item",
                    source: "batch-import"
                },
                {
                    text: "Second memory item",
                    source: "batch-import"
                }
            ]
        });
        console.log("Load result:", loadResult);

    } catch (error) {
        console.error("Error in plugin demonstration:", error);
    }
}

// Run the example if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    demonstratePluginUsage().catch(error => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
}
