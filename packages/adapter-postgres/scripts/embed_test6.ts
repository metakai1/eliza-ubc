import { PostgresDatabaseAdapter } from "../src";
import { embed, ModelProviderName } from "@ai16z/eliza";
import dotenv from "dotenv";
dotenv.config();

console.log('Using OpenAI embeddings explicitly.');
process.env.USE_OPENAI_EMBEDDING = 'true';
process.env.USE_OLLAMA_EMBEDDING = 'false';
process.env.EMBEDDING_OPENAI_MODEL = 'text-embedding-3-small';

console.log('Environment settings:', {
    USE_OPENAI_EMBEDDING: process.env.USE_OPENAI_EMBEDDING,
    EMBEDDING_OPENAI_MODEL: process.env.EMBEDDING_OPENAI_MODEL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'present' : 'missing'
});

async function preloadDatabase() {
    const db = new PostgresDatabaseAdapter({
        connectionString: process.env.POSTGRES_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });

    const roomId = 'aa0d6f50-b80b-0dfa-811b-1f8750ee6278';
    const userId = 'aa0d6f50-b80b-0dfa-811b-1f8750ee6278';
    const agentId = 'aa0d6f50-b80b-0dfa-811b-1f8750ee6278';

    const testFacts = [
        {
            text: "Blorphins navigate underground caverns using bio-luminescent antennae that emit ultraviolet signals.",
            embeddingText: "Blorphin navigation techniques involving ultraviolet antennae signals.",
        },
        {
            text: "Snarfblats produce harmonic vibrations in the atmosphere to communicate with distant colonies during solar storms.",
            embeddingText: "Snarfblat communication using harmonic atmospheric vibrations.",
        }
    ];

    try {
        await db.testConnection();
        console.log("Connected to PostgreSQL database!");

        // Create a DOCUMENT record first
        const documentContent = {
            text: "This document describes fictional alien species and their behaviors. " +
                "Blorphins navigate underground caverns using bio-luminescent antennae that emit ultraviolet signals. " +
                "Snarfblats produce harmonic vibrations in the atmosphere to communicate with distant colonies during solar storms. " +
                "Glimwurms hibernate for 12 years inside crystalline pods that refract light into nutrient-rich wavelengths. " +
                "Zorvits construct elaborate nests out of magnetic sand particles, aligning them with Earth's geomagnetic poles. " +
                "Flibberwocks can regenerate lost appendages by secreting a bioluminescent gel that hardens into functional limbs overnight. " +
                "Skyfishers glide through the upper atmosphere, using lightning strikes to energize their solar membranes and extend their flight. " +
                "These creatures exhibit extraordinary behaviors and adaptations that may redefine biological engineering. ".repeat(50), // Repeat the string 500 times
        };


        const docInsertQuery = `
            INSERT INTO memories (type, content, embedding, "userId", "agentId", "roomId", "unique")
            VALUES ($1, $2, $3::vector, $4, $5, $6, $7)
            RETURNING id
        `;

        const docResult = await db.query(docInsertQuery, [
            'documents',
            documentContent,
            `[${Array(1536).fill(0).join(",")}]`,
            userId,
            agentId,
            roomId,
            false,
        ]);

        const documentId = docResult.rows[0].id;
        console.log(`Created document with ID: ${documentId}`);

        const runtime: any = {
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
        };

        for (const fact of testFacts) {
            const embedding = await embed(runtime, fact.embeddingText);

            const vectorLiteral = `[${embedding.join(",")}]`;

            const fragmentInsertQuery = `
                INSERT INTO memories (type, content, embedding, "userId", "agentId", "roomId", "unique")
                VALUES ($1, $2, $3::vector, $4, $5, $6, $7)
                RETURNING id
            `;

            const result = await db.query(fragmentInsertQuery, [
                'fragments',
                { text: fact.embeddingText, source: documentId }, // Use 'source' instead of 'reference'
                vectorLiteral,
                userId,
                agentId,
                roomId,
                true,
            ]);

            console.log(`Stored fragment with ID: ${result.rows[0].id}`);
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await db.close();
    }
}

preloadDatabase();
