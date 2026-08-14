import fs from 'fs/promises';
import os from 'os';
import path from 'path';

jest.mock('./pdf-embedded-text.js', () => ({
  extractEmbeddedPdfText: jest.fn(),
}));
jest.mock('./pdf-page-renderer.js', () => ({
  renderPdfPagesToPngBuffers: jest.fn(),
}));
jest.mock('./indexer/extractors/ocr-extractor.js', () => ({
  extractOcrFromBuffer: jest.fn(),
}));

import { extractEmbeddedPdfText } from './pdf-embedded-text.js';
import { renderPdfPagesToPngBuffers } from './pdf-page-renderer.js';
import { extractOcrFromBuffer } from './indexer/extractors/ocr-extractor.js';
import { readPdfText } from './pdf-text-extract.js';

describe('readPdfText', () => {
  let tmpDir = '';

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'read-pdf-'));
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('uses embedded text when pdf-parse returns enough content', async () => {
    const filePath = path.join(tmpDir, 'report.pdf');
    await fs.writeFile(filePath, '%PDF');
    (extractEmbeddedPdfText as jest.Mock).mockResolvedValue({
      text: 'Embedded PDF paragraph with plenty of readable text for the model.',
      numPages: 1,
    });

    const result = await readPdfText({ filePath, modelsDir: tmpDir });

    expect(result.method).toBe('text');
    expect(result.content).toContain('Embedded PDF paragraph');
    expect(renderPdfPagesToPngBuffers).not.toHaveBeenCalled();
  });

  it('falls back to OCR when embedded text is sparse', async () => {
    const filePath = path.join(tmpDir, 'scan.pdf');
    await fs.writeFile(filePath, '%PDF');
    (extractEmbeddedPdfText as jest.Mock).mockResolvedValue({ text: '  ', numPages: 2 });
    (renderPdfPagesToPngBuffers as jest.Mock).mockResolvedValue([Buffer.from('png1'), Buffer.from('png2')]);
    (extractOcrFromBuffer as jest.Mock)
      .mockResolvedValueOnce({ content: 'Page one text', tags: ['ocr'] })
      .mockResolvedValueOnce({ content: 'Page two text', tags: ['ocr'] });

    const result = await readPdfText({ filePath, modelsDir: tmpDir, maxOcrPages: 2 });

    expect(result.method).toBe('ocr');
    expect(result.content).toContain('--- Page 1 ---');
    expect(result.content).toContain('Page one text');
    expect(result.content).toContain('Page two text');
    expect(result.tags).toContain('ocr');
  });

  it('falls back to embedded text when OCR throws', async () => {
    const filePath = path.join(tmpDir, 'broken-ocr.pdf');
    await fs.writeFile(filePath, '%PDF');
    (extractEmbeddedPdfText as jest.Mock).mockResolvedValue({
      text: 'Fallback embedded paragraph with enough characters for the model.',
      numPages: 1,
    });
    (renderPdfPagesToPngBuffers as jest.Mock).mockRejectedValue(new Error('render failed'));

    const result = await readPdfText({ filePath, modelsDir: tmpDir });

    expect(result.method).toBe('text');
    expect(result.content).toContain('Fallback embedded');
  });

  it('keeps embedded text when OCR returns less than pdf-parse', async () => {
    const filePath = path.join(tmpDir, 'weak-ocr.pdf');
    await fs.writeFile(filePath, '%PDF');
    (extractEmbeddedPdfText as jest.Mock).mockResolvedValue({ text: 'short', numPages: 3 });
    (renderPdfPagesToPngBuffers as jest.Mock).mockResolvedValue([Buffer.from('png')]);
    (extractOcrFromBuffer as jest.Mock).mockResolvedValue({ content: '', tags: ['ocr'] });

    const result = await readPdfText({ filePath, modelsDir: tmpDir });

    expect(result.method).toBe('text');
    expect(result.content).toBe('short');
  });
});
