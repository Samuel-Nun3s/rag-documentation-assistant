import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChromaClient } from 'chromadb';

export interface VectorSearchResult {
  id: string;
  text: string;
  metadata: Record<string, string>;
  distance: number;
}

@Injectable()
export class VectorStoreService implements OnModuleInit {
  private client: ChromaClient;
  private readonly collectionName = 'rag_documents';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private collection: any;

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const chromaUrl = this.config.get<string>('CHROMA_URL', 'http://localhost:8000');
    const url = new URL(chromaUrl);

    this.client = new ChromaClient({
      host: url.hostname,
      port: parseInt(url.port || '8000'),
      ssl: url.protocol === 'https:',
      headers: {
        Authorization: `Bearer ${this.config.get<string>('CHROMA_TOKEN', 'rag-chroma-token')}`,
      },
    } as any);

    this.collection = await this.client.getOrCreateCollection({
      name: this.collectionName,
      embeddingFunction: null,
    });
  }

  async upsert(params: {
    id: string;
    embedding: number[];
    text: string;
    metadata: Record<string, string>;
  }): Promise<void> {
    await this.collection.upsert({
      ids: [params.id],
      embeddings: [params.embedding],
      documents: [params.text],
      metadatas: [params.metadata],
    });
  }

  async search(queryEmbedding: number[], options: { topK: number; filter?: Record<string, string> }): Promise<VectorSearchResult[]> {
    const results = await this.collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: options.topK,
      where: options.filter as any,
    });

    return (results.ids[0] ?? []).map((id, i) => ({
      id,
      text: results.documents[0][i] ?? '',
      metadata: (results.metadatas[0][i] ?? {}) as Record<string, string>,
      distance: results.distances?.[0]?.[i] ?? 0,
    }));
  }

  async deleteByDocument(documentId: string): Promise<void> {
    await this.collection.delete({ where: { documentId } });
  }
}
