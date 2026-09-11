import { DESKTOP_UI_SCHEME, shouldUseDesktopUiCustomProtocol } from './desktop-ui-mode';

function parseOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

/**
 * Origins the mini-server must allow for browser `fetch` / XHR from the desktop renderer.
 * Packaged builds using `aigenius://app` are not loopback HTTP — they need an explicit entry.
 */
export function resolveMiniServerCorsOrigins(frontendPort: string): string {
  const origins = new Set(parseOrigins(process.env.AIGENIUS_DESKTOP_CORS_ORIGINS));

  origins.add(`http://localhost:${frontendPort}`);
  origins.add(`http://127.0.0.1:${frontendPort}`);

  if (shouldUseDesktopUiCustomProtocol()) {
    origins.add(`${DESKTOP_UI_SCHEME}://app`);
  }

  return [...origins].join(',');
}
