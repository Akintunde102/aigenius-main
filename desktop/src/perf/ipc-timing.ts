import type { IpcMainInvokeEvent } from 'electron';

import { PERF_LOG_PREFIX, isDesktopPerfEnabled } from './startup-markers';

type IpcHandler = (event: IpcMainInvokeEvent, ...args: unknown[]) => unknown | Promise<unknown>;

const samples: Array<{ channel: string; durationMs: number }> = [];
const MAX_SAMPLES = 5000;

export function recordIpcSample(channel: string, durationMs: number): void {
  if (samples.length >= MAX_SAMPLES) {
    samples.shift();
  }
  samples.push({ channel, durationMs });
}

export function wrapIpcHandler(channel: string, handler: IpcHandler): IpcHandler {
  return async (event, ...args) => {
    const start =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    try {
      return await handler(event, ...args);
    } finally {
      const end =
        typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();
      const durationMs = end - start;
      recordIpcSample(channel, durationMs);
      if (isDesktopPerfEnabled() && durationMs >= 50) {
        console.info(
          `${PERF_LOG_PREFIX} ${JSON.stringify({
            type: 'ipc_slow',
            channel,
            durationMs: roundMs(durationMs),
          })}`,
        );
      }
    }
  };
}

export function ipcTimingSummary(): Record<
  string,
  { count: number; meanMs: number; p50Ms: number; p95Ms: number; maxMs: number }
> {
  const byChannel = new Map<string, number[]>();
  for (const { channel, durationMs } of samples) {
    const list = byChannel.get(channel) ?? [];
    list.push(durationMs);
    byChannel.set(channel, list);
  }
  const summary: Record<
    string,
    { count: number; meanMs: number; p50Ms: number; p95Ms: number; maxMs: number }
  > = {};
  for (const [channel, durations] of byChannel) {
    const sorted = [...durations].sort((a, b) => a - b);
    const count = sorted.length;
    const sum = sorted.reduce((acc, n) => acc + n, 0);
    summary[channel] = {
      count,
      meanMs: roundMs(sum / count),
      p50Ms: roundMs(sorted[Math.floor(count * 0.5)] ?? 0),
      p95Ms: roundMs(sorted[Math.floor(count * 0.95)] ?? sorted[count - 1] ?? 0),
      maxMs: roundMs(sorted[count - 1] ?? 0),
    };
  }
  return summary;
}

export function logIpcTimingSummary(): void {
  const summary = ipcTimingSummary();
  if (Object.keys(summary).length === 0) {
    return;
  }
  console.info(
    `${PERF_LOG_PREFIX} ${JSON.stringify({
      type: 'ipc_summary',
      channels: summary,
    })}`,
  );
}

function roundMs(n: number): number {
  return Math.round(n * 100) / 100;
}
