import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class GenerationService {
  private openai: OpenAI;

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({ apiKey: this.config.get<string>('OPENAI_API_KEY') });
  }

  async generate(params: { system: string; user: string }): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.user },
      ],
    });

    return response.choices[0].message.content ?? '';
  }

  async *generateStream(params: { system: string; user: string }): AsyncGenerator<string> {
    const stream = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      stream: true,
      messages: [
        { role: 'system', content: params.system },
        { role: 'user', content: params.user },
      ],
    });

    for await (const chunk of stream) {
      const token = chunk.choices[0]?.delta?.content ?? '';
      if (token) yield token;
    }
  }
}
