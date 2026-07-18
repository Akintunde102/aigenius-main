import { DEV_LOOPBACK_HOST } from './loopback-host';

/**
 * The desktop shell opens Next at `http://localhost:<FRONTEND_PORT>`. OAuth redirects
 * may still arrive as `127.0.0.1` or `::1` — normalize those to `localhost` so
 * `localStorage` and cookies stay on one origin.
 */
export function normalizeLoopbackToShellOrigin(
  urlString: string,
  frontendPort: string,
): string {
  try {
    const u = new URL(urlString);
    if (u.protocol !== 'http:') {
      return urlString;
    }
    const hl = u.hostname.toLowerCase();
    const isLoopbackAlias =
      hl === 'localhost' ||
      hl === '127.0.0.1' ||
      u.hostname === '::1' ||
      u.hostname === '[::1]';
    if (!isLoopbackAlias) {
      return urlString;
    }
    if (u.port !== frontendPort) {
      return urlString;
    }
    if (hl === DEV_LOOPBACK_HOST) {
      return urlString;
    }
    u.hostname = DEV_LOOPBACK_HOST;
    return u.toString();
  } catch {
    return urlString;
  }
}
