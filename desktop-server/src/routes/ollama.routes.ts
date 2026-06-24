import { Hono } from 'hono';
import { OllamaRelayClient } from '../sidecar/ollama-relay.client.js';

export function createOllamaRoutes(): Hono {
  const router = new Hono();

  // POST /ollama/connect
  router.post('/connect', async (c) => {
    try {
      const body = await c.req.json();
      const { token, userId } = body;

      if (!token) {
        return c.json({ ok: false, error: 'Missing token' }, 400);
      }

      await OllamaRelayClient.getInstance().connect(token, userId);

      return c.json({ ok: true, connected: OllamaRelayClient.getInstance().isConnected() });
    } catch (e: any) {
      return c.json({ ok: false, error: e.message || 'Invalid request body' }, 400);
    }
  });

  // GET /ollama/status
  router.get('/status', (c) => {
    const client = OllamaRelayClient.getInstance();
    return c.json({
      ok: true,
      connected: client.isConnected(),
      latencyMs: client.getLatency(),
    });
  });

  // POST /ollama/sync
  router.post('/sync', async (c) => {
    await OllamaRelayClient.getInstance().syncModels();
    return c.json({ ok: true });
  });

  return router;
}
