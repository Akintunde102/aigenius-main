import { Hono } from 'hono';
import { aigeniusSecretToken } from '../config/server-env.js';
import { clientError, handleRoute } from '../utils/route-json.js';
import { executeDesktopTool } from '../tools/desktop-tools-executor.js';

export function createToolsRoutes(): Hono {
  const r = new Hono();

  r.use('*', async (c, next) => {
    if (c.req.method === 'OPTIONS') return next();
    if (!aigeniusSecretToken) {
      return clientError(c, 'Server misconfiguration: token not set', 401);
    }
    const authHeader = c.req.header('Authorization');
    if (authHeader !== `Bearer ${aigeniusSecretToken}`) {
      return clientError(c, 'Unauthorized', 401);
    }
    return next();
  });

  r.post('/execute', (c) =>
    handleRoute(c, '[tools] POST /tools/execute', async () => {
      const body = (await c.req.json()) as { tool?: string; arguments?: Record<string, unknown> };
      if (!body?.tool || typeof body.tool !== 'string') {
        return clientError(c, 'tool is required');
      }
      const result = await executeDesktopTool(body.tool, body.arguments ?? {});
      return c.json(result);
    }),
  );

  return r;
}
