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
            elizaLogger.info("saveMemoryAction: Received message:", message.content.text);
            elizaLogger.info("saveMemoryAction: Current state:", state);

            // Only proceed if explicitly requested via state
            if (!state?.shouldSave) {
                elizaLogger.info("Save operation was not explicitly requested");
                return;
            }

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
                });
                return;
            }

            // Save the message content to the knowledge base
            await knowledge.set(runtime as AgentRuntime, {
                id: stringToUuid(previousMessage.content.text),
                content: {
                    text: previousMessage.content.text
                }
            });

            await callback({
                text: `I've stored this information in my knowledge base: "${previousMessage.content.text}"`,
            });
        } catch (error) {
            elizaLogger.error("Error in saveMemoryAction:", error);
            await callback({
                text: "Sorry, I encountered an error while trying to save that information.",
            });
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

export const saveMemoryEvaluator: Evaluator = {
    name: "save-memory",
    description: "Evaluates whether the user wants to save a memory",
    similes: ["memory saver", "knowledge keeper"],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.info("saveMemoryEvaluator: Validating message:", message.content.text);
        const text = message.content?.text?.toLowerCase() || '';
        return Promise.resolve(text === 'save_memory' ||
               text.includes('save this') ||
               text.includes('remember this'));
    },
    handler: async (runtime: IAgentRuntime, message: Memory) => {
        elizaLogger.info("saveMemoryEvaluator: handler: Knowledge save evaluated: *******", message.content.text);
    },
    examples: [
        {
            context: "When user requests to save knowledge",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "save this conversation"
                    }
                }
            ],
            outcome: "Memory should be saved"
        }
    ]
};

export const memoryStateProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        const text = message.content?.text?.toLowerCase() || '';
        // Log provider information
        elizaLogger.info("memoryStateProvider: get: Received message:", {
            text,
            roomId: message.roomId,
            userId: message.userId,
            direction: state?.messageDirection
        });
        //elizaLogger.info("memoryStateProvider: get: Current state:", state?);

        // Only set shouldSave flag for explicit save commands
        if (text === 'save_memory' ||
            text.includes('save this') ||
            text.includes('remember this')) {
            return {
                ...(state || {}),
                shouldSave: true
            };
        }
        return state;
    }
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
    evaluators: [saveMemoryEvaluator],
    providers: [memoryStateProvider]
};