import { Module } from '@nestjs/common';
import { EmbeddingsService } from './embeddings.service';
import { VectorStoreService } from './vector-store.service';

@Module({
  providers: [EmbeddingsService, VectorStoreService],
  exports: [EmbeddingsService, VectorStoreService],
})
export class EmbeddingsModule {}
