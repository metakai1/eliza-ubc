import { Plugin, AgentRuntime, knowledge, stringToUuid, settings, Action, elizaLogger } from "@ai16z/eliza";
import type { KnowledgeItem } from "@ai16z/eliza";

// Get user ID from environment variables
const USER_ID = settings.USER_ID || process.env.USER_ID;
if (!USER_ID) {
    throw new Error("USER_ID must be set in environment variables");
}

const saveMemoryAction: Action = {
    name: "save-memory",
    description: "Store information in the agent's memory or load data into the memory system",
    similes: [
        "save a memory",
        "store information",
        "remember something",
        "load data into memories",
        "import data to memories",
        "memorize this",
        "keep track of this",
        "add this to your memory"
    ],
    examples: [[
        {
            user: "user",
            content: {
                text: "Save this memory: The sky is blue",
                action: "save-memory",
            },
        },
    ], [
        {
            user: "user",
            content: {
                text: "load this data into memories: Important project deadline is next Friday",
                action: "save-memory",
            },
        },
    ], [
        {
            user: "user",
            content: {
                text: "memorize that Alice prefers tea over coffee",
                action: "save-memory",
            },
        },
    ]],
    handler: async (runtime: AgentRuntime, message: any) => {
        try {
            const text = message.content.text;
            elizaLogger.debug("Preprocessing text:", {
                input: text,
                length: text?.length,
            });

            // Create a knowledge item for the incoming text
            const documentId = stringToUuid(text);
            const knowledgeItem: KnowledgeItem = {
                id: documentId,
                content: {
                    text,
                    source: "user-input"
                }
            };

            // Use the high-level knowledge.set function to create document and fragment memories
            await knowledge.set(runtime, knowledgeItem);

            return [{
                userId: runtime.agentId,
                agentId: runtime.agentId,
                roomId: message.roomId,
                content: {
                    text: "I've stored that information in my memory",
                    action: "save-memory",
                },
            }];
        } catch (error) {
            elizaLogger.error("Failed to create memory:", error);
            throw new Error("Failed to store memory: " + error.message);
        }
    },
    validate: async () => Promise.resolve(true),
};

export const databaseLoaderPlugin: Plugin = {
    name: "database-loader",
    description: "Plugin for loading and saving data to the database",
    actions: [saveMemoryAction]
};

export { loadMemoriesFromFile } from './load-memories';
