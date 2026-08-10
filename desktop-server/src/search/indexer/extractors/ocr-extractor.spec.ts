import fs from 'fs';
import os from 'os';
import path from 'path';

const recognize = jest.fn().mockResolvedValue({ text: 'Hello OCR', confidence: 0.9, lines: [] });
const initialize = jest.fn().mockResolvedValue(undefined);
const destroy = jest.fn().mockResolvedValue(undefined);
const isInitialized = jest.fn().mockReturnValue(false);

jest.mock('ppu-paddle-ocr', () => ({
  PaddleOcrService: jest.fn().mockImplementation(() => ({
    initialize,
    recognize,
    destroy,
    isInitialized,
  })),
  V6_SMALL_MODEL: {
    detection: 'https://example.com/det.ort',
    recognition: 'https://example.com/rec.ort',
    charactersDictionary: 'https://example.com/dict.txt',
  },
}));

import { extractOcr, initOcr, terminateOcr } from './ocr-extractor.js';

describe('ocr-extractor (PaddleOCR)', () => {
  let tmpDir = '';

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'paddle-ocr-'));
    recognize.mockClear();
    initialize.mockClear();
    destroy.mockClear();
    isInitialized.mockReturnValue(false);
    await terminateOcr();
  });

  afterEach(async () => {
    await terminateOcr();
    if (tmpDir) await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  it('initializes PaddleOcrService and returns recognized text', async () => {
    const imagePath = path.join(tmpDir, 'sample.png');
    await fs.promises.writeFile(imagePath, Buffer.from([0x89, 0x50, 0x4e, 0x47]));

    const { content, tags } = await extractOcr(imagePath, tmpDir);

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(recognize).toHaveBeenCalledTimes(1);
    expect(content).toBe('Hello OCR');
    expect(tags).toEqual(['image', 'ocr']);
  });

  it('reuses initialized service across calls', async () => {
    const imagePath = path.join(tmpDir, 'a.png');
    await fs.promises.writeFile(imagePath, Buffer.from('img'));

    await extractOcr(imagePath, tmpDir);
    isInitialized.mockReturnValue(true);

    await extractOcr(imagePath, tmpDir);

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(recognize).toHaveBeenCalledTimes(2);
  });
});
