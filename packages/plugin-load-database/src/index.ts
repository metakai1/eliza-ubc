import { Plugin, AgentRuntime, knowledge, stringToUuid, generateText, settings, Action, elizaLogger, MemoryManager, EvaluationExample } from "@ai16z/eliza";
import type { KnowledgeItem } from "@ai16z/eliza";

import {
    Evaluator,
    IAgentRuntime,
    Memory,
    State,
    Provider,
    HandlerCallback
} from "@ai16z/eliza";

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
    description: "Stores important information in the agent's long-term knowledge base",
    similes: [],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return Promise.resolve(!!message?.content?.text);
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: SaveMemoryState
    ) => {
        try {
            // Get recent messages
            const recentMessages = await runtime.messageManager.getMemories({
                roomId: message.roomId,
                count: 3,
                unique: false
            });

            const combinedText = recentMessages
                .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
                .map(msg => msg.content.text)
                .join("\n\n");

            if (!combinedText) {
                return {
                    text: "I couldn't find any recent messages to save.",
                    content: {
                        text: "I couldn't find any recent messages to save."
                    }
                };
            }

            // Save the message content to the knowledge base
            const memoryToSave = {
                id: stringToUuid(`memory_${Date.now()}`),
                content: {
                    text: combinedText
                }
            };
            await knowledge.set(runtime as AgentRuntime, memoryToSave);

            return {
                text: `I've stored this information: "${combinedText}"`,
                content: {
                    text: `I've stored this information: "${combinedText}"`
                }
            };
        } catch (error) {
            elizaLogger.error('[Action] handler.error:', error);
            return {
                text: "Sorry, I encountered an error while saving.",
                content: {
                    text: "Sorry, I encountered an error while saving."
                }
            };
        }
    },
    examples: []
};

export const saveMemoryEvaluator: Evaluator = {
    name: "save-memory",
    description: "Evaluates whether content is valuable enough to save in long-term memory",
    similes: ["memory evaluator", "content assessor"],
    examples: [],
    validate: async (runtime: IAgentRuntime, message: Memory) => {
        return Promise.resolve(!!message?.content?.text);
    },
    handler: async (runtime: IAgentRuntime, message: Memory, state?: SaveMemoryState) => {
        logMessage('Evaluator', 'handler.start', message);
        return state;
    }
};

export const memoryStateProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: SaveMemoryState) => {
        logMessage('Provider', 'get.start', message);

        const text = message.content?.text?.toLowerCase() || '';

        // Only trigger on exact match for "save this"
        if (text.trim() === 'save this') {
            // Modify state in place first
            if (state) {
                state.shouldSave = true;
                state.messageToSave = message;
            }

            // Then trigger the SAVE_MEMORY action
            await runtime.processActions(message, [{
                id: stringToUuid(`save_memory_response_${Date.now()}`),
                userId: message.userId,
                agentId: message.agentId,
                roomId: message.roomId,
                content: {
                    action: 'SAVE_MEMORY',
                    text: 'Saving previous message...'
                }
            }]);
        }

        return state;
    }
};


export const databaseLoaderPlugin: Plugin = {
    name: "database-loader",
    description: "Plugin for managing and utilizing persistent memory storage",
    actions: [saveMemoryAction],
    evaluators: [saveMemoryEvaluator],
    providers: [memoryStateProvider]
};