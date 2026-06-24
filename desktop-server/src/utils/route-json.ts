import type { Context } from 'hono';

/** 4xx/503: always `{ error: string }`. */
export function clientError(
  c: Context,
  message: string,
  status: 400 | 401 | 403 | 404 | 503 = 400,
): Response {
  return c.json({ error: message }, status);
}

/** 5xx: `{ error, stack? }` for parity with search routes. */
export function serverError(c: Context, err: unknown, logPrefix: string): Response {
  console.error(`${logPrefix}:`, err);
  return c.json(
    { error: String(err), stack: err instanceof Error ? err.stack : undefined },
    500,
  );
}

/**
 * `try` / `catch` wrapper: run work, on throw log with `logPrefix` and return 500 JSON.
 * Use for every JSON route so logging and error body shape match.
 */
export async function handleRoute(
  c: Context,
  logPrefix: string,
  work: () => Promise<Response>,
): Promise<Response> {
  try {
    return await work();
  } catch (err) {
    return serverError(c, err, logPrefix);
  }
}
