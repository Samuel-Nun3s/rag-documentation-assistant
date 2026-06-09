import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Document } from './entities/document.entity';
import { ChunkingService } from './chunking.service';
import { PdfProcessor } from './processors/pdf.processor';
import { MarkdownProcessor } from './processors/markdown.processor';
import { GithubProcessor } from './processors/github.processor';
import { EmbeddingsService } from '../embeddings/embeddings.service';
import { VectorStoreService } from '../embeddings/vector-store.service';
import { DOCUMENT_PROCESSING_QUEUE, DocumentJob } from '../queue/document-processing.queue';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    @InjectRepository(Document)
    private readonly repo: Repository<Document>,
    @InjectQueue(DOCUMENT_PROCESSING_QUEUE)
    private readonly queue: Queue<DocumentJob>,
    private readonly chunking: ChunkingService,
    private readonly pdf: PdfProcessor,
    private readonly markdown: MarkdownProcessor,
    private readonly github: GithubProcessor,
    private readonly embeddings: EmbeddingsService,
    private readonly vectorStore: VectorStoreService,
  ) {}

  // ── Entry points (called by controller) ──────────────────────────────────

  async createFromUpload(file: Express.Multer.File): Promise<Document> {
    const doc = await this.repo.save(
      this.repo.create({
        id: uuid(),
        name: file.originalname,
        status: 'processing',
        source: 'upload',
        mimeType: file.mimetype,
      }),
    );

    await this.queue.add('process-file', {
      documentId: doc.id,
      fileBuffer: file.buffer.toString('base64'),
      mimeType: file.mimetype,
      fileName: file.originalname,
    } as any);

    return doc;
  }

  async createFromGithub(repoUrl: string): Promise<Document> {
    const name = repoUrl.split('/').slice(-2).join('/');
    const doc = await this.repo.save(
      this.repo.create({
        id: uuid(),
        name,
        status: 'processing',
        source: 'github',
      }),
    );

    await this.queue.add('process-github', {
      documentId: doc.id,
      repoUrl,
    } as any);

    return doc;
  }

  // ── Pipeline (called by queue worker) ────────────────────────────────────

  async processFile(documentId: string, fileBuffer: Buffer, mimeType: string, fileName: string): Promise<void> {
    try {
      const rawText = mimeType === 'application/pdf'
        ? await this.pdf.extract(fileBuffer)
        : this.markdown.extract(fileBuffer.toString('utf-8'));

      await this.ingestText(rawText, documentId, { source: 'upload', fileName });
    } catch (error) {
      await this.markError(documentId, error);
    }
  }

  async processGithub(documentId: string, repoUrl: string): Promise<void> {
    try {
      const files = await this.github.extractFromRepo(repoUrl);

      for (const file of files) {
        const text = file.path.endsWith('.md')
          ? this.markdown.extract(file.content)
          : file.content;

        await this.ingestText(text, documentId, { source: 'github', fileName: file.path });
      }

      await this.repo.update(documentId, { status: 'ready' });
    } catch (error) {
      await this.markError(documentId, error);
    }
  }

  // ── Core ingestion logic ──────────────────────────────────────────────────

  private async ingestText(
    text: string,
    documentId: string,
    meta: { source: string; fileName: string },
  ): Promise<void> {
    const chunks = this.chunking.chunkText(text);
    const embeddings = await this.embeddings.embedBatch(chunks);

    await Promise.all(
      chunks.map((chunk, i) =>
        this.vectorStore.upsert({
          id: `${documentId}-${meta.fileName}-${i}`,
          embedding: embeddings[i],
          text: chunk,
          metadata: { documentId, fileName: meta.fileName, chunkIndex: String(i) },
        }),
      ),
    );

    await this.repo.increment({ id: documentId }, 'chunkCount', chunks.length);
    await this.repo.update(documentId, { status: 'ready' });

    this.logger.log(`Indexed ${chunks.length} chunks for document ${documentId} (${meta.fileName})`);
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  findAll(): Promise<Document[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<Document> {
    const doc = await this.repo.findOneBy({ id });
    if (!doc) throw new NotFoundException(`Document ${id} not found`);
    return doc;
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.vectorStore.deleteByDocument(id);
    await this.repo.delete(id);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private async markError(documentId: string, error: unknown): Promise<void> {
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`Failed to process document ${documentId}: ${message}`);
    await this.repo.update(documentId, { status: 'error', errorMessage: message });
  }
}
