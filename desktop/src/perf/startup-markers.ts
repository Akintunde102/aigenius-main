/** Startup phase markers when `AIGENIUS_DESKTOP_PERF=1`. Emits parseable JSON on stdout. */

export const PERF_LOG_PREFIX = '[aigenius-desktop][perf]';

export type StartupPhase =
  | 'main_module_loaded'
  | 'app_when_ready'
  | 'backend_processes_ready'
  | 'ipc_handlers_registered'
  | 'window_created'
  | 'window_did_finish_load';

const processStartHr =
  typeof process.hrtime.bigint === 'function' ? process.hrtime.bigint() : null;

const marks: Array<{ phase: StartupPhase; elapsedMs: number; atIso: string }> = [];

export function isDesktopPerfEnabled(): boolean {
  return process.env.AIGENIUS_DESKTOP_PERF === '1';
}

function elapsedSinceProcessStartMs(): number {
  if (processStartHr !== null) {
    return Number(process.hrtime.bigint() - processStartHr) / 1e6;
  }
  return 0;
}

export function startupMark(phase: StartupPhase): void {
  if (!isDesktopPerfEnabled()) {
    return;
  }
  const elapsedMs = elapsedSinceProcessStartMs();
  marks.push({ phase, elapsedMs, atIso: new Date().toISOString() });
  const payload = {
    type: 'startup_mark',
    phase,
    elapsedMs: roundMs(elapsedMs),
    atIso: marks[marks.length - 1].atIso,
  };
  console.info(`${PERF_LOG_PREFIX} ${JSON.stringify(payload)}`);
}

export function startupMarkSummary(): void {
  if (!isDesktopPerfEnabled() || marks.length === 0) {
    return;
  }
  const payload = {
    type: 'startup_summary',
    marks: marks.map((m) => ({ phase: m.phase, elapsedMs: roundMs(m.elapsedMs) })),
    totalMs: roundMs(marks[marks.length - 1].elapsedMs),
  };
  console.info(`${PERF_LOG_PREFIX} ${JSON.stringify(payload)}`);
}

function roundMs(n: number): number {
  return Math.round(n * 100) / 100;
}
