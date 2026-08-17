/* eslint-disable @typescript-eslint/no-explicit-any */
import { ERROR_MESSAGES } from './access-model.constants.js';

/**
 * Thrown when the gateway returns a non-OK response; may include current wallet from the server.
 */
export class GatewayFetchError extends Error {
  readonly statusCode: number;
  readonly wallet?: number;

  constructor(message: string, statusCode: number, wallet?: number) {
    super(message);
    this.name = 'GatewayFetchError';
    this.statusCode = statusCode;
    this.wallet = wallet;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/** Parses Nest AllExceptionsFilter JSON: `{ statusCode, path, message: string | string[] | { message, wallet? } }` */
export function parseNestGatewayErrorBody(body: unknown): { message: string; wallet?: number } {
  if (!body || typeof body !== 'object') {
    return { message: 'Request failed' };
  }
  const b = body as Record<string, unknown>;
  const inner = b.message;
  if (typeof inner === 'string') {
    return {
      message: inner,
      wallet: typeof b.wallet === 'number' ? b.wallet : undefined,
    };
  }
  if (Array.isArray(inner)) {
    const parts = inner.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    return {
      message: parts.length > 0 ? parts.join('; ') : 'Request failed',
      wallet: typeof b.wallet === 'number' ? b.wallet : undefined,
    };
  }
  if (inner && typeof inner === 'object') {
    const m = inner as Record<string, unknown>;
    return {
      message: typeof m.message === 'string' ? m.message : 'Request failed',
      wallet: typeof m.wallet === 'number' ? m.wallet : undefined,
    };
  }
  return { message: 'Request failed' };
}

export async function parseGatewayFailedResponse(res: Response): Promise<{ message: string; wallet?: number }> {
  const text = await res.text();
  try {
    const body = JSON.parse(text) as unknown;
    return parseNestGatewayErrorBody(body);
  } catch {
    const trimmed = text.trim();
    return { message: trimmed || ERROR_MESSAGES.HTTP_ERROR(res.status) };
  }
}
