import { AgentRuntime } from "@ai16z/eliza";
import databaseLoaderPlugin from "../src/index.js";

// Mock database adapter implementation
const mockDatabaseAdapter = {
    db: {},
    
    async init(): Promise<void> {
        // No-op for mock
    },

    async close(): Promise<void> {
        // No-op for mock
    },

    async getAccountById(userId: string): Promise<any> {
        return null;
    },

    async createAccount(account: any): Promise<boolean> {
        return true;
    },

    async getMemories(params: { roomId: string; count: number; unique: boolean; tableName: string; agentId: string; start: number; end: number; }): Promise<any[]> {
        return [];
    },

    async getMemoryById(id: string): Promise<any> {
        return null;
    },

    async getMemoriesByRoomIds(params: { tableName: string; agentId: string; roomIds: string[]; }): Promise<any[]> {
        return [];
    },

    async getCachedEmbeddings(params: { query_table_name: string; query_threshold: number; query_input: string; query_field_name: string; query_field_sub_name: string; query_match_count: number; }): Promise<{ embedding: number[]; levenshtein_score: number; }[]> {
        return [];
    },

    async log(params: { body: { [key: string]: unknown }; userId: string; roomId: string; type: string; }): Promise<void> {
        // No-op for mock
    },

    async getActorDetails(params: { roomId: string }): Promise<any[]> {
        return [];
    },

    async searchMemories(params: { tableName: string; agentId: string; roomId: string; embedding: number[]; match_threshold: number; match_count: number; unique: boolean; }): Promise<any[]> {
        return [];
    },

    async updateGoalStatus(params: { goalId: string; status: string; }): Promise<void> {
        // No-op for mock
    },

    async searchMemoriesByEmbedding(embedding: number[], params: { match_threshold?: number; count?: number; roomId?: string; agentId?: string; unique?: boolean; tableName: string; }): Promise<any[]> {
        return [];
    },

    async createMemory(memory: any, tableName: string, unique?: boolean): Promise<void> {
        // No-op for mock
    },

    async removeMemory(memoryId: string, tableName: string): Promise<void> {
        // No-op for mock
    },

    async removeAllMemories(roomId: string, tableName: string): Promise<void> {
        // No-op for mock
    },

    async countMemories(roomId: string, unique?: boolean, tableName?: string): Promise<number> {
        return 0;
    },

    async getGoals(params: { agentId: string; roomId: string; userId?: string | null; onlyInProgress?: boolean; count?: number; }): Promise<any[]> {
        return [];
    },

    async updateGoal(goal: any): Promise<void> {
        // No-op for mock
    },

    async createGoal(goal: any): Promise<void> {
        // No-op for mock
    },

    async removeGoal(goalId: string): Promise<void> {
        // No-op for mock
    },

    async removeAllGoals(roomId: string): Promise<void> {
        // No-op for mock
    },

    async getRoom(roomId: string): Promise<{ id: string; name: string; created_at: string; updated_at: string; }> {
        return {
            id: roomId,
            name: "Mock Room",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
    },

    async createRoom(roomId?: string): Promise<string> {
        return roomId || "mock-room-id";
    },

    async removeRoom(roomId: string): Promise<void> {
        // No-op for mock
    },

    async getRoomsForParticipant(userId: string): Promise<string[]> {
        return [];
    },

    async getRoomsForParticipants(userIds: string[]): Promise<string[]> {
        return [];
    },

    async addParticipant(userId: string, roomId: string): Promise<boolean> {
        return true;
    },

    async removeParticipant(userId: string, roomId: string): Promise<boolean> {
        return true;
    },

    async getParticipantsForAccount(userId: string): Promise<any[]> {
        return [];
    },

    async getParticipantsForRoom(roomId: string): Promise<string[]> {
        return [];
    },

    async getParticipantUserState(roomId: string, userId: string): Promise<"FOLLOWED" | "MUTED" | null> {
        return null;
    },

    async setParticipantUserState(roomId: string, userId: string, state: "FOLLOWED" | "MUTED" | null): Promise<void> {
        // No-op for mock
    },

    async createRelationship(params: { userA: string; userB: string }): Promise<boolean> {
        return true;
    },

    async getRelationship(params: { userA: string; userB: string }): Promise<any> {
        return null;
    },

    async getRelationships(params: { userId: string }): Promise<any[]> {
        return [];
    },

    async saveMemory(memory: any): Promise<void> {
        // No-op for mock
    }
}

async function runExample() {
    try {
        // Create a new runtime instance
        const runtime = new AgentRuntime();

        // Register the database loader plugin
        await runtime.registerPlugin(databaseLoaderPlugin);

        // Example: Use the load-data action
        const result = await runtime.triggerAction("load-data", {
            data: [
                {
                    id: "1",
                    text: "Example data entry 1",
                    source: "example"
                },
                {
                    id: "2",
                    text: "Example data entry 2",
                    source: "example"
                }
            ]
        });

        console.log("Data loading result:", result);
    } catch (error) {
        console.error("Error running example:", error);
    }
}

// Run the example if this file is executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
    runExample().catch(error => {
        console.error("Fatal error:", error);
        process.exit(1);
    });
}
