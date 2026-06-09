import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { RetrievalService } from './retrieval.service';
import { GenerationService } from './generation.service';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message]), EmbeddingsModule],
  controllers: [ChatController],
  providers: [ChatService, RetrievalService, GenerationService],
})
export class ChatModule {}
