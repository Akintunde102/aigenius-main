import path from 'path';
import os from 'os';
import fs from 'fs';
import { Hono } from 'hono';
import { getVoiceSidecar } from '../sidecar/index.js';
import { defaultTtsVoice } from '../config/voice-env.js';
import { clientError, handleRoute } from '../utils/route-json.js';

export function createTtsRoutes(): Hono {
  const r = new Hono();

  r.post('/synthesize', (c) =>
    handleRoute(c, '[tts] POST /tts/synthesize', async () => {
      const { text, voice } = await c.req.json();

      if (!text || typeof text !== 'string') {
        return clientError(c, 'Text is required', 400);
      }

      const sidecar = getVoiceSidecar();

      if (!sidecar.isReady()) {
        return clientError(c, 'TTS service not ready', 503);
      }

      const outputDir = path.join(os.tmpdir(), 'aigenius-tts');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const outputPath = path.join(outputDir, `tts_${Date.now()}.wav`);

      const result = await sidecar.generate({
        text,
        voice: voice || defaultTtsVoice,
        outputPath,
      });

      if (!result.success || !result.path) {
        return c.json({ error: result.error || 'TTS generation failed' }, 500);
      }

      const audioBuffer = fs.readFileSync(result.path);

      try {
        fs.unlinkSync(result.path);
      } catch (e) {
        console.warn('[tts] POST /tts/synthesize: temp file cleanup failed:', e);
      }

      return new Response(audioBuffer, {
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Length': audioBuffer.length.toString(),
          'Cache-Control': 'no-cache',
        },
      });
    }),
  );

  r.get('/status', (c) =>
    handleRoute(c, '[tts] GET /tts/status', async () => {
      const sidecar = getVoiceSidecar();
      return c.json({ ready: sidecar.isReady() });
    }),
  );

  return r;
}
