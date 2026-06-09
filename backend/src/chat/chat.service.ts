import { Injectable } from '@nestjs/common';
import { RetrievalService } from './retrieval.service';
import { GenerationService } from './generation.service';

@Injectable()
export class ChatService {
  constructor(
    private retrieval: RetrievalService,
    private generation: GenerationService,
  ) {}

  async ask(question: string, documentId: string): Promise<string> {
    const relevantChunks = await this.retrieval.findRelevantChunks(question, documentId);
    const context = relevantChunks.map((c) => c.text).join('\n\n');

    return this.generation.generate({
      system: 'Responda apenas com base no contexto fornecido. Cite a fonte (arquivo/página) quando possível.',
      user: `Contexto:\n${context}\n\nPergunta: ${question}`,
    });
  }
}
