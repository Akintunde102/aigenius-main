import { randomUUID } from 'crypto';

const enabled = process.env.AIGENIUS_VOICE_OBS === '1';

/** Structured logs for desktop STT diagnostics (enable with AIGENIUS_VOICE_OBS=1). */
export function voiceObs(event: string, meta: Record<string, unknown>): void {
  if (!enabled) return;
  const tsMs = Date.now();
  console.info(
    '[voice-obs]',
    JSON.stringify({
      ts: new Date(tsMs).toISOString(),
      tsMs,
      eventId: randomUUID(),
      scope: 'desktop-stt',
      event,
      ...meta,
    }),
  );
}
