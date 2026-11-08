// Types for the RAG system

export interface Document {
  id: string;
  title: string;
  filename: string;
  fileType: string;
  fileSize: number;
  uploadedAt: Date;
  processedAt?: Date;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  errorMessage?: string;
  chunkCount?: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  title?: string;
  chunkIndex: number;
  metadata: {
    page?: number;
    section?: string;
    [key: string]: any;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: DocumentSource[];
}

export interface DocumentSource {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  content: string;
  similarity: number;
}

export interface ProcessingStatus {
  documentId: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export interface UploadResponse {
  success: boolean;
  documentId?: string;
  error?: string;
  message: string;
}

export interface SearchResult {
  chunks: DocumentChunk[];
  sources: DocumentSource[];
  query: string;
  totalResults: number;
}