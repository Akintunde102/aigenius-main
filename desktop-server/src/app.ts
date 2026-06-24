import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { corsAllowedOrigins, upstreamApiUrl } from './config/server-env.js';
import { createUpstreamProxyHandler } from './utils/upstream-proxy.js';
import { createSearchRoutes } from './routes/search.routes.js';
import { createTtsRoutes } from './routes/tts.routes.js';
import { createSttRoutes } from './routes/stt.routes.js';
import { createOllamaRoutes } from './routes/ollama.routes.js';

export function createApp(): Hono {
  const app = new Hono();

  app.use(
    '*',
    cors({
      origin: corsAllowedOrigins(),
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Session-ID'],
      credentials: true,
    }),
  );

  app.route('/search', createSearchRoutes());
  app.route('/tts', createTtsRoutes());
  app.route('/stt', createSttRoutes());
  app.route('/ollama', createOllamaRoutes());

  app.get('/health', (c) => c.json({ ok: true, service: 'aigenius-desktop-server' }));

  app.all('*', createUpstreamProxyHandler(upstreamApiUrl));

  return app;
}
