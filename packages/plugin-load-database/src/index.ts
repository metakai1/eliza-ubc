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

// Add debug utility
const safeStringify = (obj: any): string => {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
                return '[Circular]';
            }
            seen.add(value);
        }
        return value;
    }, 2);
};

const getStateSummary = (state: any) => {
    if (!state) return { hasState: false };

    const summary: any = {
        hasState: true,
        stateKeys: Object.keys(state),
    };

    // Safely add known primitive values
    if (typeof state.shouldSave !== 'undefined') {
        summary.shouldSave = state.shouldSave;
    }
    if (typeof state.userId !== 'undefined') {
        summary.userId = state.userId;
    }
    if (typeof state.roomId !== 'undefined') {
        summary.roomId = state.roomId;
    }
    if (typeof state.messageDirection !== 'undefined') {
        summary.messageDirection = state.messageDirection;
    }

    return summary;
};

const logState = (component: string, stage: string, state: any) => {
    try {
        const stateSummary = getStateSummary(state);
        elizaLogger.info(`[${component}] ${stage} - State:`, stateSummary);
    } catch (error) {
        elizaLogger.error(`[${component}] ${stage} - Error logging state:`, error);
    }
};

const logMessage = (component: string, stage: string, message: Memory) => {
    try {
        const messageSummary = {
            text: message.content?.text,
            userId: message.userId,
            roomId: message.roomId,
            messageId: message.id,
            hasContent: !!message.content
        };
        elizaLogger.info(`[${component}] ${stage} - Message:`, messageSummary);
    } catch (error) {
        elizaLogger.error(`[${component}] ${stage} - Error logging message:`, error);
    }
};

interface SaveMemoryState extends State {
    shouldSave?: boolean;
    messageToSave?: Memory;
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
        logMessage('Action', 'validate.start', message);

        // Check if message exists
        if (!message) {
            elizaLogger.info('[Action] validate.fail - No message provided');
            return Promise.resolve(false);
        }

        // Check if content exists
        if (!message.content) {
            elizaLogger.info('[Action] validate.fail - No content in message');
            return Promise.resolve(false);
        }

        // Check if text exists and is non-empty
        const hasValidText = !!message.content.text && message.content.text.length > 0;

        elizaLogger.info('[Action] validate.result:', {
            hasValidText,
            textLength: message.content.text?.length || 0,
            text: message.content.text || ''
        });

        return Promise.resolve(hasValidText);
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: SaveMemoryState,
        options: any,
        callback: HandlerCallback
    ) => {
        try {
            logMessage('Action', 'handler.start', message);
            elizaLogger.info('[Action] handler.state:', {
                hasState: !!state,
                stateKeys: state ? Object.keys(state) : [],
                shouldSave: state?.shouldSave,
                messageToSave: state?.messageToSave ? {
                    id: state.messageToSave.id,
                    text: state.messageToSave.content?.text
                } : null
            });

            // Only proceed if explicitly requested via state
            if (!state?.shouldSave) {
                elizaLogger.info('[Action] handler.abort - Save not requested in state');
                return state; // Important: Return the unchanged state
            }

            // Get recent messages
            const recentMessages = await runtime.messageManager.getMemories({
                roomId: message.roomId,
                count: 5,
                unique: false
            });
            elizaLogger.info('[Action] handler.recentMessages:', {
                count: recentMessages.length,
                messages: recentMessages.map(m => ({
                    id: m.id,
                    text: m.content?.text,
                    user: m.content?.user,
                    createdAt: m.createdAt
                }))
            });

            // Get the previous message (excluding commands and responses to commands)
            const previousMessage = recentMessages
                .filter(msg => {
                    const content = msg.content;
                    // Look for bot's responses (ATLAS)
                    return content.user === "ATLAS" &&
                           content.inReplyTo &&
                           !content.text.toLowerCase().includes("i've stored") &&
                           !content.text.toLowerCase().includes("in my knowledge base");
                })
                .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0];

            if (!previousMessage) {
                elizaLogger.info('[Action] handler.abort - No previous message found');
                await callback({
                    text: "I couldn't find any recent messages to save.",
                });
                return {
                    ...state,
                    shouldSave: false // Reset the save flag
                };
            }

            elizaLogger.info('[Action] handler.saving:', {
                messageId: previousMessage.id,
                messageText: previousMessage.content.text,
                user: previousMessage.content.user,
                createdAt: previousMessage.createdAt
            });

            // Save the message content to the knowledge base
            const memoryToSave = {
                id: stringToUuid(previousMessage.content.text),
                content: {
                    text: previousMessage.content.text
                }
            };
            await knowledge.set(runtime as AgentRuntime, memoryToSave);

            await callback({
                text: `I've stored this information in my knowledge base: "${previousMessage.content.text}"`,
            });

            // Return updated state with save flag reset
            const updatedState = {
                ...state,
                shouldSave: false // Reset the save flag after successful save
            };
            elizaLogger.info('[Action] handler.complete - Updated state:', updatedState);
            return updatedState;

        } catch (error) {
            elizaLogger.error('[Action] handler.error:', error);
            await callback({
                text: "Sorry, I encountered an error while trying to save that information.",
            });
            return {
                ...state,
                shouldSave: false, // Reset save flag on error
                error: error.message
            };
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
        logMessage('Evaluator', 'validate.start', message);
        const text = message.content?.text?.toLowerCase() || '';

        // Check for explicit save commands
        const result = text === 'save_memory' ||
               text.includes('save this') ||
               text.includes('remember this') ||
               message.content?.text?.includes('SAVE_MEMORY');  // Add uppercase variant

        elizaLogger.info('[Evaluator] validate.result:', {
            result,
            matchedText: text
        });
        return Promise.resolve(result);
    },
    handler: async (runtime: IAgentRuntime, message: Memory) => {
        logMessage('Evaluator', 'handler.start', message);
        elizaLogger.info('[Evaluator] handler.complete - Knowledge save evaluated');
    },
    examples: [
        {
            /**
             * When user requests to save knowledge
             *
             * This example shows how the evaluator is triggered when the user explicitly
             * asks to save a memory. The evaluator should detect the save command and
             * flag the message for saving.
             */
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
    get: async (runtime: IAgentRuntime, message: Memory, state?: SaveMemoryState) => {
        logMessage('Provider', 'get.start', message);
        logState('Provider', 'get.initialState', state);

        const text = message.content?.text?.toLowerCase() || '';

        // Check for explicit save commands including uppercase
        if (text === 'save_memory' ||
            text.includes('save this') ||
            text.includes('remember this') ||
            message.content?.text?.includes('SAVE_MEMORY')) {

            // Modify state in place
            if (state) {
                state.shouldSave = true;
                state.messageToSave = message;
                logState('Provider', 'get.modifiedState', state);
                return state;
            }
        }

        logState('Provider', 'get.unchangedState', state);
        return state;
    }
};

const simpleProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: SaveMemoryState) => {
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