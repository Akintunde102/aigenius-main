const VERBOSE_KEY = '__aig_verbose_debug';
const AUTH_DEBUG_KEY = '__aig_auth_debug';
/** Ring buffer written when {@link isAuthDebugEnabled} is true. */
export const AUTH_DEBUG_LOG_KEY = '__aig_auth_debug_log';

/**
 * Opt-in noisy client diagnostics (chat send trace, wallet socket, access-model, etc.).
 * Enable in DevTools: `localStorage.setItem('__aig_verbose_debug', '1')`
 */
export function isClientVerboseDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(VERBOSE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Desktop auth cold-boot trace (persisted ring buffer + optional console).
 * Enable: `localStorage.setItem('__aig_auth_debug', '1')`
 * Read log: `localStorage.getItem('__aig_auth_debug_log')`
 */
export function isAuthDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const v = localStorage.getItem(AUTH_DEBUG_KEY);
    return v === '1' || v === 'verbose';
  } catch {
    return false;
  }
}

export function clientVerboseDebug(tag: string, ...args: unknown[]): void {
  if (!isClientVerboseDebugEnabled()) return;
  console.debug(`[${tag}]`, ...args);
}

export function appendAuthDebugLog(msg: string): void {
  if (!isAuthDebugEnabled()) return;
  try {
    const ts = new Date().toISOString();
    const entry = `${ts} ${msg}`;
    const prev = localStorage.getItem(AUTH_DEBUG_LOG_KEY) ?? '';
    localStorage.setItem(AUTH_DEBUG_LOG_KEY, (prev + '\n' + entry).slice(-10000));
    console.warn('[AIG-AUTH]', entry);
  } catch {
    /* never break auth over a log */
  }
}

export type ThrottledWarnBucket = { lastLogAt: number; suppressed: number };

export function createThrottledWarnBucket(): ThrottledWarnBucket {
  return { lastLogAt: 0, suppressed: 0 };
}

/** Avoid console floods when SSE/WebSocket backends restart (Tilt, API crash). */
export function warnThrottled(
  bucket: ThrottledWarnBucket,
  label: string,
  err: unknown,
  minIntervalMs = 15_000,
): void {
  const now = Date.now();
  if (now - bucket.lastLogAt < minIntervalMs) {
    bucket.suppressed += 1;
    return;
  }
  const extra =
    bucket.suppressed > 0 ? ` (${bucket.suppressed} similar errors suppressed)` : '';
  bucket.suppressed = 0;
  bucket.lastLogAt = now;
  console.warn(`${label}${extra}`, err);
}
