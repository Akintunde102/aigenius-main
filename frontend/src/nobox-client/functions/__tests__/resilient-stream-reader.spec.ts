import {
  ResilientStreamReader,
  ReattachOutcome,
  computeResilientRetryDelayMs,
  StreamRunGoneError,
  StreamAbortedError,
} from '../resilient-stream-reader';

describe('ResilientStreamReader', () => {
  function makeMockReader(chunks: string[]): ReadableStreamDefaultReader<Uint8Array> {
    const encoder = new TextEncoder();
    let index = 0;
    return {
      read: jest.fn(async () => {
        if (index < chunks.length) {
          const val = encoder.encode(chunks[index++]);
          return { done: false, value: val };
        }
        return { done: true, value: undefined };
      }),
      releaseLock: jest.fn(),
      cancel: jest.fn(async () => undefined),
      closed: Promise.resolve(undefined),
    } as unknown as ReadableStreamDefaultReader<Uint8Array>;
  }

  it('computes capped backoff delays with jitter', () => {
    const d1 = computeResilientRetryDelayMs(1);
    expect(d1).toBeGreaterThanOrEqual(1000);
    expect(d1).toBeLessThanOrEqual(2000);

    const d10 = computeResilientRetryDelayMs(10);
    expect(d10).toBeLessThanOrEqual(15500);
  });

  it('reads seamlessly across stream disconnects and re-attaches', async () => {
    const firstReader = makeMockReader(['hello ']);
    const secondReader = makeMockReader(['world']);

    let reattachCalled = false;
    let byteOffsetRequested = 0;

    const openReattach = jest.fn(async (offset: number): Promise<ReattachOutcome> => {
      reattachCalled = true;
      byteOffsetRequested = offset;
      return { kind: 'attached', reader: secondReader };
    });

    const resilient = new ResilientStreamReader({
      initial: firstReader,
      openReattach,
      stallMs: 0,
      sleep: jest.fn(async () => undefined),
    });

    const r1 = await resilient.read();
    expect(new TextDecoder().decode(r1.value)).toBe('hello ');

    // The second read on firstReader returns done (simulating a cut socket before [DONE])
    // ResilientStreamReader triggers reconnect and reads from secondReader
    const r2 = await resilient.read();
    expect(new TextDecoder().decode(r2.value)).toBe('world');
    expect(reattachCalled).toBe(true);
    expect(byteOffsetRequested).toBe(6); // 'hello ' has 6 bytes
  });

  it('throws StreamRunGoneError if server confirms the run is gone', async () => {
    const firstReader = makeMockReader([]); // immediately cuts

    const openReattach = jest.fn(async (): Promise<ReattachOutcome> => {
      return { kind: 'gone' };
    });

    const resilient = new ResilientStreamReader({
      initial: firstReader,
      openReattach,
      stallMs: 0,
      sleep: jest.fn(async () => undefined),
    });

    await expect(resilient.read()).rejects.toThrow(StreamRunGoneError);
  });

  it('respects client explicit abort', async () => {
    const controller = new AbortController();
    const firstReader = makeMockReader([]);

    controller.abort();

    const resilient = new ResilientStreamReader({
      initial: firstReader,
      openReattach: jest.fn(),
      signal: controller.signal,
      stallMs: 0,
      sleep: jest.fn(async () => undefined),
    });

    await expect(resilient.read()).rejects.toThrow(StreamAbortedError);
  });
});
