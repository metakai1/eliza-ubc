import { AgentRuntime, PostgresDatabaseAdapter } from "@ai16z/eliza";
import { createDatabaseLoaderPlugin } from "../src/index";

async function main() {
    // Initialize database adapter
    const db = new PostgresDatabaseAdapter({
        connectionString: process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/eliza"
    });

    // Create runtime with plugin
    const runtime = new AgentRuntime({
        databaseAdapter: db,
        modelProvider: "OPENAI",
        token: process.env.OPENAI_API_KEY || "",
        plugins: [createDatabaseLoaderPlugin()]
    });

    // Save a test memory
    await runtime.triggerAction("save-memory", {
        userId: "1459b245-2171-02f6-b436-c3c2641848e5",
        agentId: runtime.agentId,
        roomId: runtime.agentId,
        content: {
            text: "Test memory from runtime example",
            action: "save-memory"
        }
    });

    console.log("Memory saved successfully!");
    process.exit(0);
}

main().catch(console.error);
