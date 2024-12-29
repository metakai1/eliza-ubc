import { AgentRuntime, knowledge, stringToUuid, KnowledgeItem, Memory, IMemoryManager, ModelProviderName, MemoryManager, embed } from "@ai16z/eliza";
import { PostgresDatabaseAdapter } from "@ai16z/adapter-postgres";
import dotenv from "dotenv";
import { PropertyData } from "../types";
import { UnrealAgent2 } from "../services/unreal-agent2";
import { getEmbeddingConfig } from "@ai16z/eliza";

dotenv.config();

// Ensure we're using OpenAI embeddings
process.env.USE_OPENAI_EMBEDDING = 'true';
process.env.USE_OLLAMA_EMBEDDING = 'false';
process.env.EMBEDDING_OPENAI_MODEL = 'text-embedding-3-small';

describe('UnrealAgent2 Infrastructure', () => {
    let runtime: AgentRuntime;
    let db: PostgresDatabaseAdapter;
    let agent: UnrealAgent2;
    const agentId = '1459b245-2171-02f6-b436-c3c2641848e5';

    beforeAll(async () => {
        // Initialize database
        db = new PostgresDatabaseAdapter({
            connectionString: process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5432/test',
            max: 20,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        // Initialize the database
        await db.init();

        // Create runtime with real database adapter
        runtime = {
            agentId: agentId,
            serverUrl: 'http://localhost:3000',
            databaseAdapter: db,
            token: process.env.OPENAI_API_KEY,
            modelProvider: 'openai' as ModelProviderName,
            character: {
                modelProvider: 'openai',
                modelEndpointOverride: process.env.OPENAI_API_ENDPOINT,
            },
            messageManager: {
                getCachedEmbeddings: async () => [],
            },
            memoryManager: new MemoryManager({ tableName: 'memories', runtime }),
            documentsManager: new MemoryManager({ tableName: 'documents', runtime }),
            knowledgeManager: new MemoryManager({ tableName: 'knowledge', runtime }),
            getCachedEmbeddings: async () => {
                return new Float32Array(1536).fill(0);
            },
        };

        // Set the runtime reference for memory managers
        (runtime.memoryManager as MemoryManager).runtime = runtime;
        (runtime.documentsManager as MemoryManager).runtime = runtime;
        (runtime.knowledgeManager as MemoryManager).runtime = runtime;

        // Initialize UnrealAgent2
        agent = new UnrealAgent2(runtime);
        await agent.initialize();
    });

    afterAll(async () => {
        await db.cleanup();
    });

    describe('Runtime Setup', () => {
        it('should initialize with correct embedding model', async () => {
            const config = getEmbeddingConfig();
            expect(config.dimensions).toBe(1536); // OpenAI embedding size
            expect(process.env.EMBEDDING_OPENAI_MODEL).toBe('text-embedding-3-small');
        });

        it('should connect to vector database', async () => {
            const testQuery = await db.query('SELECT NOW()');
            expect(testQuery.rows).toBeDefined();
            expect(testQuery.rows.length).toBe(1);
        });

        it('should handle configuration changes', async () => {
            // Test changing embedding model
            const originalModel = process.env.EMBEDDING_OPENAI_MODEL;
            process.env.EMBEDDING_OPENAI_MODEL = 'text-embedding-3-large';

            // Reinitialize agent
            await agent.initialize();

            // Verify agent adapted to new config
            const newConfig = await agent.getConfig();
            expect(newConfig.embeddingModel).toBe('text-embedding-3-large');

            // Reset for other tests
            process.env.EMBEDDING_OPENAI_MODEL = originalModel;
            await agent.initialize();
        });
    });

    describe('Data Storage', () => {
        let testProperty: PropertyData;

        beforeEach(() => {
            testProperty = {
                id: '1',
                name: 'Oceanfront Tower',
                neighborhood: 'Miami Beach',
                zoningType: 'Mixed-Use',
                plotSize: '0.5 acres',
                buildingSize: '50000 sqft',
                maxFloors: 40,
                minFloors: 1,
                plotArea: 21780,
                maxBuildingHeight: 400,
                minBuildingHeight: 15,
                oceanDistanceMeters: 100,
                bayDistanceMeters: 1000,
                description: 'Luxury oceanfront development opportunity with stunning views',
                market: {
                    isListed: true,
                    currentPrice: 25000000,
                    currency: 'USD',
                    marketplace: 'other',
                    lastUpdated: new Date()
                }
            };
        });

        it('should store property with vector embeddings', async () => {
            const result = await agent.storeProperty(testProperty);
            expect(result.id).toBeDefined();
            expect(result.embedding).toBeDefined();
            expect(result.embedding.length).toBe(getEmbeddingConfig().dimensions);
        });

        it('should maintain property metadata', async () => {
            const stored = await agent.storeProperty(testProperty);
            const retrieved = await agent.getProperty(stored.id);

            expect(retrieved).toBeDefined();
            expect(retrieved.name).toBe(testProperty.name);
            expect(retrieved.market.currentPrice).toBe(testProperty.market.currentPrice);
            expect(retrieved.metadata).toBeDefined();
            expect(retrieved.metadata.createdAt).toBeDefined();
            expect(retrieved.metadata.version).toBe(1);
        });

        it('should handle data versioning', async () => {
            // Store initial version
            const v1 = await agent.storeProperty(testProperty);

            // Update property
            const updatedProperty = {
                ...testProperty,
                market: {
                    ...testProperty.market,
                    currentPrice: 27000000
                }
            };

            const v2 = await agent.storeProperty(updatedProperty);

            // Verify versioning
            expect(v2.metadata.version).toBe(2);
            expect(v2.metadata.previousVersion).toBe(v1.id);

            // Get version history
            const history = await agent.getPropertyHistory(v2.id);
            expect(history.length).toBe(2);
            expect(history[0].id).toBe(v2.id);
            expect(history[1].id).toBe(v1.id);
        });
    });
});
