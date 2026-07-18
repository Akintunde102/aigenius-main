export type BatchCallback<T> = (batch: T[]) => void | Promise<void>;

/**
 * Creates a throttled batch queue.
 * Items are accumulated until either `batchSize` is reached or `intervalMs` elapses,
 * then flushed via `onBatch`. Prevents hammering SQLite on rapid FS events.
 */
export function createIndexQueue<T>(
  onBatch: BatchCallback<T>,
  batchSize = 10,
  intervalMs = 2000,
): {
  push: (item: T) => void;
  flush: () => Promise<void>;
  stop: () => void;
  pendingCount: () => number;
} {
  let buffer: T[] = [];
  let timer: NodeJS.Timeout | null = null;
  let processing = false;

  async function flush(): Promise<void> {
    if (buffer.length === 0) return;
    const batch = buffer.splice(0, buffer.length);
    processing = true;
    try {
      await onBatch(batch);
    } catch (err) {
      console.error('[index-queue] batch callback error:', err);
    } finally {
      processing = false;
    }
  }

  function scheduleFlush(): void {
    if (timer !== null) return;
    timer = setTimeout(async () => {
      timer = null;
      await flush();
    }, intervalMs);
  }

  function push(item: T): void {
    buffer.push(item);
    if (buffer.length >= batchSize) {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      void flush();
    } else {
      scheduleFlush();
    }
  }

  function stop(): void {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return { push, flush, stop, pendingCount: () => buffer.length + (processing ? 1 : 0) };
}
