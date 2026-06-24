/**
 * The desktop shell always opens Next at `http://127.0.0.1:<FRONTEND_PORT>`. Backend OAuth
 * redirects often use `FRONTEND_URL` with `localhost`, which is a different origin: `localStorage`
 * and cookies do not carry over, so the user appears logged out on every app restart.
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
    const isAlias =
      hl === 'localhost' ||
      u.hostname === '::1' ||
      u.hostname === '[::1]';
    if (!isAlias) {
      return urlString;
    }
    if (u.port !== frontendPort) {
      return urlString;
    }
    u.hostname = '127.0.0.1';
    return u.toString();
  } catch {
    return urlString;
  }
}
