/**
 * Next.js UI port for the Electron shell.
 *
 * Resolution order (first wins):
 * 1. `AIGENIUS_FRONTEND_PORT` — explicit desktop override
 * 2. `DEV_WEB_PORT` — set by `scripts/tilt-up.cjs` / Tilt (`DEV_WEB_PORT` default 23001)
 * 3. `PORT` — Next dev when co-located with the web process
 * 4. Platform dev default (23001, offset from legacy 3001 per `scripts/dev-ports.cjs`)
 */
export function resolveFrontendPort(): string {
  const raw =
    process.env.AIGENIUS_FRONTEND_PORT ??
    process.env.DEV_WEB_PORT ??
    process.env.PORT;
  if (raw !== undefined && String(raw).trim() !== '') {
    return String(raw).trim();
  }
  return '23001';
}
