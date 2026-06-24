import path from 'path';
import { routeExtraction } from '../extractors/router.js';

// We mock the heavy extractors so the router test stays fast and dependency-free
jest.mock('../extractors/text-extractor', () => ({
  extractText: jest.fn().mockResolvedValue({ content: 'text content', tags: ['txt'] }),
}));
jest.mock('../extractors/pdf-extractor', () => ({
  extractPdf: jest.fn().mockResolvedValue({ content: 'pdf content', tags: ['pdf'] }),
}));
jest.mock('../extractors/docx-extractor', () => ({
  extractDocx: jest.fn().mockResolvedValue({ content: 'docx content', tags: ['docx', 'word'] }),
}));
jest.mock('../extractors/ocr-extractor', () => ({
  extractOcr: jest.fn().mockResolvedValue({ content: 'ocr text', tags: ['image', 'ocr'] }),
}));
jest.mock('../extractors/yolo-tagger', () => ({
  tagImage: jest.fn().mockResolvedValue(['cat', 'dog']),
}));

const MODELS_DIR = '/fake/models';

describe('extractor router', () => {
  it('routes .txt to the text extractor', async () => {
    const { content } = await routeExtraction('/some/file.txt', MODELS_DIR);
    expect(content).toBe('text content');
  });

  it('routes .md to the text extractor', async () => {
    const { content } = await routeExtraction('/some/README.md', MODELS_DIR);
    expect(content).toBe('text content');
  });

  it('routes .pdf to the PDF extractor', async () => {
    const { content, tags } = await routeExtraction('/some/file.pdf', MODELS_DIR);
    expect(content).toBe('pdf content');
    expect(tags).toContain('pdf');
  });

  it('routes .docx to the DOCX extractor', async () => {
    const { content, tags } = await routeExtraction('/some/file.docx', MODELS_DIR);
    expect(content).toBe('docx content');
    expect(tags).toContain('word');
  });

  it('routes .png to OCR + YOLO', async () => {
    const { content, tags } = await routeExtraction('/some/photo.png', MODELS_DIR);
    expect(content).toBe('ocr text');
    expect(tags).toContain('cat');
    expect(tags).toContain('dog');
  });

  it('skips image extraction when skipImages=true', async () => {
    const { content, tags } = await routeExtraction(
      '/some/photo.jpg',
      MODELS_DIR,
      true,
    );
    expect(content).toBe('');
    expect(tags).toContain('image');
  });

  it('returns empty result for unknown binary extensions', async () => {
    const { content, tags } = await routeExtraction('/some/file.exe', MODELS_DIR);
    expect(content).toBe('');
    expect(tags).toHaveLength(0);
  });

  it('handles extractor errors gracefully without throwing', async () => {
    const { extractText } = jest.requireMock('../extractors/text-extractor');
    (extractText as jest.Mock).mockRejectedValueOnce(new Error('read error'));

    const { content, error } = await routeExtraction('/some/broken.txt', MODELS_DIR);
    expect(content).toBe('');
    expect(error).toBeDefined();
  });
});
