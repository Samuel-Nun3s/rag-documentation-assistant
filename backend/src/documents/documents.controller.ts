import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UploadedFile,
  UseInterceptors,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { Document } from './entities/document.entity';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: Express.Multer.File): Promise<Document> {
    if (!file) throw new BadRequestException('No file provided');
    return this.documentsService.createFromUpload(file);
  }

  @Post('github')
  async fromGithub(@Body('url') url: string): Promise<Document> {
    if (!url) throw new BadRequestException('No repository URL provided');
    return this.documentsService.createFromGithub(url);
  }

  @Get()
  findAll(): Promise<Document[]> {
    return this.documentsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Document> {
    return this.documentsService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.documentsService.remove(id);
  }
}
