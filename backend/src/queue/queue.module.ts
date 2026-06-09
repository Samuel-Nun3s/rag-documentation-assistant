import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DocumentProcessingQueue, DOCUMENT_PROCESSING_QUEUE } from './document-processing.queue';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: DOCUMENT_PROCESSING_QUEUE }),
    forwardRef(() => DocumentsModule),
  ],
  providers: [DocumentProcessingQueue],
  exports: [BullModule],
})
export class QueueModule {}
