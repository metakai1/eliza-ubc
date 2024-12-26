import { Plugin, AgentRuntime, knowledge, stringToUuid, settings } from "@ai16z/eliza";
import type { KnowledgeItem } from "@ai16z/eliza";

export const createDatabaseLoaderPlugin = (): Plugin => {
    // Get user ID from environment variables
    const USER_ID = settings.USER_ID || process.env.USER_ID;
    if (!USER_ID) {
        throw new Error("USER_ID must be set in environment variables");
    }

    const STORE_AS_UNIQUE = false;

    return {
        name: "database-loader",
        description: "Plugin for loading and saving data to the database",
        actions: [{
            name: "load-data",
            description: "Load data into memories",
            similes: ["loading data", "creating memories", "importing data"],
            examples: [
                [
                    {
                        user: "user",
                        content: {
                            text: "load this data into memories"
                        }
                    }
                ]
            ],
            validate: async (runtime: AgentRuntime, message: any) => {
                return message.data !== undefined;
            },
            handler: async (runtime: AgentRuntime, message: any) => {
                const data = message.data;
                if (!Array.isArray(data)) {
                    return {
                        text: "Error: data must be an array of items to convert to memories"
                    };
                }

                try {
                    // Convert each data item into a KnowledgeItem
                    const items: KnowledgeItem[] = data.map(item => ({
                        id: stringToUuid(item.id || Math.random().toString()),
                        content: {
                            text: item.text || item.content,
                            source: item.source || "data-import",
                            metadata: item
                        }
                    }));

                    // Use the existing knowledge.set function to create memories
                    for (const item of items) {
                        await knowledge.set(runtime, item);
                    }

                    return {
                        text: `Successfully created memories from ${items.length} items`
                    };
                } catch (error) {
                    return {
                        text: `Error creating memories: ${error.message}`
                    };
                }
            }
        }, {
            name: "save-memory",
            description: "Save a memory to the database",
            similes: ["save a memory", "store information", "remember something"],
            examples: [[
                {
                    user: "user",
                    content: {
                        text: "Save this memory: The sky is blue",
                        action: "save-memory",
                    },
                },
            ]],
            handler: async (runtime: AgentRuntime, message: any) => {
                if (!message.content.text) {
                    throw new Error("No text content provided");
                }

                await runtime.messageManager.createMemory(
                    {
                        userId: stringToUuid(USER_ID),
                        agentId: runtime.agentId,
                        roomId: message.roomId,
                        content: {
                            text: message.content.text,
                            source: "save-memory-action",
                        },
                    },
                    STORE_AS_UNIQUE
                );

                return [{
                    userId: USER_ID,
                    agentId: runtime.agentId,
                    roomId: message.roomId,
                    content: {
                        text: "Memory saved successfully",
                        action: "save-memory",
                    },
                }];
            },
            validate: async () => Promise.resolve(true),
        }]
    };
}
