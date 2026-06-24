import { Hono } from 'hono';
import {
  closeSearchModule,
  getSearchQueue,
  getSearchWatchPaths,
} from '../search/index.js';
import {
  searchFiles,
  getStatus,
  deleteFile,
  ragQuery,
  browseFileIndex,
  browseFolderGroups,
  browseExplorerDirectory,
  getFileIndexRow,
} from '../search/db/queries.js';
import { getDb } from '../search/db/connection.js';
import { stopVoiceSidecar } from '../sidecar/index.js';
import { aigeniusSecretToken } from '../config/server-env.js';
import { clientError, handleRoute } from '../utils/route-json.js';

export function createSearchRoutes(): Hono {
  const r = new Hono();

  r.use('*', async (c, next) => {
    if (c.req.method === 'OPTIONS') return next();

    if (!aigeniusSecretToken) {
      console.error(
        '[security] AIGENIUS_SECRET_TOKEN is not set — rejecting request to prevent data leakage.',
      );
      return clientError(c, 'Server misconfiguration: token not set', 401);
    }

    const authHeader = c.req.header('Authorization');
    if (authHeader !== `Bearer ${aigeniusSecretToken}`) {
      console.warn(`[security] Unauthorized access attempt: ${c.req.method} ${c.req.path}`);
      return clientError(c, 'Unauthorized', 401);
    }

    return next();
  });

  r.post('/query', (c) =>
    handleRoute(c, '[search] POST /search/query', async () => {
      const { term, limit } = await c.req.json();
      const db = getDb(process.env.AIGENIUS_DB_PATH!);
      return c.json(searchFiles(db, term, limit));
    }),
  );

  r.post('/rag', (c) =>
    handleRoute(c, '[search] POST /search/rag', async () => {
      const { contentQuery, pathQuery, topK, pathPrefix, extensions } = await c.req.json();
      const db = getDb(process.env.AIGENIUS_DB_PATH!);
      return c.json(ragQuery(db, contentQuery, pathQuery, topK, pathPrefix, extensions));
    }),
  );

  r.get('/status', (c) =>
    handleRoute(c, '[search] GET /search/status', async () => {
      const db = getDb(process.env.AIGENIUS_DB_PATH!);
      return c.json({ ...getStatus(db), watching: true });
    }),
  );

  /** Debug: paginated `file_index` rows (content preview only). Bearer token required. */
  r.post('/browse', (c) =>
    handleRoute(c, '[search] POST /search/browse', async () => {
      const body = await c.req.json().catch(() => ({}));
      const db = getDb(process.env.AIGENIUS_DB_PATH!);
      return c.json(browseFileIndex(db, body));
    }),
  );

  /** Debug: rollup distinct parent folders (same filters as `/search/browse` minus pagination). */
  r.post('/folders', (c) =>
    handleRoute(c, '[search] POST /search/folders', async () => {
      const body = await c.req.json().catch(() => ({}));
      const db = getDb(process.env.AIGENIUS_DB_PATH!);
      return c.json(browseFolderGroups(db, body));
    }),
  );

  /** Explorer-style: folder rollups at root, or subfolders + files in a directory. */
  r.post('/explorer', (c) =>
    handleRoute(c, '[search] POST /search/explorer', async () => {
      const body = await c.req.json().catch(() => ({}));
      const db = getDb(process.env.AIGENIUS_DB_PATH!);
      return c.json(browseExplorerDirectory(db, body));
    }),
  );

  /** Debug: full row for one path (extracted content capped server-side). */
  r.post('/row', (c) =>
    handleRoute(c, '[search] POST /search/row', async () => {
      const body = await c.req.json().catch(() => ({}));
      const filePath = typeof body.path === 'string' ? body.path : '';
      const maxContentChars =
        typeof body.maxContentChars === 'number' ? body.maxContentChars : undefined;
      if (!filePath) {
        return clientError(c, 'path is required', 400);
      }
      const db = getDb(process.env.AIGENIUS_DB_PATH!);
      const row = getFileIndexRow(db, filePath, maxContentChars);
      if (!row) {
        return clientError(c, 'not found', 404);
      }
      return c.json(row);
    }),
  );

  r.post('/reindex', (c) =>
    handleRoute(c, '[search] POST /search/reindex', async () => {
      const { paths, force } = await c.req.json();
      const queue = getSearchQueue();
      const p = Array.isArray(paths) ? paths : getSearchWatchPaths();
      for (const filePath of p) {
        queue.push({ type: 'change', path: filePath, force: Boolean(force) });
      }
      return c.json({ queued: p.length });
    }),
  );

  r.post('/remove', (c) =>
    handleRoute(c, '[search] POST /search/remove', async () => {
      const { path: filePath } = await c.req.json();
      const db = getDb(process.env.AIGENIUS_DB_PATH!);
      deleteFile(db, filePath);
      return c.json({ ok: true });
    }),
  );

  // Graceful shutdown: Electron calls this in before-quit — stops watcher/queue/workers and closes SQLite (singleton cleared).
  r.post('/shutdown', (c) =>
    handleRoute(c, '[search] POST /search/shutdown', async () => {
      if (process.env.AIGENIUS_DB_PATH) {
        await closeSearchModule();
        console.info('[aigenius-desktop-server] Search module shut down; SQLite closed cleanly.');
      }
      await stopVoiceSidecar();
      console.info('[aigenius-desktop-server] PocketTTS sidecar shut down.');
      return c.json({ ok: true });
    }),
  );

  return r;
}
