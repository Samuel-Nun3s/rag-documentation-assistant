import { Module } from '@nestjs/common';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { ChunkingService } from './chunking.service';
import { PdfProcessor } from './processors/pdf.processor';
import { MarkdownProcessor } from './processors/markdown.processor';
import { GithubProcessor } from './processors/github.processor';
import { EmbeddingsModule } from '../embeddings/embeddings.module';

@Module({
  imports: [EmbeddingsModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, ChunkingService, PdfProcessor, MarkdownProcessor, GithubProcessor],
  exports: [DocumentsService],
})
export class DocumentsModule {}
