import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { RetrievalService } from './retrieval.service';
import { GenerationService } from './generation.service';
import { EmbeddingsModule } from '../embeddings/embeddings.module';

@Module({
  imports: [EmbeddingsModule],
  controllers: [ChatController],
  providers: [ChatService, RetrievalService, GenerationService],
})
export class ChatModule {}
