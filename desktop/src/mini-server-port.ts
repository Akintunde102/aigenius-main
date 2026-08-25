import { app } from 'electron';

/** Packaged app + `build:desktop` UI expect the legacy sidecar port. */
export const PACKAGED_MINI_SERVER_PORT = '8001';
/** Tilt dev stack offset (see `scripts/dev-ports.cjs`). */
export const DEV_MINI_SERVER_PORT = '28001';

/**
 * Desktop mini-server (HTTP sidecar) port.
 *
 * Resolution order (first wins):
 * 1. `AIGENIUS_MINI_SERVER_PORT` — explicit override
 * 2. `DEV_SIDECAR_PORT` — set by `scripts/tilt-up.cjs` / Tilt
 * 3. Packaged app default (`8001`) or Tilt dev default (`28001`)
 */
export function resolveMiniServerPort(): string {
  const raw =
    process.env.AIGENIUS_MINI_SERVER_PORT ??
    process.env.DEV_SIDECAR_PORT;
  if (raw !== undefined && String(raw).trim() !== '') {
    return String(raw).trim();
  }
  if (app.isPackaged) {
    return PACKAGED_MINI_SERVER_PORT;
  }
  return DEV_MINI_SERVER_PORT;
}

export const MINI_SERVER_PORT = resolveMiniServerPort();
