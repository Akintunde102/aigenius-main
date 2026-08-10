import type { BrowserWindow } from 'electron';

import { ipcTimingSummary, logIpcTimingSummary } from './ipc-timing';
import { PERF_LOG_PREFIX, startupMarkSummary } from './startup-markers';

const BENCHMARK_ITERATIONS = 30;
const WARMUP_ITERATIONS = 3;

export function isDesktopPerfBenchmarkEnabled(): boolean {
  return process.env.AIGENIUS_DESKTOP_PERF_BENCHMARK === '1';
}

async function runRendererIpcBenchmark(win: BrowserWindow): Promise<Record<string, unknown>> {
  const script = `(async () => {
    const bridge = window.aigeniusDesktop;
    if (!bridge) throw new Error('aigeniusDesktop bridge missing');
    const runners = [
      { channel: 'get-chat-runtime-context', fn: () => bridge.getChatRuntimeContext() },
      { channel: 'get-local-search-index-state', fn: () => bridge.getLocalSearchIndexState() },
      { channel: 'search:status', fn: () => bridge.searchStatus() },
    ];
    const results = {};
    for (const { channel, fn } of runners) {
      for (let i = 0; i < ${WARMUP_ITERATIONS}; i++) await fn();
      const samples = [];
      for (let i = 0; i < ${BENCHMARK_ITERATIONS}; i++) {
        const start = performance.now();
        await fn();
        samples.push(performance.now() - start);
      }
      samples.sort((a, b) => a - b);
      const count = samples.length;
      const sum = samples.reduce((a, b) => a + b, 0);
      results[channel] = {
        count,
        meanMs: Math.round((sum / count) * 100) / 100,
        p50Ms: Math.round(samples[Math.floor(count * 0.5)] * 100) / 100,
        p95Ms: Math.round(samples[Math.floor(count * 0.95)] * 100) / 100,
        maxMs: Math.round(samples[count - 1] * 100) / 100,
      };
    }
    return results;
  })()`;

  return (await win.webContents.executeJavaScript(script, true)) as Record<string, unknown>;
}

/** Renderer IPC round-trip benchmark after shell load; prints summaries. */
export async function maybeRunPerfBenchmark(win: BrowserWindow): Promise<void> {
  if (!isDesktopPerfBenchmarkEnabled()) {
    return;
  }

  const rendererChannels = await runRendererIpcBenchmark(win);

  startupMarkSummary();
  logIpcTimingSummary();

  console.info(
    `${PERF_LOG_PREFIX} ${JSON.stringify({
      type: 'ipc_benchmark',
      rendererRoundTrip: rendererChannels,
      mainProcessHandler: ipcTimingSummary(),
    })}`,
  );
}
