import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';

export const DOCUMENT_PROCESSING_QUEUE = 'document-processing';

export interface DocumentJob {
  documentId: string;
  filePath: string;
  mimeType: string;
}

@Processor(DOCUMENT_PROCESSING_QUEUE)
export class DocumentProcessingQueue extends WorkerHost {
  private readonly logger = new Logger(DocumentProcessingQueue.name);

  async process(job: Job<DocumentJob>): Promise<void> {
    this.logger.log(`Processing document ${job.data.documentId}`);
    // DocumentsService will be injected here in Phase 2
  }
}
