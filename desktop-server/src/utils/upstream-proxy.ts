import type { Context } from 'hono';
import { stripHopByHopRequestHeaders } from './hop-by-hop.js';

export function createUpstreamProxyHandler(upstreamBaseUrl: string) {
  return async (c: Context) => {
    const url = new URL(c.req.url);
    const upstream = new URL(upstreamBaseUrl);
    url.protocol = upstream.protocol;
    url.host = upstream.host;
    url.port = upstream.port;

    const originalReq = c.req.raw;
    const headers = new Headers(originalReq.headers);
    headers.delete('host');
    stripHopByHopRequestHeaders(headers);

    console.info(
      `[proxy] ${originalReq.method} ${url.pathname}${url.search} -> ${upstream.origin}${url.pathname}${url.search}`,
    );

    const proxyReq = new Request(url.toString(), {
      method: originalReq.method,
      headers,
      body: originalReq.body,
      redirect: 'manual',
      ...(originalReq.body ? { duplex: 'half' } : {}),
    } as RequestInit);

    try {
      const res = await fetch(proxyReq);
      const mutableHeaders = new Headers(res.headers);
      return new Response(res.body, {
        status: res.status,
        statusText: res.statusText,
        headers: mutableHeaders,
      });
    } catch (err) {
      console.error('[proxy-error]', err);
      return c.json({ error: 'Desktop proxy failed', details: String(err) }, 502);
    }
  };
}
