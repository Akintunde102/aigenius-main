/**
 * Desktop mini-server port for renderer → sidecar HTTP (STT/TTS, audio socket).
 *
 * Resolution order (first wins):
 * 1. `NEXT_PUBLIC_MINI_SERVER_PORT` — set by Tilt / `.env`
 * 2. `NEXT_PUBLIC_DESKTOP_SIDECAR_PORT` — alias
 * 3. Platform dev default (28001)
 */
export function resolveMiniServerPort(): number {
  if (typeof window !== 'undefined' && (window as any).aigeniusDesktop?.miniServerPort) {
    const p = Number.parseInt((window as any).aigeniusDesktop.miniServerPort, 10);
    if (Number.isFinite(p) && p > 0) return p;
  }

  const raw =
    process.env.NEXT_PUBLIC_MINI_SERVER_PORT ??
    process.env.NEXT_PUBLIC_DESKTOP_SIDECAR_PORT;
  if (raw !== undefined && String(raw).trim() !== '') {
    const n = Number.parseInt(String(raw).trim(), 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 28001;
}
