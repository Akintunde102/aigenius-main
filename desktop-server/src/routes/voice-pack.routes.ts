import { Hono } from 'hono';
import { handleRoute } from '../utils/route-json.js';
import { ensureVoicePackDownloaded, getVoicePackStatus } from '../voice/voice-pack.js';

export function createVoicePackRoutes(): Hono {
  const r = new Hono();

  r.get('/status', (c) =>
    handleRoute(c, '[voice-pack] GET /voice/pack/status', async () => {
      return c.json(getVoicePackStatus());
    }),
  );

  r.post('/download', (c) =>
    handleRoute(c, '[voice-pack] POST /voice/pack/download', async () => {
      await ensureVoicePackDownloaded();
      return c.json(getVoicePackStatus());
    }),
  );

  return r;
}
