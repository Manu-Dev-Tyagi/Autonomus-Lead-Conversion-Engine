import { VectorDatabasePort, VectorDocument, VectorSearchResult } from "@/src/core/application/ports/VectorDatabasePort";
import { IndexFlatL2 } from "faiss-node";

export class FaissVectorDatabaseAdapter implements VectorDatabasePort {
  private index: IndexFlatL2 | null = null;
  private documents: VectorDocument[] = [];
  private readonly dimension: number;

  constructor(dimension: number = 768) {
    this.dimension = dimension;
  }

  async upsert(document: VectorDocument): Promise<void> {
    if (!this.index) {
      this.index = new IndexFlatL2(this.dimension);
    }

    if (document.embedding.length !== this.dimension) {
      throw new Error(`Embedding dimension mismatch. Expected ${this.dimension}, got ${document.embedding.length}`);
    }

    // Check if updating existing
    const existingIndex = this.documents.findIndex(d => d.id === document.id);
    if (existingIndex !== -1) {
      this.documents[existingIndex] = document;
      // Note: faiss-node IndexFlatL2 doesn't easily support single-item updates/removals
      // In a real production scenario, we'd use Pinecone or a more robust FAISS wrapper.
      // For now, we rebuild the index if it's an update.
      this.rebuildIndex();
    } else {
      this.documents.push(document);
      this.index.add(document.embedding);
    }
  }

  async search(embedding: number[], topK: number, filter?: Record<string, unknown>): Promise<VectorSearchResult[]> {
    if (!this.index || this.documents.length === 0) {
      return [];
    }

    const { distances, labels } = this.index.search(embedding, topK);
    
    const results: VectorSearchResult[] = [];
    for (let i = 0; i < labels.length; i++) {
      const label = labels[i];
      if (label === -1) continue;

      const doc = this.documents[label];
      
      // Apply simple filter if provided
      if (filter) {
        let matches = true;
        for (const [key, value] of Object.entries(filter)) {
          if (doc.metadata[key] !== value) {
            matches = false;
            break;
          }
        }
        if (!matches) continue;
      }

      results.push({
        id: doc.id,
        score: 1 / (1 + distances[i]), // Convert L2 distance to a 0-1 similarity score
        metadata: doc.metadata,
      });
    }

    return results;
  }

  async delete(id: string): Promise<void> {
    const initialLength = this.documents.length;
    this.documents = this.documents.filter(d => d.id !== id);
    if (this.documents.length !== initialLength) {
      this.rebuildIndex();
    }
  }

  private rebuildIndex(): void {
    this.index = new IndexFlatL2(this.dimension);
    if (this.documents.length > 0) {
      const embeddings = this.documents.map(d => d.embedding).flat();
      this.index.add(embeddings);
    }
  }
}
