import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { readImageAnalysis } from './read-image.js';
import { routeExtraction } from './indexer/extractors/router.js';
import { getFileIndexRow } from './db/queries.js';

jest.mock('./indexer/extractors/router.js', () => ({
  routeExtraction: jest.fn(),
}));

jest.mock('./db/queries.js', () => ({
  getFileIndexRow: jest.fn(),
}));

jest.mock('./fetch-image-url.js', () => ({
  fetchImageToTempFile: jest.fn(),
}));

const routeExtractionMock = routeExtraction as jest.MockedFunction<typeof routeExtraction>;
const getFileIndexRowMock = getFileIndexRow as jest.MockedFunction<typeof getFileIndexRow>;

describe('readImageAnalysis', () => {
  let tmpFile: string;
  const modelsDir = '/fake/models';
  const db = {} as any;

  beforeEach(async () => {
    jest.clearAllMocks();
    tmpFile = path.join(os.tmpdir(), `read-image-test-${Date.now()}.png`);
    await fs.writeFile(tmpFile, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  });

  afterEach(async () => {
    await fs.unlink(tmpFile).catch(() => undefined);
  });

  it('returns indexed OCR when mtime matches', async () => {
    const stat = await fs.stat(tmpFile);
    getFileIndexRowMock.mockReturnValue({
      path: tmpFile,
      name: 'read-image-test.png',
      mtime: Math.floor(stat.mtimeMs),
      extension: 'png',
      tags: 'image ocr cat',
      content: 'Hello from index',
      contentTruncated: false,
    });

    const result = await readImageAnalysis({
      filePath: tmpFile,
      modelsDir,
      db,
      preferIndex: true,
    });

    expect(result.source).toBe('index');
    expect(result.indexed).toBe(true);
    expect(result.ocr_text).toBe('Hello from index');
    expect(result.objects).toContain('cat');
    expect(routeExtractionMock).not.toHaveBeenCalled();
  });

  it('falls back to live extraction when index is stale', async () => {
    getFileIndexRowMock.mockReturnValue({
      path: tmpFile,
      name: 'read-image-test.png',
      mtime: 1,
      extension: 'png',
      tags: 'image ocr old',
      content: 'stale',
      contentTruncated: false,
    });
    routeExtractionMock.mockResolvedValue({
      content: 'live ocr',
      tags: ['image', 'ocr', 'dog'],
    });

    const result = await readImageAnalysis({
      filePath: tmpFile,
      modelsDir,
      db,
      preferIndex: true,
    });

    expect(result.source).toBe('live');
    expect(result.ocr_text).toBe('live ocr');
    expect(result.objects).toContain('dog');
    expect(routeExtractionMock).toHaveBeenCalledWith(tmpFile, modelsDir, false);
  });

  it('rejects non-image extensions', async () => {
    const txt = path.join(os.tmpdir(), `read-image-test-${Date.now()}.txt`);
    await fs.writeFile(txt, 'hello');
    await expect(
      readImageAnalysis({ filePath: txt, modelsDir }),
    ).rejects.toThrow(/Not an image file/);
    await fs.unlink(txt);
  });

  it('requires path or url', async () => {
    await expect(readImageAnalysis({ modelsDir })).rejects.toThrow(/path or url is required/);
  });
});
