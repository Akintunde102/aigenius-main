import { Hono } from 'hono';
import { clientError, handleRoute } from '../utils/route-json.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface PreviewEntry {
  html: string;
  title?: string;
  createdAt: number;
}

const PREVIEW_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const PREVIEW_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const previewStore = new Map<string, PreviewEntry>();

function isSafePreviewId(id: string): boolean {
  return PREVIEW_ID_RE.test(id);
}

function resolvePreviewPort(port: unknown): number {
  if (typeof port === 'number' && Number.isInteger(port) && port > 0 && port < 65536) {
    return port;
  }
  return 58421;
}

function purgeExpiredPreviews(): void {
  const now = Date.now();
  for (const [id, entry] of previewStore.entries()) {
    if (now - entry.createdAt > PREVIEW_TTL_MS) {
      previewStore.delete(id);
    }
  }
}

export function createPreviewRoutes(): Hono {
  const r = new Hono();

  // Store a draft HTML string for local preview
  r.post('/store', (c) =>
    handleRoute(c, '[preview] POST /preview/store', async () => {
      purgeExpiredPreviews();
      const body = (await c.req.json()) as { id?: string; html?: string; title?: string };

      if (!body.html || typeof body.html !== 'string' || !body.html.trim()) {
        return clientError(c, 'html is required and must be a non-empty string');
      }

      const requestedId = body.id?.trim();
      if (requestedId && !isSafePreviewId(requestedId)) {
        return clientError(c, 'id may only contain letters, numbers, hyphens, and underscores');
      }
      const id = requestedId || `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      previewStore.set(id, {
        html: body.html,
        title: body.title,
        createdAt: Date.now(),
      });

      return c.json({
        success: true,
        id,
        previewPath: `/preview/${id}`,
      });
    }),
  );

  // Open the local preview in the user's default external browser
  r.post('/open', (c) =>
    handleRoute(c, '[preview] POST /preview/open', async () => {
      const body = (await c.req.json()) as { id?: string; port?: number };
      const id = body.id?.trim();

      if (!id || !isSafePreviewId(id) || !previewStore.has(id)) {
        return clientError(c, 'Preview draft not found or expired', 404);
      }

      const port = resolvePreviewPort(body.port);
      const url = `http://127.0.0.1:${port}/preview/${id}`;

      // Open in default OS browser
      try {
        const cmd =
          process.platform === 'win32'
            ? `start "" "${url}"`
            : process.platform === 'darwin'
              ? `open "${url}"`
              : `xdg-open "${url}"`;
        await execAsync(cmd);
      } catch (err: unknown) {
        console.warn('[preview] Could not automatically open browser:', err);
      }

      return c.json({ success: true, url });
    }),
  );

  // Serve the preview HTML directly to browser or iframe
  r.get('/:id', (c) => {
    const id = c.req.param('id');
    const entry = previewStore.get(id);

    if (!entry) {
      return c.html(
        `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Preview Expired</title><style>body{font-family:sans-serif;padding:2rem;text-align:center;color:#666;}</style></head>
<body><h2>Draft Preview Expired or Not Found</h2><p>This local preview is no longer available. Re-run or preview the draft from AIGenius chat.</p></body>
</html>`,
        404,
      );
    }

    c.header('Content-Type', 'text/html; charset=utf-8');
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-AIGenius-Preview', 'local-draft');
    return c.html(entry.html);
  });

  return r;
}
