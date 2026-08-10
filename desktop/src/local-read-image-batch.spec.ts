import {
  runReadImageAnalysisBatch,
  DEFAULT_MAX_IMAGES,
  HARD_MAX_IMAGES,
} from './local-read-image-batch';
import { runReadImageAnalysis } from './local-read-image';
import { resolveLocalImagePath } from './utils/read-file/path-resolver';

jest.mock('./local-read-image', () => ({
  runReadImageAnalysis: jest.fn(),
}));

jest.mock('./utils/read-file/path-resolver', () => ({
  resolveLocalImagePath: jest.fn(),
}));

const runReadImageAnalysisMock = runReadImageAnalysis as jest.MockedFunction<
  typeof runReadImageAnalysis
>;
const resolveLocalImagePathMock = resolveLocalImagePath as jest.MockedFunction<
  typeof resolveLocalImagePath
>;

function okImage(path: string) {
  return {
    path,
    name: path.split('/').pop() ?? 'img',
    extension: 'png',
    source: 'index' as const,
    indexed: true,
    ocr_text: 'text',
    tags: ['image'],
    objects: ['person'],
    errors: [],
  };
}

describe('runReadImageAnalysisBatch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resolveLocalImagePathMock.mockImplementation(async (p: string) => ({
      ok: true,
      resolved: p,
      displayPath: p,
    }));
    runReadImageAnalysisMock.mockImplementation(async ({ filePath }) =>
      okImage(filePath ?? '/unknown'),
    );
  });

  it('analyzes multiple paths in parallel', async () => {
    const reads = [
      { path: '/home/a.png' },
      { path: '/home/b.png' },
      { path: '/home/c.png' },
    ];
    const batch = await runReadImageAnalysisBatch({ reads });

    expect(batch.results).toHaveLength(3);
    expect(batch.results.every((r) => r.status === 'ok')).toBe(true);
    expect(runReadImageAnalysisMock).toHaveBeenCalledTimes(3);
    expect(batch.batchMeta.truncated).toBe(false);
    expect(batch.batchMeta.max_images).toBe(DEFAULT_MAX_IMAGES);
  });

  it('caps at max_images default', async () => {
    const reads = Array.from({ length: 15 }, (_, i) => ({ path: `/home/img${i}.png` }));
    const batch = await runReadImageAnalysisBatch({ reads });

    expect(batch.results).toHaveLength(DEFAULT_MAX_IMAGES);
    expect(batch.batchMeta.truncated).toBe(true);
    expect(batch.batchMeta.requested).toBe(15);
  });

  it('respects custom max_images up to hard max', async () => {
    const reads = Array.from({ length: 12 }, (_, i) => ({ path: `/home/img${i}.png` }));
    const batch = await runReadImageAnalysisBatch({ reads, maxImages: 12 });

    expect(batch.results).toHaveLength(12);
    expect(batch.batchMeta.max_images).toBe(12);
  });

  it('clamps max_images to hard max', async () => {
    const reads = Array.from({ length: 25 }, (_, i) => ({ path: `/home/img${i}.png` }));
    const batch = await runReadImageAnalysisBatch({ reads, maxImages: 99 });

    expect(batch.results).toHaveLength(HARD_MAX_IMAGES);
    expect(batch.batchMeta.max_images).toBe(HARD_MAX_IMAGES);
  });

  it('returns per-image errors without failing the batch', async () => {
    resolveLocalImagePathMock.mockImplementation(async (p: string) => {
      if (p === '/bad.png') {
        return { ok: false, error: 'Error: file not found — bad.png' };
      }
      return { ok: true, resolved: p, displayPath: p };
    });
    runReadImageAnalysisMock.mockImplementation(async ({ filePath }) => {
      if (filePath === '/throw.png') {
        throw new Error('OCR failed');
      }
      return okImage(filePath ?? '');
    });

    const batch = await runReadImageAnalysisBatch({
      reads: [{ path: '/good.png' }, { path: '/bad.png' }, { path: '/throw.png' }],
    });

    expect(batch.results[0].status).toBe('ok');
    expect(batch.results[1].status).toBe('error');
    expect(batch.results[2].status).toBe('error');
    expect(batch.results[1].error).toContain('not found');
    expect(batch.results[2].error).toBe('OCR failed');
  });

  it('passes preferIndex and forceLive to each analysis', async () => {
    await runReadImageAnalysisBatch({
      reads: [{ path: '/a.png' }],
      preferIndex: false,
      forceLive: true,
    });

    expect(runReadImageAnalysisMock).toHaveBeenCalledWith(
      expect.objectContaining({ preferIndex: false, forceLive: true }),
    );
  });
});
