import { LIST_DIRECTORY_DEFAULT_LIMIT } from './list-directory-args.utils';
import {
  scanDirectoryListing,
  type ListDirectoryScanOptions,
  type ListDirectoryScanResult,
} from './list-directory-scan';

export type ListDirectoryViaFsOptions = ListDirectoryScanOptions;

export type ListDirectoryViaFsResult = ListDirectoryScanResult;

function resolveOptions(
  limitOrOptions: number | ListDirectoryViaFsOptions,
): ListDirectoryScanOptions {
  if (typeof limitOrOptions === 'number') {
    return { limit: limitOrOptions, summaryOnly: false };
  }
  return {
    limit: typeof limitOrOptions.limit === 'number' ? limitOrOptions.limit : LIST_DIRECTORY_DEFAULT_LIMIT,
    summaryOnly: !!limitOrOptions.summaryOnly,
    pattern: limitOrOptions.pattern,
    extensions: limitOrOptions.extensions,
    recursive: limitOrOptions.recursive,
    scanMax: limitOrOptions.scanMax,
  };
}

/**
 * List a directory via Node fs APIs (no shell spawn).
 * Streams entries with `fs.opendir` so the scan cap is applied before the full
 * directory table is loaded into memory.
 */
export async function listDirectoryViaFs(
  dirPath: string,
  limitOrOptions: number | ListDirectoryViaFsOptions = LIST_DIRECTORY_DEFAULT_LIMIT,
): Promise<ListDirectoryViaFsResult> {
  return scanDirectoryListing(dirPath, resolveOptions(limitOrOptions));
}
