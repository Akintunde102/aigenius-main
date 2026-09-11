import fs from 'fs';
import os from 'os';
import path from 'path';
import { paddleOcrMocks } from '../../../__tests__/mocks/ppu-paddle-ocr.mock.js';
import { extractOcr, terminateOcr } from './ocr-extractor.js';

describe('ocr-extractor (PaddleOCR)', () => {
  let tmpDir = '';

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'paddle-ocr-'));
    paddleOcrMocks.recognize.mockClear();
    paddleOcrMocks.initialize.mockClear();
    paddleOcrMocks.destroy.mockClear();
    paddleOcrMocks.isInitialized.mockReturnValue(false);
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

    expect(paddleOcrMocks.initialize).toHaveBeenCalledTimes(1);
    expect(paddleOcrMocks.recognize).toHaveBeenCalledTimes(1);
    expect(content).toBe('Hello OCR');
    expect(tags).toEqual(['image', 'ocr']);
  });

  it('reuses initialized service across calls', async () => {
    const imagePath = path.join(tmpDir, 'a.png');
    await fs.promises.writeFile(imagePath, Buffer.from('img'));

    await extractOcr(imagePath, tmpDir);
    paddleOcrMocks.isInitialized.mockReturnValue(true);

    await extractOcr(imagePath, tmpDir);

    expect(paddleOcrMocks.initialize).toHaveBeenCalledTimes(1);
    expect(paddleOcrMocks.recognize).toHaveBeenCalledTimes(2);
  });
});
