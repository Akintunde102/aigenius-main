export type ClientCrashPayload = {
  name: string;
  message: string;
  source: string;
  stack?: string;
  path?: string;
  digest?: string;
  componentStack?: string;
};

const EMAIL = /[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi;
const SECRET_ASSIGNMENT = /\b(bearer|token|api[_-]?key|authorization|password)\b\s*[:=]\s*\S+/gi;
const KEY_PREFIX = /\b(?:sk|pk|phc|rk)_[A-Za-z0-9]+\b/g;
const URL_IN_TEXT = /https?:\/\/[^\s)'"]+/g;

export function redactCrashText(value: string, max: number): string {
  return value
    .replace(URL_IN_TEXT, (url) => {
      try {
        const parsed = new URL(url);
        return `${parsed.origin}${parsed.pathname}`;
      } catch {
        return '[url]';
      }
    })
    .replace(EMAIL, '[email]')
    .replace(SECRET_ASSIGNMENT, '$1=[redacted]')
    .replace(KEY_PREFIX, '[key]')
    .slice(0, max);
}

export function pagePathForCrash(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return window.location.pathname.slice(0, 200);
}

export function buildClientCrashPayload(
  error: unknown,
  source: string,
  extra?: { componentStack?: string | null; digest?: string },
): ClientCrashPayload {
  const err = error instanceof Error
    ? error
    : new Error(typeof error === 'string' && error.trim() ? error : 'Unknown client error');

  const stack = redactCrashText(err.stack ?? '', 4000);
  const componentStack = redactCrashText(extra?.componentStack ?? '', 1500);
  const digest = redactCrashText(extra?.digest ?? '', 80);
  const path = pagePathForCrash();

  return {
    name: redactCrashText(err.name || 'Error', 80),
    message: redactCrashText(err.message || 'Unknown client error', 500),
    source: redactCrashText(source || 'client', 40),
    ...(stack ? { stack } : {}),
    ...(path ? { path } : {}),
    ...(digest ? { digest } : {}),
    ...(componentStack ? { componentStack } : {}),
  };
}
