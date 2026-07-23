import os from 'os';

/** Fraction of logical CPU cores used for extraction worker threads (rounded). */
export const SEARCH_WORKER_CPU_FRACTION = 0.4;

const MIN_WORKERS = 1;

/**
 * Worker pool size: 40% of logical CPUs (rounded), minimum 1.
 * Override with `AIGENIUS_SEARCH_WORKERS` when set to a positive integer.
 */
export function resolveSearchWorkerCount(explicit?: string | number | null): number {
  if (explicit !== undefined && explicit !== null && String(explicit).trim() !== '') {
    const parsed = typeof explicit === 'number'
      ? explicit
      : Number.parseInt(String(explicit).trim(), 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }
  }

  const cores = os.cpus().length;
  return Math.max(MIN_WORKERS, Math.round(cores * SEARCH_WORKER_CPU_FRACTION));
}

export function resolveSearchWorkerCountFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): number {
  return resolveSearchWorkerCount(env.AIGENIUS_SEARCH_WORKERS);
}
