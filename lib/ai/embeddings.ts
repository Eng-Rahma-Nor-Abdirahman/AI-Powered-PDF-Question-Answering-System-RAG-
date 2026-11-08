
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

// Gemini embedding model
const embeddingModel = new GoogleGenerativeAIEmbeddings({
  model: "gemini-embedding-001",
  apiKey: process.env.Ab8RN6Id38YnpOfK92Z_kKeyhWHOqwIRWRXgk4mvESC1Nw8BoQ,
});

/**
 * Generate embeddings for multiple text chunks from Unstructured.io
 */
export async function generateEmbeddings(
  chunks: string[]
): Promise<Array<{ content: string; embedding: number[] }>> {
  const embeddings = await embeddingModel.embedDocuments(chunks);

  return chunks.map((chunk, index) => ({
    content: chunk,
    embedding: embeddings[index],
  }));
}

/**
 * Generate a single embedding for search queries
 */
export async function generateEmbedding(
  text: string
): Promise<number[]> {
  const embedding = await embeddingModel.embedQuery(text);

  return embedding;
}
