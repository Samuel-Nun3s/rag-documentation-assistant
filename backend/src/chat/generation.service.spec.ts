import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GenerationService } from './generation.service';

const mockCreate = jest.fn();
jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  }));
});

describe('GenerationService', () => {
  let service: GenerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GenerationService,
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue('sk-test') } },
      ],
    }).compile();

    service = module.get(GenerationService);
    jest.clearAllMocks();
  });

  describe('generate()', () => {
    it('returns the assistant message content', async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: 'Generated answer' } }],
      });

      const result = await service.generate({ system: 'You are helpful', user: 'question' });

      expect(result).toBe('Generated answer');
      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are helpful' },
          { role: 'user', content: 'question' },
        ],
      });
    });

    it('returns empty string when content is null', async () => {
      mockCreate.mockResolvedValue({ choices: [{ message: { content: null } }] });
      const result = await service.generate({ system: 'sys', user: 'usr' });
      expect(result).toBe('');
    });
  });

  describe('generateStream()', () => {
    it('yields tokens from the stream', async () => {
      async function* fakeStream() {
        yield { choices: [{ delta: { content: 'Hello' } }] };
        yield { choices: [{ delta: { content: ' World' } }] };
        yield { choices: [{ delta: { content: null } }] }; // empty delta — should be skipped
      }
      mockCreate.mockResolvedValue(fakeStream());

      const tokens: string[] = [];
      for await (const token of service.generateStream({ system: 'sys', user: 'usr' })) {
        tokens.push(token);
      }

      expect(tokens).toEqual(['Hello', ' World']);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({ stream: true }));
    });
  });
});
