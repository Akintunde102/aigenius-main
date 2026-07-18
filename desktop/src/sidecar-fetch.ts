const DEFAULT_TIMEOUT_MS = parseInt(process.env.AIGENIUS_SIDECAR_FETCH_TIMEOUT_MS ?? '15000', 10);

function resolveTimeoutMs(override?: number): number {
  if (typeof override === 'number' && Number.isFinite(override) && override > 0) {
    return override;
  }
  return Number.isFinite(DEFAULT_TIMEOUT_MS) && DEFAULT_TIMEOUT_MS > 0
    ? DEFAULT_TIMEOUT_MS
    : 15_000;
}

/** Fetch from the local mini-server with a hard timeout so tools fail fast when indexing blocks the event loop. */
export async function sidecarFetch(
  input: string,
  init?: RequestInit,
  timeoutMs?: number,
): Promise<Response> {
  const ms = resolveTimeoutMs(timeoutMs);
  try {
    return await fetch(input, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(ms),
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new Error(
        `Search service did not respond within ${ms}ms (indexer may be busy). Try again shortly.`,
      );
    }
    throw err;
  }
}
