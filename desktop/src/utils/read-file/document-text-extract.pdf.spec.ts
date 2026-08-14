import { getDocumentTextLines, clearDocumentTextExtractCacheForTests } from './document-text-extract';

jest.mock('fs/promises', () => ({
  stat: jest.fn().mockResolvedValue({ mtimeMs: 42 }),
}));

jest.mock('../../local-read-pdf', () => ({
  readPdfDocumentText: jest.fn(),
}));

import { readPdfDocumentText } from '../../local-read-pdf';

describe('getDocumentTextLines pdf', () => {
  beforeEach(() => {
    clearDocumentTextExtractCacheForTests();
    jest.clearAllMocks();
  });

  it('records OCR extraction via when readPdfDocumentText used OCR', async () => {
    (readPdfDocumentText as jest.Mock).mockResolvedValue({
      text: 'Scanned invoice total $42',
      method: 'ocr',
    });

    const result = await getDocumentTextLines('/tmp/invoice.pdf', 'pdf');

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.via).toBe('ocr');
      expect(result.lines[0]).toContain('Scanned invoice');
    }
  });
});
