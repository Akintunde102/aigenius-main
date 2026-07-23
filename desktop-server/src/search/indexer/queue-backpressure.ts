const DEFAULT_HIGH_WATER = 2_500;
const DEFAULT_BATCH = 400;
const POLL_MS = 40;

export type QueueDepthFn = () => number;

/**
 * Enqueue many paths without flooding memory — waits when pending depth exceeds high water.
 */
export async function enqueueWithBackpressure(
  paths: string[],
  pendingCount: QueueDepthFn,
  enqueueOne: (filePath: string) => void,
  opts?: { highWater?: number; batchSize?: number },
): Promise<number> {
  const highWater = opts?.highWater ?? DEFAULT_HIGH_WATER;
  const batchSize = opts?.batchSize ?? DEFAULT_BATCH;
  let queued = 0;

  for (let i = 0; i < paths.length; i += 1) {
    while (pendingCount() >= highWater) {
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    enqueueOne(paths[i]!);
    queued += 1;
    if (queued % batchSize === 0) {
      await new Promise((r) => setImmediate(r));
    }
  }
  return queued;
}
