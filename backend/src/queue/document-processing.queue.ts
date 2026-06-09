import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Inject, Logger, forwardRef } from '@nestjs/common';
import { DocumentsService } from '../documents/documents.service';

export const DOCUMENT_PROCESSING_QUEUE = 'document-processing';

export interface DocumentJob {
  documentId: string;
  // file upload
  fileBuffer?: string; // base64
  mimeType?: string;
  fileName?: string;
  // github
  repoUrl?: string;
}

@Processor(DOCUMENT_PROCESSING_QUEUE)
export class DocumentProcessingQueue extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessingQueue.name);

  constructor(
    @Inject(forwardRef(() => DocumentsService))
    private readonly documentsService: DocumentsService,
  ) {
    super();
  }

  async process(job: Job<DocumentJob>): Promise<void> {
    const { documentId } = job.data;
    this.logger.log(`[${job.name}] Starting job for document ${documentId}`);

    if (job.name === 'process-file') {
      const buffer = Buffer.from(job.data.fileBuffer!, 'base64');
      await this.documentsService.processFile(documentId, buffer, job.data.mimeType!, job.data.fileName!);
    } else if (job.name === 'process-github') {
      await this.documentsService.processGithub(documentId, job.data.repoUrl!);
    }

    this.logger.log(`[${job.name}] Completed job for document ${documentId}`);
  }
}
