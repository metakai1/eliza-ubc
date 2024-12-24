export {};
import { PostgresDatabaseAdapter } from "../src";
import { embed, ModelProviderName } from "@ai16z/eliza";
import dotenv from "dotenv";
dotenv.config();

console.log('Using OpenAI embeddings explicitly.');
process.env.USE_OPENAI_EMBEDDING = 'true';
process.env.USE_OLLAMA_EMBEDDING = 'false';
process.env.EMBEDDING_OPENAI_MODEL = 'text-embedding-3-small';
const roomId = 'aa0d6f50-b80b-0dfa-811b-1f8750ee6278';

async function clearMemories() {
   const db = new PostgresDatabaseAdapter({
       connectionString: process.env.POSTGRES_URL,
       max: 20,
       idleTimeoutMillis: 30000,
       connectionTimeoutMillis: 2000,
   });

   try {
    await db.removeAllMemories(roomId,"memories");
    console.log("All memories have been successfully removed.");
  } catch (error) {
    console.error("Error removing memories:", error);
  }
}

clearMemories();
