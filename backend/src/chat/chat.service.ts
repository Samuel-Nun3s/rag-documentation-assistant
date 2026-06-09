import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { RetrievalService } from './retrieval.service';
import { GenerationService } from './generation.service';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly retrieval: RetrievalService,
    private readonly generation: GenerationService,
  ) {}

  async createConversation(documentId: string): Promise<Conversation> {
    return this.conversationRepo.save(
      this.conversationRepo.create({ id: uuid(), documentId }),
    );
  }

  async ask(conversationId: string, question: string): Promise<Message> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
      relations: { messages: true },
    });
    if (!conversation) throw new NotFoundException(`Conversation ${conversationId} not found`);

    // Set conversation title from the first question
    if (!conversation.title) {
      const title = question.length > 60 ? `${question.slice(0, 60)}…` : question;
      await this.conversationRepo.update(conversationId, { title });
    }

    await this.messageRepo.save(
      this.messageRepo.create({
        id: uuid(),
        conversationId,
        role: 'user',
        content: question,
      }),
    );

    const chunks = await this.retrieval.findRelevantChunks(question, conversation.documentId);
    const context = chunks.map((c) => c.text).join('\n\n');
    const sources = chunks.map((c) => ({
      fileName: c.metadata.fileName,
      chunkIndex: c.metadata.chunkIndex,
    }));

    const answer = await this.generation.generate({
      system:
        'Responda apenas com base no contexto fornecido. ' +
        'Ao final da resposta, cite as fontes no formato [Fonte: <fileName>].',
      user: `Contexto:\n${context}\n\nPergunta: ${question}`,
    });

    return this.messageRepo.save(
      this.messageRepo.create({
        id: uuid(),
        conversationId,
        role: 'assistant',
        content: answer,
        sources,
      }),
    );
  }

  async *askStream(
    conversationId: string,
    question: string,
  ): AsyncGenerator<{ token?: string; done?: boolean; messageId?: string }> {
    const conversation = await this.conversationRepo.findOne({
      where: { id: conversationId },
    });
    if (!conversation) throw new NotFoundException(`Conversation ${conversationId} not found`);

    if (!conversation.title) {
      const title = question.length > 60 ? `${question.slice(0, 60)}…` : question;
      await this.conversationRepo.update(conversationId, { title });
    }

    await this.messageRepo.save(
      this.messageRepo.create({ id: uuid(), conversationId, role: 'user', content: question }),
    );

    const chunks = await this.retrieval.findRelevantChunks(question, conversation.documentId);
    const context = chunks.map((c) => c.text).join('\n\n');
    const sources = chunks.map((c) => ({
      fileName: c.metadata.fileName,
      chunkIndex: c.metadata.chunkIndex,
    }));

    let fullAnswer = '';

    for await (const token of this.generation.generateStream({
      system:
        'Responda apenas com base no contexto fornecido. ' +
        'Ao final da resposta, cite as fontes no formato [Fonte: <fileName>].',
      user: `Contexto:\n${context}\n\nPergunta: ${question}`,
    })) {
      fullAnswer += token;
      yield { token };
    }

    const saved = await this.messageRepo.save(
      this.messageRepo.create({
        id: uuid(),
        conversationId,
        role: 'assistant',
        content: fullAnswer,
        sources,
      }),
    );

    yield { done: true, messageId: saved.id };
  }

  async listConversations(documentId: string): Promise<Conversation[]> {
    return this.conversationRepo.find({
      where: { documentId },
      order: { createdAt: 'DESC' },
    });
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return this.messageRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }
}
