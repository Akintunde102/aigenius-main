/**
 * Wraps a streaming response body so that a dropped connection never ends the stream.
 *
 * Every byte handed to the caller is counted. When the connection errors, stalls, or ends without
 * the server having finished the run, the reader re-attaches to the still-running server run
 * (`openReattach(bytesConsumed)`) and continues from exactly the next byte — retrying forever
 * with capped backoff. It only stops when the caller aborts, or the server no longer has the run.
 */

export const RESILIENT_STREAM_STALL_MS = 90_000;
export const RESILIENT_STREAM_RETRY_BASE_MS = 1_000;
export const RESILIENT_STREAM_RETRY_CAP_MS = 15_000;

export type ReattachOutcome =
  | { kind: 'attached'; reader: ReadableStreamDefaultReader<Uint8Array> }
  /** Server has no run for this conversation (finished and expired, or API restarted). */
  | { kind: 'gone' }
  /** Not reachable right now — keep retrying. */
  | { kind: 'retry' };

export type ResilientStreamReaderOptions = {
  initial: ReadableStreamDefaultReader<Uint8Array>;
  openReattach: (bytesConsumed: number) => Promise<ReattachOutcome>;
  signal?: AbortSignal;
  stallMs?: number;
  onReconnecting?: (info: { attempt: number }) => void;
  onReconnected?: () => void;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  waitUntilOnline?: (signal?: AbortSignal) => Promise<void>;
};

export class StreamAbortedError extends Error {
  constructor() {
    super('Request aborted');
    this.name = 'AbortError';
  }
}

export class StreamRunGoneError extends Error {
  constructor() {
    super('The connection dropped before this command finished.');
    this.name = 'StreamRunGoneError';
  }
}

export function computeResilientRetryDelayMs(attempt: number): number {
  const exponent = Math.min(Math.max(attempt - 1, 0), 4);
  const base = RESILIENT_STREAM_RETRY_BASE_MS * 2 ** exponent;
  const jitter = Math.floor(Math.random() * 500);
  return Math.min(base + jitter, RESILIENT_STREAM_RETRY_CAP_MS);
}

function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new StreamAbortedError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new StreamAbortedError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function defaultWaitUntilOnline(signal?: AbortSignal): Promise<void> {
  if (typeof navigator === 'undefined' || navigator.onLine !== false || typeof window === 'undefined') {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      window.removeEventListener('online', onOnline);
      signal?.removeEventListener('abort', onAbort);
    };
    const onOnline = () => {
      cleanup();
      resolve();
    };
    const onAbort = () => {
      cleanup();
      reject(new StreamAbortedError());
    };
    window.addEventListener('online', onOnline, { once: true });
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export class ResilientStreamReader {
  private current: ReadableStreamDefaultReader<Uint8Array>;
  private bytesConsumed = 0;
  private readonly stallMs: number;
  private readonly sleep: (ms: number, signal?: AbortSignal) => Promise<void>;
  private readonly waitUntilOnline: (signal?: AbortSignal) => Promise<void>;

  constructor(private readonly options: ResilientStreamReaderOptions) {
    this.current = options.initial;
    this.stallMs = options.stallMs ?? RESILIENT_STREAM_STALL_MS;
    this.sleep = options.sleep ?? defaultSleep;
    this.waitUntilOnline = options.waitUntilOnline ?? defaultWaitUntilOnline;
  }

  get consumedBytes(): number {
    return this.bytesConsumed;
  }

  async read(): Promise<ReadableStreamReadResult<Uint8Array>> {
    for (;;) {
      this.throwIfAborted();
      let failed = false;
      try {
        const result = await this.readWithStallGuard();
        if (!result.done) {
          this.bytesConsumed += result.value.byteLength;
          return result;
        }
        // The server always sends `[DONE]` before closing a finished run, and the caller stops
        // reading at `[DONE]`. A bare EOF therefore means the connection was cut: re-attach.
        failed = true;
      } catch (error) {
        if (this.options.signal?.aborted) {
          throw new StreamAbortedError();
        }
        failed = true;
        void error;
      }

      if (failed) {
        const outcome = await this.reconnect();
        if (outcome === 'gone') {
          throw new StreamRunGoneError();
        }
      }
    }
  }

  releaseLock(): void {
    try {
      this.current.releaseLock();
    } catch {
      /* already released */
    }
  }

  cancel(): Promise<void> {
    return this.current.cancel().catch(() => undefined);
  }

  private throwIfAborted(): void {
    if (this.options.signal?.aborted) {
      throw new StreamAbortedError();
    }
  }

  private readWithStallGuard(): Promise<ReadableStreamReadResult<Uint8Array>> {
    if (this.stallMs <= 0) {
      return this.current.read();
    }
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        void this.current.cancel().catch(() => undefined);
        reject(new Error('Stream stalled'));
      }, this.stallMs);
      this.current.read().then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (error) => {
          clearTimeout(timer);
          reject(error);
        },
      );
    });
  }

  private async reconnect(): Promise<'attached' | 'gone'> {
    let attempt = 0;
    for (;;) {
      this.throwIfAborted();
      attempt += 1;
      this.options.onReconnecting?.({ attempt });
      await this.waitUntilOnline(this.options.signal);
      try {
        const outcome = await this.options.openReattach(this.bytesConsumed);
        if (outcome.kind === 'attached') {
          this.current = outcome.reader;
          this.options.onReconnected?.();
          return 'attached';
        }
        if (outcome.kind === 'gone') {
          return 'gone';
        }
      } catch (error) {
        if (this.options.signal?.aborted) {
          throw new StreamAbortedError();
        }
        void error;
      }
      await this.sleep(computeResilientRetryDelayMs(attempt), this.options.signal);
    }
  }
}
