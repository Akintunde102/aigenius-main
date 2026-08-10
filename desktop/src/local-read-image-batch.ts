import { resolveLocalImagePath } from './utils/read-file/path-resolver';
import {
  runReadImageAnalysis,
  type ReadImageAnalysisResult,
} from './local-read-image';

export const DEFAULT_MAX_IMAGES = 10;
export const HARD_MAX_IMAGES = 20;
export const READ_IMAGE_PARALLEL = 4;
export const OCR_SNIPPET_CHARS = 2000;

export type ReadImageBatchItem = {
  path: string;
  status: 'ok' | 'error';
  data?: ReadImageAnalysisResult;
  error?: string;
};

export type ReadImageBatchResult = {
  results: ReadImageBatchItem[];
  batchMeta: {
    isBatch: true;
    requested: number;
    analyzed: number;
    max_images: number;
    truncated: boolean;
  };
};

export type RunReadImageBatchInput = {
  reads: { path: string }[];
  preferIndex?: boolean;
  forceLive?: boolean;
  maxImages?: number;
};

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) break;
      results[i] = await fn(items[i], i);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return results;
}

function clampMaxImages(maxImages: number | undefined): number {
  const raw =
    typeof maxImages === 'number' && Number.isFinite(maxImages)
      ? Math.floor(maxImages)
      : DEFAULT_MAX_IMAGES;
  return Math.min(HARD_MAX_IMAGES, Math.max(1, raw));
}

/** Analyze multiple local images in parallel (index-first unless force_live). */
export async function runReadImageAnalysisBatch(
  input: RunReadImageBatchInput,
): Promise<ReadImageBatchResult> {
  const requested = input.reads.length;
  const max_images = clampMaxImages(input.maxImages);
  const toAnalyze = input.reads.slice(0, max_images);
  const truncated = requested > max_images;

  const results = await mapWithConcurrency(
    toAnalyze,
    READ_IMAGE_PARALLEL,
    async (item): Promise<ReadImageBatchItem> => {
      const inputPath = item.path?.trim() ?? '';
      if (!inputPath) {
        return { path: item.path ?? '', status: 'error', error: 'path is required' };
      }

      const pathResult = await resolveLocalImagePath(inputPath);
      if (!pathResult.ok) {
        return { path: inputPath, status: 'error', error: pathResult.error };
      }

      try {
        const data = await runReadImageAnalysis({
          filePath: pathResult.resolved,
          preferIndex: input.preferIndex,
          forceLive: input.forceLive,
        });
        return { path: inputPath, status: 'ok', data };
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'read image failed';
        return { path: inputPath, status: 'error', error: msg };
      }
    },
  );

  return {
    results,
    batchMeta: {
      isBatch: true,
      requested,
      analyzed: results.length,
      max_images,
      truncated,
    },
  };
}
