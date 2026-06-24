/**
 * Opt-in voice pipeline tracing (STT / TTS / conversational / sentence streaming).
 *
 * **Enable (pick one):**
 * - Build-time: set `NEXT_PUBLIC_AIGENIUS_VOICE_OBS=1` in `.env.local` and restart Next.
 * - Runtime (no rebuild): DevTools → Application → Local Storage → set key `aigenius_voice_obs` = `1`, then refresh.
 *
 * **Each log line includes:** `eventId` (unique), `ts` / `tsMs` (wall clock), `seq` (monotonic in this tab),
 * `traceSessionId` (grouping; reset via {@link resetVoiceTraceSession} on audio-mode boundaries).
 *
 * **Console:** filter by `[voice-obs]` (structured one-line JSON after the prefix).
 *
 * **Backend (/audio namespace):** set `AIGENIUS_VOICE_OBS=1` for the Nest process; logs include `eventId`,
 * `tsMs`, `seq`, `traceSessionId`, `clientId`.
 *
 * **Desktop sidecar (8001):** set `AIGENIUS_VOICE_OBS=1`; logs include `eventId`, `tsMs`, `chunkSeq` where relevant.
 */
const LS_KEY = 'aigenius_voice_obs';

/** Monotonic counter for sort order within a tab (survives clock skew vs `tsMs` alone). */
let voiceObsSeq = 0;

/** Correlates events until {@link resetVoiceTraceSession} runs (e.g. new phone-mode session). */
let traceSessionId: string | null = null;

function nextRandomId(): string {
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === 'function') {
    return c.randomUUID();
  }
  return `v-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function ensureTraceSessionId(): string {
  if (!traceSessionId) {
    traceSessionId = nextRandomId();
  }
  return traceSessionId;
}

export function isVoiceObservabilityEnabled(): boolean {
  if (typeof window !== 'undefined') {
    try {
      if (window.localStorage?.getItem(LS_KEY) === '1') return true;
    } catch {
      /* storage blocked */
    }
  }
  return process.env.NEXT_PUBLIC_AIGENIUS_VOICE_OBS === '1';
}

/** Start a new chronological group (call when entering/leaving full audio mode, or between repros). */
export function resetVoiceTraceSession(): void {
  traceSessionId = null;
}

export function voiceObs(
  scope: string,
  event: string,
  data?: Record<string, unknown>,
): void {
  if (!isVoiceObservabilityEnabled()) return;
  const tsMs = Date.now();
  voiceObsSeq += 1;
  const payload = {
    ts: new Date(tsMs).toISOString(),
    tsMs,
    seq: voiceObsSeq,
    eventId: nextRandomId(),
    traceSessionId: ensureTraceSessionId(),
    scope,
    event,
    ...data,
  };
  console.info('[voice-obs]', JSON.stringify(payload));
}
