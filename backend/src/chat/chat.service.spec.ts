import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { RetrievalService } from './retrieval.service';
import { GenerationService } from './generation.service';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

const makeRepo = () => ({
  create: jest.fn((dto) => dto),
  save: jest.fn(async (entity) => ({ ...entity, createdAt: new Date() })),
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
});

const mockChunks = [
  { id: 'c1', text: 'Module lifecycle context', metadata: { documentId: 'doc-1', fileName: 'a.md', chunkIndex: '0' }, distance: 0.1 },
];

describe('ChatService', () => {
  let service: ChatService;
  let convRepo: ReturnType<typeof makeRepo>;
  let msgRepo: ReturnType<typeof makeRepo>;
  let retrieval: jest.Mocked<RetrievalService>;
  let generation: jest.Mocked<GenerationService>;

  beforeEach(async () => {
    convRepo = makeRepo();
    msgRepo = makeRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(Conversation), useValue: convRepo },
        { provide: getRepositoryToken(Message), useValue: msgRepo },
        { provide: RetrievalService, useValue: { findRelevantChunks: jest.fn() } },
        { provide: GenerationService, useValue: { generate: jest.fn(), generateStream: jest.fn() } },
      ],
    }).compile();

    service = module.get(ChatService);
    retrieval = module.get(RetrievalService);
    generation = module.get(GenerationService);
  });

  describe('createConversation()', () => {
    it('persists and returns a new conversation', async () => {
      const conv = await service.createConversation('doc-1');
      expect(convRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ documentId: 'doc-1' }),
      );
      expect(conv.documentId).toBe('doc-1');
    });
  });

  describe('ask()', () => {
    const conversation = { id: 'conv-1', documentId: 'doc-1', title: null } as Conversation;

    beforeEach(() => {
      convRepo.findOne.mockResolvedValue(conversation);
      retrieval.findRelevantChunks.mockResolvedValue(mockChunks);
      generation.generate.mockResolvedValue('The lifecycle has 4 events.');
    });

    it('saves user message, retrieves chunks, generates answer and saves assistant message', async () => {
      const message = await service.ask('conv-1', 'What is the lifecycle?');

      expect(msgRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'user', content: 'What is the lifecycle?' }),
      );
      expect(retrieval.findRelevantChunks).toHaveBeenCalledWith('What is the lifecycle?', 'doc-1');
      expect(generation.generate).toHaveBeenCalledWith(
        expect.objectContaining({ user: expect.stringContaining('Module lifecycle context') }),
      );
      expect(message.role).toBe('assistant');
      expect(message.content).toBe('The lifecycle has 4 events.');
    });

    it('auto-titles the conversation on the first question', async () => {
      await service.ask('conv-1', 'Short question?');
      expect(convRepo.update).toHaveBeenCalledWith('conv-1', { title: 'Short question?' });
    });

    it('truncates long questions when setting the title', async () => {
      const longQuestion = 'a'.repeat(80);
      await service.ask('conv-1', longQuestion);
      expect(convRepo.update).toHaveBeenCalledWith('conv-1', {
        title: expect.stringMatching(/^a{60}…$/),
      });
    });

    it('skips title update if conversation already has a title', async () => {
      convRepo.findOne.mockResolvedValue({ ...conversation, title: 'Existing title' });
      await service.ask('conv-1', 'New question');
      expect(convRepo.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown conversationId', async () => {
      convRepo.findOne.mockResolvedValue(null);
      await expect(service.ask('bad-id', 'question')).rejects.toThrow(NotFoundException);
    });

    it('attaches sources from retrieved chunks to the assistant message', async () => {
      const msg = await service.ask('conv-1', 'question?');
      expect(msg.sources).toEqual([{ fileName: 'a.md', chunkIndex: '0' }]);
    });
  });

  describe('askStream()', () => {
    it('yields tokens and a done event with the saved messageId', async () => {
      convRepo.findOne.mockResolvedValue({ id: 'conv-1', documentId: 'doc-1', title: 'T' } as Conversation);
      retrieval.findRelevantChunks.mockResolvedValue(mockChunks);
      msgRepo.save.mockResolvedValueOnce({ id: 'user-msg-id' } as any);

      async function* fakeStream() {
        yield 'Hello';
        yield ' World';
      }
      generation.generateStream = jest.fn().mockReturnValue(fakeStream());
      msgRepo.save.mockResolvedValue({ id: 'asst-msg-id' } as any);

      const events: any[] = [];
      for await (const event of service.askStream('conv-1', 'question')) {
        events.push(event);
      }

      const tokens = events.filter((e) => e.token);
      const done = events.find((e) => e.done);

      expect(tokens.map((e) => e.token)).toEqual(['Hello', ' World']);
      expect(done).toBeDefined();
      expect(done.messageId).toBeDefined();
    });
  });
});
