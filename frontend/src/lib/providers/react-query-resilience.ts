const NO_RETRY_STATUSES = new Set([401, 403, 404]);

export function readHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') {
    return undefined;
  }
  const candidate = error as {
    status?: unknown;
    statusCode?: unknown;
    response?: { status?: unknown };
  };
  const status = candidate.response?.status ?? candidate.status ?? candidate.statusCode;
  return typeof status === 'number' ? status : undefined;
}

function isCancelled(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('name' in error)) {
    return false;
  }
  const name = (error as { name: unknown }).name;
  return name === 'AbortError' || name === 'CancelledError';
}

/** Matches the previous default of three attempts, and stops on auth or missing routes. */
export function shouldRetryFailedRequest(failureCount: number, error: unknown): boolean {
  const status = readHttpStatus(error);
  if (status != null && NO_RETRY_STATUSES.has(status)) {
    return false;
  }
  return failureCount < 3;
}

export function shouldReportQueryError(
  error: unknown,
  meta?: { silent?: unknown },
): boolean {
  if (meta?.silent === true || isCancelled(error)) {
    return false;
  }
  const status = readHttpStatus(error);
  if (status != null && NO_RETRY_STATUSES.has(status)) {
    return false;
  }
  return true;
}
