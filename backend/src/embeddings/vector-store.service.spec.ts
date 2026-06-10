import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VectorStoreService } from './vector-store.service';

const mockCollection = {
  upsert: jest.fn(),
  query: jest.fn(),
  delete: jest.fn(),
};

const mockGetOrCreateCollection = jest.fn().mockResolvedValue(mockCollection);

jest.mock('chromadb', () => ({
  ChromaClient: jest.fn().mockImplementation(() => ({
    getOrCreateCollection: mockGetOrCreateCollection,
  })),
}));

describe('VectorStoreService', () => {
  let service: VectorStoreService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VectorStoreService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def: string) => def),
          },
        },
      ],
    }).compile();

    service = module.get(VectorStoreService);
    await service.onModuleInit();
    jest.clearAllMocks();
  });

  describe('upsert()', () => {
    it('calls collection.upsert with correct shape', async () => {
      mockCollection.upsert.mockResolvedValue(undefined);

      await service.upsert({
        id: 'chunk-1',
        embedding: [0.1, 0.2],
        text: 'hello',
        metadata: { documentId: 'doc-1', fileName: 'test.md', chunkIndex: '0' },
      });

      expect(mockCollection.upsert).toHaveBeenCalledWith({
        ids: ['chunk-1'],
        embeddings: [[0.1, 0.2]],
        documents: ['hello'],
        metadatas: [{ documentId: 'doc-1', fileName: 'test.md', chunkIndex: '0' }],
      });
    });
  });

  describe('search()', () => {
    it('maps query results to VectorSearchResult array', async () => {
      mockCollection.query.mockResolvedValue({
        ids: [['chunk-1']],
        documents: [['hello']],
        metadatas: [[{ documentId: 'doc-1', fileName: 'test.md', chunkIndex: '0' }]],
        distances: [[0.05]],
      });

      const results = await service.search([0.1, 0.2], { topK: 1 });

      expect(results).toHaveLength(1);
      expect(results[0]).toEqual({
        id: 'chunk-1',
        text: 'hello',
        metadata: { documentId: 'doc-1', fileName: 'test.md', chunkIndex: '0' },
        distance: 0.05,
      });
    });

    it('passes filter to collection.query when provided', async () => {
      mockCollection.query.mockResolvedValue({ ids: [[]], documents: [[]], metadatas: [[]], distances: [[]] });

      await service.search([0.1], { topK: 5, filter: { documentId: 'doc-1' } });

      expect(mockCollection.query).toHaveBeenCalledWith(
        expect.objectContaining({ where: { documentId: 'doc-1' } }),
      );
    });
  });

  describe('deleteByDocument()', () => {
    it('calls collection.delete with correct where clause', async () => {
      mockCollection.delete.mockResolvedValue(undefined);
      await service.deleteByDocument('doc-1');
      expect(mockCollection.delete).toHaveBeenCalledWith({ where: { documentId: 'doc-1' } });
    });
  });
});
