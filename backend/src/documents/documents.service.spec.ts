import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bullmq';
import { NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { Document } from './entities/document.entity';
import { ChunkingService } from './chunking.service';
import { PdfProcessor } from './processors/pdf.processor';
import { MarkdownProcessor } from './processors/markdown.processor';
import { GithubProcessor } from './processors/github.processor';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectorStoreService } from '../embeddings/vector-store.service';
import { DOCUMENT_PROCESSING_QUEUE } from '../queue/document-processing.queue';

const makeRepo = () => ({
  create: jest.fn((dto) => dto),
  save: jest.fn(async (doc) => ({ ...doc, createdAt: new Date(), updatedAt: new Date() })),
  findOneBy: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  increment: jest.fn(),
  delete: jest.fn(),
});

const makeQueue = () => ({ add: jest.fn() });

describe('DocumentsService', () => {
  let service: DocumentsService;
  let repo: ReturnType<typeof makeRepo>;
  let queue: ReturnType<typeof makeQueue>;
  let chunking: jest.Mocked<ChunkingService>;
  let pdfProcessor: jest.Mocked<PdfProcessor>;
  let markdownProcessor: jest.Mocked<MarkdownProcessor>;
  let embeddings: jest.Mocked<EmbeddingsService>;
  let vectorStore: jest.Mocked<VectorStoreService>;

  beforeEach(async () => {
    repo = makeRepo();
    queue = makeQueue();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        { provide: getRepositoryToken(Document), useValue: repo },
        { provide: getQueueToken(DOCUMENT_PROCESSING_QUEUE), useValue: queue },
        { provide: ChunkingService, useValue: { chunkText: jest.fn() } },
        { provide: PdfProcessor, useValue: { extract: jest.fn() } },
        { provide: MarkdownProcessor, useValue: { extract: jest.fn() } },
        { provide: GithubProcessor, useValue: { extractFromRepo: jest.fn() } },
        { provide: EmbeddingsService, useValue: { embedBatch: jest.fn() } },
        { provide: VectorStoreService, useValue: { upsert: jest.fn(), deleteByDocument: jest.fn() } },
      ],
    }).compile();

    service = module.get(DocumentsService);
    chunking = module.get(ChunkingService);
    pdfProcessor = module.get(PdfProcessor);
    markdownProcessor = module.get(MarkdownProcessor);
    embeddings = module.get(EmbeddingsService);
    vectorStore = module.get(VectorStoreService);
  });

  describe('createFromUpload()', () => {
    it('persists document with status processing and enqueues a job', async () => {
      const file = {
        originalname: 'doc.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('pdf-data'),
      } as Express.Multer.File;

      const doc = await service.createFromUpload(file);

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'doc.pdf', status: 'processing', source: 'upload' }),
      );
      expect(queue.add).toHaveBeenCalledWith('process-file', expect.objectContaining({ fileName: 'doc.pdf' }));
      expect(doc.status).toBe('processing');
    });
  });

  describe('createFromGithub()', () => {
    it('derives document name from repo URL and enqueues a github job', async () => {
      const doc = await service.createFromGithub('https://github.com/org/my-repo');

      expect(repo.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'org/my-repo', status: 'processing', source: 'github' }),
      );
      expect(queue.add).toHaveBeenCalledWith('process-github', expect.objectContaining({ repoUrl: 'https://github.com/org/my-repo' }));
    });
  });

  describe('processFile()', () => {
    it('extracts text from PDF, chunks, embeds and upserts to vector store', async () => {
      pdfProcessor.extract.mockResolvedValue('PDF text content');
      chunking.chunkText.mockReturnValue(['chunk one', 'chunk two']);
      embeddings.embedBatch.mockResolvedValue([[0.1, 0.2], [0.3, 0.4]]);
      vectorStore.upsert.mockResolvedValue(undefined);

      await service.processFile('doc-1', Buffer.from('pdf'), 'application/pdf', 'file.pdf');

      expect(pdfProcessor.extract).toHaveBeenCalled();
      expect(chunking.chunkText).toHaveBeenCalledWith('PDF text content');
      expect(embeddings.embedBatch).toHaveBeenCalledWith(['chunk one', 'chunk two']);
      expect(vectorStore.upsert).toHaveBeenCalledTimes(2);
      expect(repo.update).toHaveBeenCalledWith('doc-1', { status: 'ready' });
    });

    it('extracts text from Markdown files', async () => {
      markdownProcessor.extract.mockReturnValue('MD text content');
      chunking.chunkText.mockReturnValue(['chunk']);
      embeddings.embedBatch.mockResolvedValue([[0.1]]);
      vectorStore.upsert.mockResolvedValue(undefined);

      await service.processFile('doc-1', Buffer.from('# Hello'), 'text/markdown', 'file.md');

      expect(markdownProcessor.extract).toHaveBeenCalled();
      expect(pdfProcessor.extract).not.toHaveBeenCalled();
    });

    it('marks document as error when processing fails', async () => {
      pdfProcessor.extract.mockRejectedValue(new Error('Corrupt file'));

      await service.processFile('doc-1', Buffer.from(''), 'application/pdf', 'bad.pdf');

      expect(repo.update).toHaveBeenCalledWith('doc-1', {
        status: 'error',
        errorMessage: 'Corrupt file',
      });
    });
  });

  describe('findOne()', () => {
    it('returns the document when found', async () => {
      const doc = { id: 'doc-1', name: 'test.md' } as Document;
      repo.findOneBy.mockResolvedValue(doc);
      await expect(service.findOne('doc-1')).resolves.toEqual(doc);
    });

    it('throws NotFoundException when document does not exist', async () => {
      repo.findOneBy.mockResolvedValue(null);
      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove()', () => {
    it('deletes vectors and DB record', async () => {
      const doc = { id: 'doc-1' } as Document;
      repo.findOneBy.mockResolvedValue(doc);
      vectorStore.deleteByDocument.mockResolvedValue(undefined);

      await service.remove('doc-1');

      expect(vectorStore.deleteByDocument).toHaveBeenCalledWith('doc-1');
      expect(repo.delete).toHaveBeenCalledWith('doc-1');
    });
  });
});
