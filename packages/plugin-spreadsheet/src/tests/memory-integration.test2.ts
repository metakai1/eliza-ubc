import { AgentRuntime, knowledge, stringToUuid, KnowledgeItem, Memory, IMemoryManager, ModelProviderName, MemoryManager, embed } from "@ai16z/eliza";
import { PostgresDatabaseAdapter } from "@ai16z/adapter-postgres";
import dotenv from "dotenv";
import { PropertyData } from "../types";

dotenv.config();

// Ensure we're using OpenAI embeddings
process.env.USE_OPENAI_EMBEDDING = 'true';
process.env.USE_OLLAMA_EMBEDDING = 'false';
process.env.EMBEDDING_OPENAI_MODEL = 'text-embedding-3-small';

console.log('Environment settings:', {
    USE_OPENAI_EMBEDDING: process.env.USE_OPENAI_EMBEDDING,
    EMBEDDING_OPENAI_MODEL: process.env.EMBEDDING_OPENAI_MODEL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'present' : 'missing'
});

describe('Property Memory Integration', () => {
    let runtime: any;
    let db: PostgresDatabaseAdapter;
    const agentId = 'aa0d6f50-b80b-0dfa-811b-1f8750ee6278';

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
    });

    /* afterAll(async () => {
        // Clean up database connections
 //       if (db.pool) {
 //           await db.pool.end();
        }
    }); */

    it('should store and retrieve property data as memories', async () => {
        // Create a test property
        const testProperty: PropertyData = {
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

        // Convert property to text format
        const propertyText = `Property: ${testProperty.name}
Location: ${testProperty.neighborhood}
Type: ${testProperty.zoningType}
Size: ${testProperty.plotSize} (${testProperty.buildingSize})
Floors: ${testProperty.minFloors}-${testProperty.maxFloors}
Height: ${testProperty.minBuildingHeight}-${testProperty.maxBuildingHeight} feet
Distance to Ocean: ${testProperty.oceanDistanceMeters}m
Distance to Bay: ${testProperty.bayDistanceMeters}m
Description: ${testProperty.description}
Price: ${testProperty.market?.currentPrice} ${testProperty.market?.currency}`;

        // Create knowledge item
        const documentId = stringToUuid(propertyText);
        const knowledgeItem: KnowledgeItem = {
            id: documentId,
            content: {
                text: propertyText,
                source: "property-data",
                metadata: {
                    propertyId: testProperty.id,
                    propertyType: "real-estate",
                    createdAt: new Date().toISOString()
                }
            }
        };

        // Store in memory system
        await knowledge.set(runtime, knowledgeItem);

        // Create a query message
        const message: Memory = {
           // id: 'test-query',
            agentId: runtime.agentId,
            userId: runtime.agentId,
            roomId: runtime.agentId,
            content: {
                text: 'Tell me about the Oceanfront Tower property'
            }
        };

        // Retrieve and verify
        const retrievedItems = await knowledge.get(runtime, message);

        expect(retrievedItems).toBeDefined();
        expect(retrievedItems.length).toBeGreaterThan(0);

        const retrievedItem = retrievedItems[0];
        expect(retrievedItem.content.text).toContain('Oceanfront Tower');
        console.log('Retrieved Item:', retrievedItem);
        //expect(retrievedItem.content.metadata?.propertyId).toBe(testProperty.id);
    });

    it('should retrieve property data with different query types', async () => {
        // Test exact property name query
        const nameQuery: Memory = {
            agentId: runtime.agentId,
            userId: runtime.agentId,
            roomId: runtime.agentId,
            content: {
                text: 'Tell me about the Oceanfront Tower in Miami Beach'
            }
        };
        const nameResults = await knowledge.get(runtime, nameQuery);
        console.log('Name Query Results:', nameResults);
        console.log('Name Query Results Length:', nameResults.length);
        console.log('Name Query Results Content:', nameResults[0].content.text);

        expect(nameResults.length).toBeGreaterThan(0);
        expect(nameResults[0].content.text).toContain('Oceanfront Tower');

        // Test location-based query
        const locationQuery: Memory = {
            agentId: runtime.agentId,
            userId: runtime.agentId,
            roomId: runtime.agentId,
            content: {
                text: 'show me oceanfront tower in miami beach'
            }
        };
        const locationResults = await knowledge.get(runtime, locationQuery);

        console.log('Location Query Results:', locationResults);

        expect(locationResults.length).toBeGreaterThan(0);
        expect(locationResults[0].content.text).toContain('Miami Beach');

        // Test property feature query
        const featureQuery: Memory = {
            agentId: runtime.agentId,
            userId: runtime.agentId,
            roomId: runtime.agentId,
            content: {
                text: 'Show me oceanfront tower in miami beach'
            }
        };
        console.log('Feature Query:', featureQuery);
        const featureResults = await knowledge.get(runtime, featureQuery);
        console.log('Feature Query Results:', featureResults);
        expect(featureResults.length).toBeGreaterThan(0);
        expect(featureResults[0].content.text).toContain('oceanfront');
        expect(featureResults[0].content.source).toBeDefined();
    });
});
