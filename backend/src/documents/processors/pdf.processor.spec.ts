// jest.mock is hoisted — factory must not reference variables declared below
jest.mock('pdf-parse', () => jest.fn());

import { PdfProcessor } from './pdf.processor';

describe('PdfProcessor', () => {
  let processor: PdfProcessor;
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  let mockPdfParse: jest.Mock;

  beforeEach(() => {
    processor = new PdfProcessor();
    mockPdfParse = require('pdf-parse') as jest.Mock;
    jest.clearAllMocks();
  });

  it('returns extracted text from a PDF buffer', async () => {
    mockPdfParse.mockResolvedValue({ text: 'Extracted PDF content' });
    const buffer = Buffer.from('fake-pdf');
    const result = await processor.extract(buffer);
    expect(result).toBe('Extracted PDF content');
    expect(mockPdfParse).toHaveBeenCalledWith(buffer);
  });

  it('propagates errors thrown by pdf-parse', async () => {
    mockPdfParse.mockRejectedValue(new Error('Corrupt PDF'));
    await expect(processor.extract(Buffer.from(''))).rejects.toThrow('Corrupt PDF');
  });
});
