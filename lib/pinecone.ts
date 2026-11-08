
import { Pinecone } from "@pinecone-database/pinecone";
import type { DocumentSource } from "./types";

type DocumentInfo = {
  title: string;
  filename: string;
  fileType: string;
};

type SearchFilter = Record<string, any>;

let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    const apiKey = process.env.PINECONE_API_KEY;

    if (!apiKey) {
      throw new Error("PINECONE_API_KEY is missing from .env");
    }

    pineconeClient = new Pinecone({ apiKey });
  }

  return pineconeClient;
}

export function getPineconeIndex() {
  const client = getPineconeClient();
  const indexName =
    process.env.PINECONE_INDEX_NAME || "rag-document";

  return client.index({ name: indexName });
}

/**
 * Store document chunks.
 * Pinecone Integrated Embedding generates embeddings automatically.
 */
export async function storeVectors(
  documentId: string,
  chunks: string[],
  metadata: DocumentInfo
): Promise<number> {
  try {
    if (chunks.length === 0) {
      return 0;
    }

    const index = getPineconeIndex();

    const documents = chunks.map((chunk, chunkIndex) => ({
      _id: `${documentId}-chunk-${chunkIndex}`,
      title: metadata.title,
      chunk_text: chunk,
      documentId,
      chunkIndex,
      filename: metadata.filename,
      fileType: metadata.fileType,
      timestamp: new Date().toISOString(),
    }));

    // Integrated Embedding accepts up to 96 documents per request.
    const batchSize = 96;

    for (let i = 0; i < documents.length; i += batchSize) {
      await index.documents.upsert({
        documents: documents.slice(i, i + batchSize),
      });
    }

    console.log(
      `Stored ${documents.length} document chunks for ${documentId}`
    );

    return documents.length;
  } catch (error) {
    console.error("Error storing documents in Pinecone:", error);
    throw new Error("Failed to store documents in Pinecone");
  }
}

/**
 * Search by question text using Pinecone Integrated Embedding.
 * Pass the user's question, not an embedding array.
 */
export async function searchSimilarVectors(
  queryText: string,
  topK = 4,
  filter?: SearchFilter
): Promise<DocumentSource[]> {
  try {
    if (!queryText.trim()) {
      return [];
    }

    const index = getPineconeIndex();

    const results = await index.documents.search({
      scoreBy: [
        {
          type: "embed",
          field: "chunk_text",
          query: queryText,
        },
      ],
      topK,
      includeFields: [
        "title",
        "chunk_text",
        "documentId",
        "filename",
        "fileType",
        "chunkIndex",
      ],
      ...(filter ? { filter } : {}),
    });

    const sources: DocumentSource[] = [];

    for (const match of results.matches ?? []) {
      const item = match as any;

      if (
        typeof item.chunk_text !== "string" ||
        typeof item.documentId !== "string" ||
        typeof item._score !== "number"
      ) {
        continue;
      }

      sources.push({
        documentId: item.documentId,
        documentTitle:
          typeof item.title === "string"
            ? item.title
            : "Untitled document",
        chunkId: item._id,
        content: item.chunk_text,
        similarity: item._score,
      });
    }

    return sources;
  } catch (error) {
    console.error("Error searching documents in Pinecone:", error);
    throw new Error("Failed to search documents in Pinecone");
  }
}

/**
 * Delete all chunks belonging to a document.
 */
export async function deleteDocumentVectors(
  documentId: string
): Promise<void> {
  try {
    const index = getPineconeIndex();

    await index.documents.delete({
      filter: {
        documentId: { $eq: documentId },
      },
    });

    console.log(`Deleted document chunks for ${documentId}`);
  } catch (error) {
    console.error("Error deleting document chunks:", error);
    throw new Error("Failed to delete document chunks from Pinecone");
  }
}

/**
 * Get Pinecone index statistics.
 */
export async function getIndexStats() {
  try {
    const index = getPineconeIndex();

    return await index.describeIndexStats();
  } catch (error) {
    console.error("Error getting Pinecone index stats:", error);
    return null;
  }
}

/**
 * Check whether the configured index exists.
 */
export async function initializePineconeIndex(): Promise<boolean> {
  try {
    const client = getPineconeClient();
    const indexName =
      process.env.PINECONE_INDEX_NAME || "rag-document";

    const result = await client.listIndexes();

    const indexExists = result.indexes?.some(
      (item) => item.name === indexName
    );

    if (!indexExists) {
      console.error(
        `Pinecone index "${indexName}" does not exist.`
      );

      return false;
    }

    console.log(`Pinecone index "${indexName}" exists.`);

    return true;
  } catch (error) {
    console.error("Error checking Pinecone index:", error);
    return false;
  }
}
