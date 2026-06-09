import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
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

  @Get('conversations/document/:documentId')
  listByDocument(@Param('documentId', ParseUUIDPipe) documentId: string): Promise<Conversation[]> {
    return this.chatService.listConversations(documentId);
  }

  @Get('conversations/:id/messages')
  getMessages(@Param('id', ParseUUIDPipe) conversationId: string): Promise<Message[]> {
    return this.chatService.getMessages(conversationId);
  }
}
