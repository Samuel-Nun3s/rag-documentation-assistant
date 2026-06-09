import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingsService {
  private openai: OpenAI;

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({ apiKey: this.config.get<string>('OPENAI_API_KEY') });
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
    });
    return response.data.map((d) => d.embedding);
  }
}
