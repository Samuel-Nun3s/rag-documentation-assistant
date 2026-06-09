import { Injectable } from '@nestjs/common';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectorStoreService, VectorSearchResult } from '../embeddings/vector-store.service';

@Injectable()
export class RetrievalService {
  constructor(
    private embeddings: EmbeddingsService,
    private vectorStore: VectorStoreService,
  ) {}

  async findRelevantChunks(question: string, documentId: string, topK = 5): Promise<VectorSearchResult[]> {
    const questionVector = await this.embeddings.embed(question);
    return this.vectorStore.search(questionVector, {
      topK,
      filter: { documentId },
    });
  }
}
