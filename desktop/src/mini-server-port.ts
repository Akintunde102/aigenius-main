/**
 * Desktop mini-server (HTTP sidecar) port.
 *
 * Resolution order (first wins):
 * 1. `AIGENIUS_MINI_SERVER_PORT` — explicit override
 * 2. `DEV_SIDECAR_PORT` — set by `scripts/tilt-up.cjs` / Tilt
 * 3. Platform dev default (28001, offset from legacy 8001 per `scripts/dev-ports.cjs`)
 */
export function resolveMiniServerPort(): string {
  const raw =
    process.env.AIGENIUS_MINI_SERVER_PORT ??
    process.env.DEV_SIDECAR_PORT;
  if (raw !== undefined && String(raw).trim() !== '') {
    return String(raw).trim();
  }
  return '28001';
}

export const MINI_SERVER_PORT = resolveMiniServerPort();
