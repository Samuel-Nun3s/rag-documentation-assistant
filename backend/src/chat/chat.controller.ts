import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ChatService } from './chat.service';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('conversations')
  createConversation(@Body('documentId') documentId: string): Promise<Conversation> {
    return this.chatService.createConversation(documentId);
  }

  @Post('conversations/:id/ask')
  ask(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Body('question') question: string,
  ): Promise<Message> {
    return this.chatService.ask(conversationId, question);
  }

  @Post('conversations/:id/ask/stream')
  async askStream(
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Body('question') question: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!question) throw new BadRequestException('No question provided');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      for await (const event of this.chatService.askStream(conversationId, question)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal error';
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Get('conversations/document/:documentId')
  listByDocument(@Param('documentId', ParseUUIDPipe) documentId: string): Promise<Conversation[]> {
    return this.chatService.listConversations(documentId);
  }

  @Get('conversations/:id/messages')
  getMessages(@Param('id', ParseUUIDPipe) conversationId: string): Promise<Message[]> {
    return this.chatService.getMessages(conversationId);
  }
}
