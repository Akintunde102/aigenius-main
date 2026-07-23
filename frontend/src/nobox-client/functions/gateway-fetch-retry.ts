export const GATEWAY_FETCH_DEFAULT_MAX_RETRIES = 20;
export const GATEWAY_FETCH_RETRY_BASE_MS = 1000;
export const GATEWAY_FETCH_RETRY_DELAY_CAP_MS = 15_000;
export const GATEWAY_FETCH_RETRY_BACKOFF_EXPONENT_CAP = 3;
export const GATEWAY_FETCH_RETRY_JITTER_CAP_MS = 2000;

const ABORT_ERROR_NAME = 'AbortError';

const TRANSIENT_NETWORK_PATTERN =
  /failed to fetch|network|load failed|econnreset|etimedout|econnrefused|enotfound|timeout|aborted by the client/i;

const NON_RETRYABLE_HTTP_STATUSES = new Set([400, 401, 402, 403, 404, 405, 409, 413, 422]);

export function readGatewayFetchMaxRetries(): number {
  const raw = process.env.NEXT_PUBLIC_GATEWAY_FETCH_MAX_RETRIES;
  const n = raw != null && raw !== '' ? parseInt(String(raw), 10) : GATEWAY_FETCH_DEFAULT_MAX_RETRIES;
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 50) : GATEWAY_FETCH_DEFAULT_MAX_RETRIES;
}

function isAbortError(error: unknown): boolean {
  return (error as Error | undefined)?.name === ABORT_ERROR_NAME;
}

export function isRetryableGatewayHttpStatus(status: number): boolean {
  if (!Number.isFinite(status)) {
    return false;
  }
  if (NON_RETRYABLE_HTTP_STATUSES.has(status)) {
    return false;
  }
  if (status === 408 || status === 429) {
    return true;
  }
  if (status >= 500 && status <= 599) {
    return true;
  }
  return false;
}

export function isTransientGatewayFetchError(error: unknown): boolean {
  if (!error || typeof (error as Error).message !== 'string') {
    return false;
  }
  if (isAbortError(error)) {
    return false;
  }
  return TRANSIENT_NETWORK_PATTERN.test((error as Error).message);
}

export function shouldRetryGatewayFetch(params: {
  error?: unknown;
  httpStatus?: number;
  attempt: number;
  maxAttempts: number;
}): boolean {
  const { error, httpStatus, attempt, maxAttempts } = params;
  if (attempt >= maxAttempts) {
    return false;
  }
  if (error != null) {
    if (isAbortError(error)) {
      return false;
    }
    if (isTransientGatewayFetchError(error)) {
      return true;
    }
  }
  if (httpStatus != null && isRetryableGatewayHttpStatus(httpStatus)) {
    return true;
  }
  return false;
}

export function computeGatewayFetchRetryDelayMs(failedAttemptNumber: number): number {
  const exponent = Math.min(
    Math.max(failedAttemptNumber - 1, 0),
    GATEWAY_FETCH_RETRY_BACKOFF_EXPONENT_CAP,
  );
  const baseMs = GATEWAY_FETCH_RETRY_BASE_MS * 2 ** exponent;
  const jitterUpperBound = Math.min(
    GATEWAY_FETCH_RETRY_BASE_MS * 0.5 * 2 ** exponent,
    GATEWAY_FETCH_RETRY_JITTER_CAP_MS,
  );
  const jitterMs = Math.floor(Math.random() * (jitterUpperBound + 1));
  return Math.min(baseMs + jitterMs, GATEWAY_FETCH_RETRY_DELAY_CAP_MS);
}

function sleepMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sleepMsOrAbort(ms: number, signal?: AbortSignal): Promise<void> {
  if (!signal) {
    await sleepMs(ms);
    return;
  }
  if (signal.aborted) {
    throw Object.assign(new Error('The operation was aborted'), { name: ABORT_ERROR_NAME });
  }
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', onAbort);
      reject(Object.assign(new Error('The operation was aborted'), { name: ABORT_ERROR_NAME }));
    };
    signal.addEventListener('abort', onAbort);
  });
}

export type GatewayFetchInit = RequestInit & { signal?: AbortSignal };

/**
 * POST/fetch to the gateway with retries on transient network failures and 408/429/5xx.
 */
export async function fetchGatewayWithRetries(
  fetchFn: (init: GatewayFetchInit) => Promise<Response>,
  init: GatewayFetchInit,
  options?: { maxAttempts?: number },
): Promise<Response> {
  const maxAttempts = options?.maxAttempts ?? readGatewayFetchMaxRetries();
  const { signal } = init;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetchFn(init);
      if (!response.ok && shouldRetryGatewayFetch({ httpStatus: response.status, attempt, maxAttempts })) {
        await response.body?.cancel().catch(() => undefined);
        const retryAfterMs = computeGatewayFetchRetryDelayMs(attempt);
        await sleepMsOrAbort(retryAfterMs, signal);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (!shouldRetryGatewayFetch({ error, attempt, maxAttempts })) {
        throw error;
      }
      const retryAfterMs = computeGatewayFetchRetryDelayMs(attempt);
      await sleepMsOrAbort(retryAfterMs, signal);
    }
  }

  throw lastError ?? new Error('Gateway request failed after retries');
}
