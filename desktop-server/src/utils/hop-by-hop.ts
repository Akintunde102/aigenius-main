/** Undici rejects outbound `fetch()` if hop-by-hop headers from the client are forwarded. */
export const HOP_BY_HOP_REQUEST_HEADERS = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
] as const;

export function stripHopByHopRequestHeaders(headers: Headers): void {
  for (const name of HOP_BY_HOP_REQUEST_HEADERS) {
    headers.delete(name);
  }
}
