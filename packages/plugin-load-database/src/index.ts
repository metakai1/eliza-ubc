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
        state: SaveMemoryState,
        _options: { [key: string]: unknown },
        callback?: HandlerCallback
    ) => {
        try {
            // Get recent messages
            const recentMessages = await runtime.messageManager.getMemories({
                roomId: message.roomId,
                count: 7,
                unique: false
            });

            // combine the text from recent messages into a string
            const recentMessagesText = recentMessages
                .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0))
                .map(msg => msg.content.text)
                .join("\n\n");

            if (callback) {
                await callback({
                    text: "Summary in progress...",
                    content: {
                        text: "Summary in progress..."
                    }
                }, []);
            }

            //elizaLogger.info("Recent messages:", recentMessagesText);

            const saveKnowledge = await generateText({
                runtime,
                context: `\
The following messages are from a conversation between an ai agent and a user.
The most recent 7 messages are sent to this query, ordered from oldest to newest.  Some messages from
the user may be included.  The last message is the "save this" request from the user, which is then triggers this query. Realize that conversation history may include agent responses \
from previous user queries.  You should determine by the flow of conversation what
information the user is wanting to save.

The user my also append additional words to the "save this" request, which may be relevant in
deciding what information for you to save. For example, he/she could say "save this information about cars".
By those words, you can determine what information the wants to focus on.

Save instructions: Do not store information about the user. Focus on saving knowledge, not conversation
history. Don't save what the conversation is about, but rather the facts and details contained in the
responses by the agent, retaining style and tone. Save the memory as a paragraph of text, not in point
or bullet form. Here are the messages:
${recentMessagesText}`,
                modelClass: "medium"
            });

            //elizaLogger.info("Saved knowledge: from model", saveKnowledge);

            // Save the message content to the knowledge base
            const memoryToSave = {
                id: stringToUuid(`memory_${Date.now()}`),
                content: {
                    text: saveKnowledge,
                    source: "agentdata"
                }
            };

            //elizaLogger.info("Memory to save:", memoryToSave);

            await knowledge.set(runtime as AgentRuntime, memoryToSave);

            if (callback) {
                await callback({
                    text: `I've stored this information: "${saveKnowledge}"`,
                    content: {
                        text: `I've stored this information: "${saveKnowledge}"`
                    }
                }, []);
            }
            return true;

        } catch (error) {
            elizaLogger.error('[Action] handler.error:', error);
            if (callback) {
                await callback({
                    text: "Sorry, I encountered an error while saving.",
                    content: {
                        text: "Sorry, I encountered an error while saving."
                    }
                }, []);
            }
            return false;
        }
    },
    examples: []
};

export const memoryStateProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: SaveMemoryState) => {
        const text = message.content?.text?.toLowerCase() || '';

        // Trigger if message starts with "save this"
        if (text.trim().startsWith('save this')) {
            // Modify state in place first
            if (state) {
                state.shouldSave = true;
                //state.messageToSave = message;
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
    evaluators: [],
    providers: [memoryStateProvider]
};