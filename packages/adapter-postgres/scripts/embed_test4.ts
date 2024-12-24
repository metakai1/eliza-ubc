export {};
import { PostgresDatabaseAdapter } from "../src";
import { embed, ModelProviderName } from "@ai16z/eliza";
import dotenv from "dotenv";
dotenv.config();

console.log('Using OpenAI embeddings explicitly.');
process.env.USE_OPENAI_EMBEDDING = 'true';
process.env.USE_OLLAMA_EMBEDDING = 'false';
process.env.EMBEDDING_OPENAI_MODEL = 'text-embedding-3-small';

async function preloadDatabase() {
   const db = new PostgresDatabaseAdapter({
       connectionString: process.env.POSTGRES_URL,
       max: 20,
       idleTimeoutMillis: 30000,
       connectionTimeoutMillis: 2000,
   });

   // Using Dobby's IDs as seen in working records
   const userId = 'aa0d6f50-b80b-0dfa-811b-1f8750ee6278';
   const agentId = 'aa0d6f50-b80b-0dfa-811b-1f8750ee6278';
   const roomId = 'aa0d6f50-b80b-0dfa-811b-1f8750ee6278';

   const testFacts = [
       {
           text: "The Hyperwhizzing Snazzlebot of 2024 could transform into exactly 17 different shapes, including a perfect dodecahedron, but only during leap years.",
           metadata: {
               subject: 'robots',
               topic: 'transformation',
               source: 'Institute of Improbable Engineering'
           }
       },
       {
           text: "Quantum Butterflies in the Amazon Basin can teleport between dimensions but only when they sneeze exactly three times in a row.",
           metadata: {
               subject: 'butterflies',
               topic: 'quantum_behavior',
               source: 'Journal of Impossible Biology'
           }
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
           const embedding = await embed(runtime, fact.text);
           console.log(`Generated embedding for: ${fact.text.slice(0, 50)}...`);
           console.log(`Embedding length: ${embedding.length}`);
           console.log(`First 5 values: [${embedding.slice(0, 5).join(", ")}]`);

           const vectorLiteral = `[${embedding.join(",")}]`;

           const insertQuery = `
               INSERT INTO memories (
                   type,
                   content,
                   embedding,
                   "userId",
                   "agentId",
                   "roomId",
                   "unique"
               )
               VALUES (
                   'fragments',
                   $1,
                   $2::vector,
                   $3,
                   $4,
                   $5,
                   true
               )
               RETURNING id
           `;

           const result = await db.query(insertQuery, [
               {
                   text: fact.text,
                   ...fact.metadata
               },
               vectorLiteral,
               userId,
               agentId,
               roomId
           ]);

           console.log(`Successfully stored fact with ID: ${result.rows[0].id}`);

           // Verify the stored record
           const verifyQuery = `
               SELECT pg_column_size(embedding) as vector_size
               FROM memories
               WHERE id = $1
           `;
           const verifyResult = await db.query(verifyQuery, [result.rows[0].id]);
           console.log(`Stored vector size: ${verifyResult.rows[0].vector_size} bytes`);
       }

   } catch (error) {
       console.error("Error:", error);
   } finally {
       await db.close();
   }
}

preloadDatabase();