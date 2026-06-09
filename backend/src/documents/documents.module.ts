import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { ChunkingService } from './chunking.service';
import { PdfProcessor } from './processors/pdf.processor';
import { MarkdownProcessor } from './processors/markdown.processor';
import { GithubProcessor } from './processors/github.processor';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { QueueModule } from '../queue/queue.module';
import { Document } from './entities/document.entity';
import { DOCUMENT_PROCESSING_QUEUE } from '../queue/document-processing.queue';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    BullModule.registerQueue({ name: DOCUMENT_PROCESSING_QUEUE }),
    EmbeddingsModule,
    forwardRef(() => QueueModule),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, ChunkingService, PdfProcessor, MarkdownProcessor, GithubProcessor],
  exports: [DocumentsService],
})
export class DocumentsModule {}
