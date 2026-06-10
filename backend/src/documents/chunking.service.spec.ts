import { ChunkingService } from './chunking.service';

describe('ChunkingService', () => {
  let service: ChunkingService;

  beforeEach(() => {
    service = new ChunkingService();
  });

  it('returns a single chunk when text is shorter than chunkSize', () => {
    const text = 'short text';
    const chunks = service.chunkText(text, 500, 50);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  it('returns empty array for empty text', () => {
    expect(service.chunkText('', 500, 50)).toHaveLength(0);
  });

  it('splits text into multiple chunks of the given size', () => {
    const text = 'a'.repeat(1000);
    const chunks = service.chunkText(text, 500, 0);
    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toHaveLength(500);
    expect(chunks[1]).toHaveLength(500);
  });

  it('overlaps consecutive chunks by the overlap amount', () => {
    const text = 'abcdefghij'; // 10 chars
    // chunk 0: [0,6) = 'abcdef'  → next start = 6-2 = 4
    // chunk 1: [4,10) = 'efghij'
    const chunks = service.chunkText(text, 6, 2);
    expect(chunks[0]).toBe('abcdef');
    expect(chunks[1]).toBe('efghij');
    expect(chunks[0].slice(-2)).toBe(chunks[1].slice(0, 2));
  });

  it('produces correct number of chunks with overlap', () => {
    const text = 'x'.repeat(100);
    const chunks = service.chunkText(text, 20, 5);
    chunks.forEach((chunk) => expect(chunk.length).toBeLessThanOrEqual(20));
    expect(chunks.length).toBeGreaterThan(1);
  });
});
