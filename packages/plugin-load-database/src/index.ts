// This plugin is for loading and saving data to the database written by Kai
// Claude, please help me develop this plugin as an exercise for me
// I want to learn the function of Evaluators, Providers, and Actions
// Please help me to develop this plugin step by step.
// we'll complete a basic save-memory action and have it prompt  the user for what memories to save.

import { Plugin, AgentRuntime, knowledge, stringToUuid, settings, Action, elizaLogger, MemoryManager, EvaluationExample } from "@ai16z/eliza";
import type { KnowledgeItem } from "@ai16z/eliza";

import {
    Evaluator,
    IAgentRuntime,
    Memory,
    State,
    Provider,
    HandlerCallback
} from "@ai16z/eliza";

// Get user ID from environment variables
const USER_ID = settings.USER_ID || process.env.USER_ID;
if (!USER_ID) {
    throw new Error("USER_ID must be set in environment variables");
}

const saveMemoryAction: Action = {
    name: "SAVE_MEMORY",
    similes: [
        "REMEMBER_THIS",
        "STORE_THIS",
        "MEMORIZE_THIS",
        "SAVE_THIS",
        "KEEP_THIS"
    ],
    description: "Stores important information in the agent's long-term knowledge base",

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return !!message.content?.text && message.content.text.length > 0;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        try {
            // Get recent messages
            const recentMessages = await runtime.messageManager.getMemories({
                roomId: message.roomId,
                count: 5,  // Look at last 5 messages
                unique: false
            });

            // Extract only the text content from the memories
            const messageTexts = recentMessages.map(memory => memory.content.text);

            elizaLogger.info("saveMemoryAction: Recent messages:", messageTexts);

            // Get the previous message (excluding commands and responses to commands)
            const previousMessage = recentMessages
                .filter(msg => {
                    const content = msg.content;
                    // Look for bot's responses (ATLAS)
                    return content.user === "ATLAS" &&
                           // Must be a reply to something
                           content.inReplyTo &&
                           // Exclude save confirmations
                           !content.text.toLowerCase().includes("i've stored") &&
                           !content.text.toLowerCase().includes("in my knowledge base");
                })
                // Sort by timestamp to get the most recent first
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];

            elizaLogger.info("saveMemoryAction: Previous message:", previousMessage?.content.text);

            if (!previousMessage) {
                await callback({
                    text: "I couldn't find any recent messages to save.",
                    action: "SAVE_MEMORY"
                });
                return;
            }

            // Create a knowledge item from the previous message
            const documentId = stringToUuid(previousMessage.content.text);
            const knowledgeItem: KnowledgeItem = {
                id: documentId,
                content: {
                    text: previousMessage.content.text,
                    source: "user-input",
                    timestamp: Date.now(),
                }
            };

            // Store using knowledge.set
            await knowledge.set(runtime as AgentRuntime, knowledgeItem);

            // Log success
            elizaLogger.log("Successfully saved knowledge:", {
                id: documentId,
                text: previousMessage.content.text
            });

            // Provide confirmation to user
            await callback({
                text: `I've stored this information in my knowledge base: "${previousMessage.content.text}"`,
                action: "SAVE_MEMORY"
            });

        } catch (error) {
            elizaLogger.error("Failed to store knowledge:", error);
            throw new Error(`Failed to store knowledge: ${error.message}`);
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "The capital of France is Paris"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Remember that"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I've stored this information in my knowledge base: \"The capital of France is Paris\"",
                    action: "SAVE_MEMORY"
                }
            }
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Project deadline has been moved to next Friday"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Store this memory"
                }
            },
            {
                user: "{{user2}}",
                content: {
                    text: "I've stored this information in my knowledge base: \"Project deadline has been moved to next Friday\"",
                    action: "SAVE_MEMORY"
                }
            }
        ]
    ]
};

const simpleEvaluator: Evaluator = {
    name: "LOG_SAVED_KNOWLEDGE",
    similes: ["LOG_KNOWLEDGE"],
    description: "Logs whenever knowledge is saved",

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Only run when something was just saved to knowledge
        return message.content?.action === "SAVE_MEMORY";
    },

    handler: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.info("********  Knowledge was saved: *******", message.content.text);
    },

    examples: [
        {
            context: "After saving some knowledge",
            messages: [
                {
                    user: "{{user2}}",
                    content: {
                        text: "I've stored this information in my knowledge base: \"The sky is blue\"",
                        action: "SAVE_MEMORY"
                    }
                }
            ],
            outcome: "The saving event is logged"
        }
    ]
};

const simpleProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        const memoryManager = new MemoryManager({
            runtime,
            tableName: "documents"  // Where knowledge.set() stores things
        });

        try {
            // Just count how many documents we have
            const memories = await memoryManager.getMemories({
                roomId: message.roomId,
                count: 100
            });

            return `There are ${memories.length} items stored in my knowledge base.`;
        } catch (error) {
            elizaLogger.error("Failed to count stored items:", error);
            return "";
        }
    }
};

export const databaseLoaderPlugin: Plugin = {
    name: "database-loader",
    description: "Plugin for managing and utilizing persistent memory storage",
    actions: [saveMemoryAction],
    evaluators: [simpleEvaluator],
    providers: [simpleProvider]
};