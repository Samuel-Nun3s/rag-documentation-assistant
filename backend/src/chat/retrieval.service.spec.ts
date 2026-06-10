import { Test, TestingModule } from '@nestjs/testing';
import { RetrievalService } from './retrieval.service';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectorStoreService } from '../embeddings/vector-store.service';

describe('RetrievalService', () => {
  let service: RetrievalService;
  let embeddings: jest.Mocked<EmbeddingsService>;
  let vectorStore: jest.Mocked<VectorStoreService>;

  const mockChunks = [
    { id: 'c1', text: 'Chunk about modules', metadata: { documentId: 'doc-1', fileName: 'a.md', chunkIndex: '0' }, distance: 0.1 },
    { id: 'c2', text: 'Chunk about providers', metadata: { documentId: 'doc-1', fileName: 'a.md', chunkIndex: '1' }, distance: 0.2 },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RetrievalService,
        { provide: EmbeddingsService, useValue: { embed: jest.fn() } },
        { provide: VectorStoreService, useValue: { search: jest.fn() } },
      ],
    }).compile();

    service = module.get(RetrievalService);
    embeddings = module.get(EmbeddingsService);
    vectorStore = module.get(VectorStoreService);
  });

  it('embeds the question and searches the vector store', async () => {
    const vector = [0.1, 0.2, 0.3];
    embeddings.embed.mockResolvedValue(vector);
    vectorStore.search.mockResolvedValue(mockChunks);

    const result = await service.findRelevantChunks('What are modules?', 'doc-1');

    expect(embeddings.embed).toHaveBeenCalledWith('What are modules?');
    expect(vectorStore.search).toHaveBeenCalledWith(vector, {
      topK: 5,
      filter: { documentId: 'doc-1' },
    });
    expect(result).toEqual(mockChunks);
  });

  it('respects a custom topK value', async () => {
    embeddings.embed.mockResolvedValue([0.1]);
    vectorStore.search.mockResolvedValue([]);

    await service.findRelevantChunks('question', 'doc-1', 3);

    expect(vectorStore.search).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ topK: 3 }),
    );
  });
});
