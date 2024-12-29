

const memoryEvaluator: Evaluator = {
    name: "EVALUATE_MEMORY_IMPORTANCE",
    similes: ["CHECK_MEMORY_IMPORTANCE", "ASSESS_MEMORY"],
    description: "Evaluates the importance of stored knowledge and adds metadata",

    validate: async (runtime: IAgentRuntime, message: Memory) => {
        // Only evaluate messages that were just stored in knowledge
        return message.content?.action === "SAVE_MEMORY";
    },

    handler: async (runtime: IAgentRuntime, message: Memory) => {
        try {
            // Get the stored text from the confirmation message
            const storedText = message.content.text.match(/\"([^\"]*)\"/)?.[1];
            if (!storedText) return;

            // Analyze the content for importance
            const importanceFactors = {
                containsDate: /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/.test(storedText),
                containsTime: /\b\d{1,2}:\d{2}\b/.test(storedText),
                containsName: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/.test(storedText),
                isTask: /\b(?:need|must|should|have to|deadline)\b/i.test(storedText)
            };

            const importanceScore = Object.values(importanceFactors)
                .filter(Boolean)
                .length;

            // Create a knowledge item with importance metadata
            const knowledgeItem: KnowledgeItem = {
                id: stringToUuid(storedText),
                content: {
                    text: storedText,
                    source: "user-input",
                    importance: importanceScore,
                    factors: importanceFactors
                }
            };

            // Update the knowledge item
            await knowledge.set(runtime as AgentRuntime, knowledgeItem);

        } catch (error) {
            elizaLogger.error("Failed to evaluate knowledge importance:", error);
        }
    },

    examples: [
        {
            context: "After storing a meeting in knowledge",
            messages: [
                {
                    user: "{{user1}}",
                    content: {
                        text: "Meeting with John on 12/15/2024 at 2:30pm",
                        source: "user-input"
                    }
                },
                {
                    user: "{{user2}}",
                    content: {
                        text: "I've stored this information in my knowledge base: \"Meeting with John on 12/15/2024 at 2:30pm\"",
                        action: "SAVE_MEMORY"
                    }
                }
            ],
            outcome: "Knowledge item updated with importance metadata"
        } as EvaluationExample
        // ... other examples remain the same
    ]
};
const memoryProvider: Provider = {
    get: async (runtime: IAgentRuntime, message: Memory, state?: State) => {
        const memoryManager = new MemoryManager({
            runtime,
            tableName: "documents"  // Important: Search documents table where knowledge.set() stores items
        });

        try {
            // Create temporary memory just to get embedding
            const embedding = await memoryManager.addEmbeddingToMemory({
                userId: message.userId,
                content: { text: message.content.text },
                roomId: message.roomId,
                agentId: runtime.agentId,
                id: crypto.randomUUID(),
                createdAt: Date.now()
            });

            // Search documents using the embedding
            const relevantKnowledge = await memoryManager.searchMemoriesByEmbedding(
                embedding.embedding!,
                {
                    roomId: message.roomId,
                    match_threshold: 0.8,
                    count: 5
                }
            );

            if (relevantKnowledge.length === 0) {
                return "";
            }

            // Format knowledge items for context
            const formattedKnowledge = relevantKnowledge
                .map(item => {
                    const importance = item.content.importance || 0;
                    const tag = importance > 2 ? "❗" : importance > 1 ? "✦" : "•";
                    return `${tag} ${item.content.text}`;
                })
                .join("\n");

            return `Relevant knowledge:\n${formattedKnowledge}`;
        } catch (error) {
            elizaLogger.error("Failed to retrieve knowledge:", error);
            return "";
        }
    }
};