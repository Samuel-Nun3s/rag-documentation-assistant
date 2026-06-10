import { MarkdownProcessor } from './markdown.processor';

describe('MarkdownProcessor', () => {
  let processor: MarkdownProcessor;

  beforeEach(() => {
    processor = new MarkdownProcessor();
  });

  it('strips heading markers', () => {
    const result = processor.extract('# Title\n## Subtitle\n### Section');
    expect(result).not.toContain('#');
    expect(result).toContain('Title');
    expect(result).toContain('Subtitle');
    expect(result).toContain('Section');
  });

  it('strips bold and italic markers', () => {
    const result = processor.extract('**bold** and *italic* and _also italic_');
    expect(result).not.toContain('*');
    expect(result).not.toContain('_');
    expect(result).toContain('bold');
    expect(result).toContain('italic');
  });

  it('keeps link text and removes the URL', () => {
    const result = processor.extract('[NestJS](https://nestjs.com)');
    expect(result).toContain('NestJS');
    expect(result).not.toContain('https://nestjs.com');
    expect(result).not.toContain('(');
  });

  it('preserves code content inside code blocks', () => {
    const md = '```typescript\nconst x = 1;\n```';
    const result = processor.extract(md);
    expect(result).toContain('const x = 1;');
  });

  it('strips inline backticks', () => {
    const result = processor.extract('Use the `console.log` function');
    expect(result).not.toContain('`');
    expect(result).toContain('console.log');
  });

  it('returns empty string for empty input', () => {
    expect(processor.extract('')).toBe('');
  });

  it('trims leading and trailing whitespace', () => {
    const result = processor.extract('  # Hello  ');
    expect(result).toBe('Hello');
  });
});
