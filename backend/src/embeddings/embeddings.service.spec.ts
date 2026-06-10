import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmbeddingsService } from './embeddings.service';

const mockCreate = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    embeddings: { create: mockCreate },
  }));
});

describe('EmbeddingsService', () => {
  let service: EmbeddingsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmbeddingsService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('sk-test') } },
      ],
    }).compile();

    service = module.get(EmbeddingsService);
    jest.clearAllMocks();
  });

  describe('embed()', () => {
    it('returns the embedding vector for a single text', async () => {
      const vector = [0.1, 0.2, 0.3];
      mockCreate.mockResolvedValue({ data: [{ embedding: vector }] });

      const result = await service.embed('hello world');

      expect(result).toEqual(vector);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: 'hello world',
      });
    });

    it('propagates API errors', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));
      await expect(service.embed('text')).rejects.toThrow('API error');
    });
  });

  describe('embedBatch()', () => {
    it('returns one vector per input text', async () => {
      const vectors = [[0.1, 0.2], [0.3, 0.4]];
      mockCreate.mockResolvedValue({
        data: vectors.map((embedding) => ({ embedding })),
      });

      const result = await service.embedBatch(['text1', 'text2']);

      expect(result).toEqual(vectors);
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: ['text1', 'text2'],
      });
    });
  });
});
