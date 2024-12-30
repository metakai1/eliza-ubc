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
        if (typeof value === 'bigint') {
            return value.toString();
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
        elizaLogger.info(`[${component}] ${stage} - State:`, JSON.parse(safeStringify(stateSummary)));
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

// State tracking utilities
interface StateTransition {
    component: string;
    stage: string;
    fromState: any;
    toState: any;
    timestamp: number;
}

const stateTransitions: StateTransition[] = [];

const trackStateTransition = (component: string, stage: string, fromState: any, toState: any) => {
    const transition: StateTransition = {
        component,
        stage,
        fromState: getStateSummary(fromState),
        toState: getStateSummary(toState),
        timestamp: Date.now()
    };
    stateTransitions.push(transition);
    elizaLogger.info(`[StateTransition] ${component}.${stage}`, JSON.parse(safeStringify(transition)));
};

// Enhanced state validation
const validateState = (component: string, state: any): boolean => {
    if (!state) {
        elizaLogger.error(`[${component}] State validation failed: No state object`);
        return false;
    }

    // Required keys for all states
    const requiredKeys = ['roomId'];
    const missingKeys = requiredKeys.filter(key => !state.hasOwnProperty(key));

    // Additional validation for save memory states
    if (state.shouldSave) {
        const saveRequiredKeys = ['messageToSave', 'commandContext'];
        const missingSaveKeys = saveRequiredKeys.filter(key => !state.hasOwnProperty(key));
        if (missingSaveKeys.length > 0) {
            elizaLogger.error(`[${component}] Save state validation failed: Missing required save keys`, { missingSaveKeys });
            return false;
        }
    }

    if (missingKeys.length > 0) {
        elizaLogger.error(`[${component}] State validation failed: Missing required keys`, { missingKeys });
        return false;
    }

    return true;
};

// Enhanced command detection
const isSaveMemoryCommand = (message: Memory): boolean => {
    if (!message?.content?.text) return false;

    const text = message.content.text.toLowerCase();
    const explicitCommands = [
        'save_memory',
        'save this',
        'remember this',
        'SAVE_MEMORY'
    ];

    // Check for exact matches
    const isExplicitCommand = explicitCommands.some(cmd =>
        text.includes(cmd.toLowerCase()) ||
        message.content?.text?.includes(cmd)
    );

    // Check for command context
    const hasCommandContext = message.content?.commandContext &&
        typeof message.content.commandContext === 'object' &&
        'command' in message.content.commandContext &&
        message.content.commandContext.command === 'SAVE_MEMORY';

    elizaLogger.info('[CommandDetection] Save memory command check:', {
        text,
        isExplicitCommand,
        hasCommandContext,
        result: isExplicitCommand || hasCommandContext
    });

    return isExplicitCommand || hasCommandContext;
};

const getMessageSummary = (message: Memory) => ({
    text: message.content?.text,
    userId: message.userId,
    roomId: message.roomId,
    messageId: message.id,
    commandContext: message.content?.commandContext,
    hasContent: !!message.content
});

// Runtime context tracking
interface RuntimeContext {
    component: string;
    stage: string;
    runtimeKeys: string[];
    timestamp: number;
}

const runtimeContexts: RuntimeContext[] = [];

const trackRuntime = (component: string, stage: string, runtime: IAgentRuntime) => {
    try {
        const context: RuntimeContext = {
            component,
            stage,
            runtimeKeys: Object.keys(runtime),
            timestamp: Date.now()
        };
        runtimeContexts.push(context);
        elizaLogger.info(`[RuntimeContext] ${component}.${stage}`, context);
    } catch (error) {
        elizaLogger.error(`[RuntimeContext] Error tracking runtime:`, error);
    }
};

export const saveMemoryAction: Action = {
    name: "SAVE_MEMORY",
    similes: [
        "REMEMBER_THIS",
        "SAVE_THIS",
        "REMEMBER",
        "SAVE",
        "STORE_THIS",
        "STORE"
    ],
    description: "Stores important information in the agent's long-term knowledge base",

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        trackRuntime('Action', 'validate.start', runtime);
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
        state: State,
        options: any,
        callback: HandlerCallback
    ) => {
        logMessage("Action", "handler.start", message);
        logState("Action", "handler.initialState", state);

        // Get the latest state from transitions
        const latestState = state.stateTransitions?.length > 0 
            ? state.stateTransitions[state.stateTransitions.length - 1] 
            : state;

        logState("Action", "handler.latestState", latestState);

        if (!latestState.shouldSave) {
            elizaLogger.info("[Action] handler.complete - No save requested");
            return state;
        }

        const messageToSave = latestState.messageToSave || message;
        elizaLogger.info("[Action] handler.save - Saving message:", messageToSave);

        try {
            const savedContent = {
                text: messageToSave.content?.text || "",
                attachments: messageToSave.content?.attachments || [],
                source: messageToSave.content?.source || "unknown",
                url: messageToSave.content?.url || "",
                inReplyTo: messageToSave.content?.inReplyTo || null
            };

            const memoryToSave = {
                id: messageToSave.id,
                content: savedContent,
                userId: messageToSave.userId,
                agentId: runtime.agentId,
                roomId: messageToSave.roomId,
                createdAt: messageToSave.createdAt || Date.now(),
                embedding: messageToSave.embedding
            };

            await runtime.knowledgeManager.createMemory(memoryToSave, true);
            elizaLogger.info("[Action] handler.complete - Memory saved");

            // Return updated state with saved memory
            return {
                ...state,
                lastSavedMemory: memoryToSave,
                stateTransitions: [
                    ...(state.stateTransitions || []),
                    {
                        ...latestState,
                        shouldSave: false,
                        messageToSave: null
                    }
                ]
            };
        } catch (error) {
            elizaLogger.error("[Action] handler.error:", error);
            throw error;
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
        trackRuntime('Evaluator', 'validate.start', runtime);
        logMessage('Evaluator', 'validate.start', message);

        const result = isSaveMemoryCommand(message);

        elizaLogger.info('[Evaluator] validate.result:', {
            result,
            message: getMessageSummary(message)
        });
        return Promise.resolve(result);
    },
    handler: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        trackRuntime('Evaluator', 'handler.start', runtime);
        logMessage('Evaluator', 'handler.start', message);

        // Get the previous message to save
        const recentMessages = await runtime.messageManager.getMemories({
            roomId: message.roomId,
            count: 5,
            unique: false
        });

        const previousMessage = recentMessages.find((memory, index) => {
            const text = (memory.content.text || '').toLowerCase();
            return !text.includes('save_memory') &&
                   !text.includes('save this') &&
                   !text.includes('remember this');
        });

        if (!previousMessage) {
            elizaLogger.info('[Evaluator] handler.abort - No previous message found');
            return;
        }

        // Update state with the message to save
        const newState = {
            ...state,
            shouldSave: true,
            messageToSave: previousMessage
        };

        trackStateTransition('Evaluator', 'handler.complete', state, newState);
        elizaLogger.info('[Evaluator] handler.complete - Knowledge save evaluated');

        return newState;
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
        trackRuntime('Provider', 'get.start', runtime);
        logMessage('Provider', 'get.start', message);
        logState('Provider', 'get.initialState', state);

        const isValid = validateState('Provider', state);
        if (!isValid) {
            elizaLogger.error('[Provider] Invalid state, creating new state');
            state = {
                roomId: message.roomId,
                bio: '',
                lore: '',
                messageDirections: '',
                postDirections: '',
                recentMessages: '',
                recentMessagesData: [],
                actors: '',
                actorsData: [],
                agentId: runtime.agentId,
                agentName: '',
                senderName: '',
                knowledge: '',
                knowledgeData: [],
                recentMessageInteractions: '',
                recentPostInteractions: '',
                recentInteractionsData: [],
                topic: '',
                topics: [],
                characterPostExamples: [],
                characterMessageExamples: [],
                goals: '',
                goalsData: [],
                recentPosts: '',
                attachments: [],
                adjective: '',
                discordClient: null,
                discordMessage: null,
                discordChannel: null,
                discordGuild: null,
                discordMember: null,
                discordReaction: null
            };
        }

        if (isSaveMemoryCommand(message)) {
            const newState = {
                ...(state || {}),
                shouldSave: true,
                messageToSave: message,
                commandContext: {
                    command: 'SAVE_MEMORY',
                    timestamp: Date.now(),
                    originalMessage: message.content?.text,
                    source: 'explicit_command'
                }
            };

            trackStateTransition('Provider', 'get', state, newState);
            logState('Provider', 'get.newState', newState);

            // Deep clone to ensure immutability
            return JSON.parse(safeStringify(newState));
        }

        logState('Provider', 'get.unchangedState', state);
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