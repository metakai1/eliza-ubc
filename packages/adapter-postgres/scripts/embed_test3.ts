export {};
import { PostgresDatabaseAdapter } from "../src";
import { embed, ModelProviderName } from "@ai16z/eliza";
import dotenv from "dotenv";
dotenv.config();

console.log('Using OpenAI embeddings explicitly.');
process.env.USE_OPENAI_EMBEDDING = 'true';
process.env.USE_OLLAMA_EMBEDDING = 'false';
//process.env.EMBEDDING_OPENAI_MODEL = 'text-embedding-ada-002';
process.env.EMBEDDING_OPENAI_MODEL = 'text-embedding-3-small';

// At the start of the script, add logging
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

    const roomId = 'aa0d6f50-b80b-0dfa-811b-1f8750ee6278';  // Dobby's room
    const userId = 'aa0d6f50-b80b-0dfa-811b-1f8750ee6278';  // Dobby
    const agentId = 'aa0d6f50-b80b-0dfa-811b-1f8750ee6278';  // Dobby

//    const roomId = null;
//    const userId = null;


    const testFacts = [
        {
            text: "Blorphins navigate underground caverns using bio-luminescent antennae that emit ultraviolet signals.",
            embeddingText: "Blorphin navigation techniques involving ultraviolet antennae signals.",
        },
        {
            text: "Snarfblats produce harmonic vibrations in the atmosphere to communicate with distant colonies during solar storms.",
            embeddingText: "Snarfblat communication using harmonic atmospheric vibrations.",
        },
        {
            text: "Glimwurms hibernate for 12 years inside crystalline pods that refract light into nutrient-rich wavelengths.",
            embeddingText: "Glimwurm hibernation cycles and nutrient absorption through light refraction.",
        },
        {
            text: "Zorvits construct elaborate nests out of magnetic sand particles, aligning them with Earth's geomagnetic poles.",
            embeddingText: "Zorvit nesting behavior and alignment with Earth's geomagnetic fields.",
        },
        {
            text: "Flibberwocks can regenerate lost appendages by secreting a bioluminescent gel that hardens into functional limbs overnight.",
            embeddingText: "Flibberwock limb regeneration using bioluminescent gel secretion.",
        }
    ];


    try {
        await db.testConnection();
        console.log("Connected to PostgreSQL database!");

        const runtime: any = {
            agentId: agentId,
            serverUrl: 'http://localhost:3000',
            databaseAdapter: db,
            token: process.env.OPENAI_API_KEY,
            modelProvider: 'openai' as ModelProviderName,
            character: {
                modelProvider: 'openai' as ModelProviderName,
                modelEndpointOverride: process.env.OPENAI_API_ENDPOINT
            },
            messageManager: {
                getCachedEmbeddings: async () => []
            }
        };

        for (const fact of testFacts) {
            const embedding = await embed(runtime, fact.embeddingText);

            console.log('Raw embedding:', {
                length: embedding.length,
                sample: embedding.slice(0, 5),
                hasZeros: embedding.every(val => val === 0),
                hasSomeValues: embedding.some(val => val !== 0)
            });
            // Enhanced logging
            console.log(`Generated embedding for: ${fact.embeddingText}`);
            console.log(`Embedding length: ${embedding.length}`);
            console.log(`First 10 embedding values: [${embedding.slice(0, 10).join(", ")}]`);

            const vectorLiteral = `[${embedding.join(",")}]`;

            const insertQuery = `
                INSERT INTO memories (type, content, embedding, "userId", "agentId", "roomId", "unique")
                VALUES ($1, $2, $3::vector, $4, $5, $6, $7)
                RETURNING id
            `;

            const result = await db.query(insertQuery, [
                'fragments',
                { text: fact.text },
                vectorLiteral,
                userId,
                agentId,
                roomId,
                true
            ]);

            console.log(`Stored fact with ID: ${result.rows[0].id}`);
        }

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await db.close();
    }
}

preloadDatabase();

