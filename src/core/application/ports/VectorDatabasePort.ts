export interface VectorDocument {
  id: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface VectorDatabasePort {
  upsert(document: VectorDocument): Promise<void>;
  search(embedding: number[], topK: number, filter?: Record<string, unknown>): Promise<VectorSearchResult[]>;
  delete(id: string): Promise<void>;
}
