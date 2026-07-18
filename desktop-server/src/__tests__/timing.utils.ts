import { performance } from 'node:perf_hooks';

export interface TimedResult<T> {
  ms: number;
  result: T;
}

/** Measure wall-clock time for sync or async work (ms, two decimal places). */
export async function timed<T>(fn: () => T | Promise<T>): Promise<TimedResult<T>> {
  const t0 = performance.now();
  const result = await fn();
  return { ms: roundMs(performance.now() - t0), result };
}

export function roundMs(ms: number): number {
  return Math.round(ms * 100) / 100;
}

export interface TimingBudget {
  label: string;
  maxMs: number;
}

export interface TimingReportRow {
  label: string;
  ms: number;
  maxMs: number;
  ok: boolean;
}

/** Assert elapsed time is within budget; returns a row for scenario summaries. */
export function assertWithinBudget(ms: number, budget: TimingBudget): TimingReportRow {
  const row: TimingReportRow = {
    label: budget.label,
    ms: roundMs(ms),
    maxMs: budget.maxMs,
    ok: ms <= budget.maxMs,
  };
  expect(ms).toBeLessThanOrEqual(budget.maxMs);
  return row;
}

/** Run `iterations` timed calls and return p50/p95/max (ms). */
export async function percentileTiming<T>(
  iterations: number,
  fn: () => T | Promise<T>,
): Promise<{ p50: number; p95: number; max: number; samples: number[] }> {
  const samples: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    const { ms } = await timed(fn);
    samples.push(ms);
  }
  samples.sort((a, b) => a - b);
  const p50 = samples[Math.floor(samples.length * 0.5)] ?? 0;
  const p95 = samples[Math.floor(samples.length * 0.95)] ?? samples[samples.length - 1] ?? 0;
  const max = samples[samples.length - 1] ?? 0;
  return { p50: roundMs(p50), p95: roundMs(p95), max: roundMs(max), samples };
}

export function formatTimingTable(rows: TimingReportRow[]): string {
  const header = ['Step', 'ms', 'budget', 'ok'].join('\t');
  const body = rows
    .map((r) => [r.label, String(r.ms), String(r.maxMs), r.ok ? 'PASS' : 'FAIL'].join('\t'))
    .join('\n');
  return `${header}\n${body}`;
}
