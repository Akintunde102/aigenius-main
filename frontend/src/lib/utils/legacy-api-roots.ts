/** Legacy dev defaults that must not be used for Nest OAuth (see `scripts/dev-ports.cjs`). */
const BLOCKED_AUTH_API_ROOTS = new Set([
  'http://localhost:8000',
  'http://127.0.0.1:8000',
  'http://localhost:8001',
  'http://127.0.0.1:8001',
  'http://localhost:28001',
  'http://127.0.0.1:28001',
]);

const BLOCKED_AUTH_PORTS = new Set(['8000', '8001', '28001']);

export function normalizeApiRootUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

/** True when the URL points at a legacy default or desktop sidecar — not the Nest API. */
export function isLegacyOrSidecarApiRoot(url: string): boolean {
  const trimmed = normalizeApiRootUrl(url);
  if (!trimmed) {
    return true;
  }
  if (BLOCKED_AUTH_API_ROOTS.has(trimmed)) {
    return true;
  }
  try {
    const parsed = new URL(trimmed);
    const port = parsed.port || (parsed.protocol === 'https:' ? '443' : '80');
    return BLOCKED_AUTH_PORTS.has(port);
  } catch {
    return true;
  }
}

export function shouldPersistDesktopApiRoot(apiRoot: string): boolean {
  return !isLegacyOrSidecarApiRoot(apiRoot);
}
