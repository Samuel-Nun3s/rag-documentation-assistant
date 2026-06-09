import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DocumentProcessingQueue, DOCUMENT_PROCESSING_QUEUE } from './document-processing.queue';

@Module({
  imports: [BullModule.registerQueue({ name: DOCUMENT_PROCESSING_QUEUE })],
  providers: [DocumentProcessingQueue],
  exports: [BullModule],
})
export class QueueModule {}
