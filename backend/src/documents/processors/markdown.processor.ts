import { Injectable } from '@nestjs/common';

@Injectable()
export class MarkdownProcessor {
  extract(content: string): string {
    // Strip markdown syntax, keep plain text
    return content
      .replace(/```[\s\S]*?```/g, (match) => match.replace(/```\w*\n?/g, ''))
      .replace(/#{1,6}\s/g, '')
      .replace(/[*_~`]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .trim();
  }
}
