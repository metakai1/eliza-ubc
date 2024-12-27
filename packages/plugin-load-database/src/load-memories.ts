import { AgentRuntime, knowledge, stringToUuid, KnowledgeItem, elizaLogger } from "@ai16z/eliza";
import fs from 'fs/promises';
import path from 'path';

export interface MemoryEntry {
    text: string;
    category?: string;
    tags?: string[];
}

export interface MemoryMetadata {
    category?: string;
    tags?: string[];
    source: string;
    loadedAt: string;
}

/**
 * Loads memories from a JSON file into the vector store
 * @param runtime AgentRuntime instance
 * @param filePath Path to the JSON file containing memories
 */
export async function loadMemoriesFromFile(runtime: AgentRuntime, filePath: string) {
    try {
        // Read and parse the JSON file
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const data = JSON.parse(fileContent);
        const memories: MemoryEntry[] = data.memories || data;

        elizaLogger.debug(`Loading ${memories.length} memories from ${filePath}`);

        // Process each memory entry
        for (const memory of memories) {
            // Create a knowledge item for the incoming text - using same code as index.ts
            const documentId = stringToUuid(memory.text);
            const knowledgeItem: KnowledgeItem = {
                id: documentId,
                content: {
                    text: memory.text,
                    source: "file-input"
                }
            };

            // Use the high-level knowledge.set function to create document and fragment memories
            await knowledge.set(runtime, knowledgeItem);
        }

        elizaLogger.debug('Successfully loaded all memories');
    } catch (error) {
        elizaLogger.error('Error loading memories:', error);
        throw error;
    }
}
