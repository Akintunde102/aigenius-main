import { Hono } from 'hono';
import {
  closeSearchModule,
  getSearchQueue,
  getSearchWatchPaths,
  switchSearchProject,
} from '../search/index.js';
import {
  getSearchStatusSnapshot,
  updateSearchStatusCache,
} from '../search/status-snapshot.js';
import {
  searchFiles,
  deleteFile,
  ragQuery,
  browseFileIndex,
  browseFolderGroups,
  browseExplorerDirectory,
  getFileIndexRow,
} from '../search/db/queries.js';
import {
  listSymbolsForFile,
  searchSymbolsByName,
  formatSymbolOutline,
  buildProjectArchitecture,
} from '../search/db/queries-chunks.js';
import { ragQueryHybrid } from '../search/embedding/hybrid-search.js';
import { embedBackfill } from '../search/embedding/chunk-embeddings.js';
import {
  computeBlastRadius,
  formatBlastRadiusReport,
  listImportsForFile,
} from '../search/db/queries-import-graph.js';
import {
  getContext,
  getFileOverview,
  getSymbolDetail,
  findSymbolReferences,
  traceCallChain,
  listBoundaries,
  getMakefileTargets,
} from '../search/db/queries-intelligence.js';
import { getActiveDbPath } from '../search/db/connection.js';
import path from 'path';
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
      const modelsDir = process.env.AIGENIUS_MODELS_DIR ?? '';
      return c.json(
        await ragQueryHybrid(db, modelsDir, contentQuery, pathQuery, topK, pathPrefix, extensions),
      );
    }),
  );

  r.post('/embed-backfill', (c) =>
    handleRoute(c, '[search] POST /search/embed-backfill', async () => {
      const body = await c.req.json().catch(() => ({}));
      const db = getDb(process.env.AIGENIUS_DB_PATH!);
      const modelsDir = process.env.AIGENIUS_MODELS_DIR ?? '';
      const limit = typeof body.limit === 'number' ? body.limit : 500;
      const pathPrefix = typeof body.pathPrefix === 'string' ? body.pathPrefix : '';
      const result = await embedBackfill(db, modelsDir, limit, pathPrefix);
      return c.json(result);
    }),
  );

  r.post('/switch-project', (c) =>
    handleRoute(c, '[search] POST /search/switch-project', async () => {
      const body = await c.req.json().catch(() => ({}));
      const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
      const rootPath = typeof body.rootPath === 'string' ? body.rootPath.trim() : '';
      const userData = process.env.AIGENIUS_USER_DATA_PATH ?? '';
      const modelsDir = process.env.AIGENIUS_MODELS_DIR ?? '';
      if (!rootPath) {
        return clientError(c, 'rootPath is required', 400);
      }
      let dbPath = typeof body.dbPath === 'string' ? body.dbPath.trim() : '';
      if (!dbPath && projectId && userData) {
        dbPath = path.join(userData, 'search-indexes', `${projectId}.sqlite`);
      }
      if (!dbPath) {
        dbPath = process.env.AIGENIUS_DB_PATH ?? '';
      }
      if (!dbPath) {
        return clientError(c, 'dbPath could not be resolved', 400);
      }
      await switchSearchProject({
        dbPath,
        watchPaths: [rootPath],
        modelsDir,
      });
      process.env.AIGENIUS_DB_PATH = dbPath;
      return c.json({ ok: true, dbPath, watchPaths: [rootPath] });
    }),
  );

  r.post('/import-graph', (c) =>
    handleRoute(c, '[search] POST /search/import-graph', async () => {
      const body = await c.req.json().catch(() => ({}));
      const db = getDb(process.env.AIGENIUS_DB_PATH!);
      const pathPrefix = typeof body.pathPrefix === 'string' ? body.pathPrefix : '';
      const maxDepth = typeof body.maxDepth === 'number' ? body.maxDepth : 4;
      const filePath = typeof body.path === 'string' ? body.path.trim() : '';
      if (filePath) {
        const imports = listImportsForFile(db, filePath);
        return c.json({ path: filePath, imports });
      }
      const seeds = Array.isArray(body.paths)
        ? body.paths.filter((p: unknown): p is string => typeof p === 'string')
        : [];
      if (!seeds.length) {
        return clientError(c, 'path or paths[] required', 400);
      }
      const result = computeBlastRadius(db, seeds, pathPrefix, maxDepth);
      return c.json({
        ...result,
        outline: formatBlastRadiusReport(result),
        dbPath: getActiveDbPath(),
      });
    }),
  );

  r.get('/symbols', (c) =>
    handleRoute(c, '[search] GET /search/symbols', async () => {
      const filePath = c.req.query('path') ?? '';
      const name = c.req.query('name') ?? '';
      const pathPrefix = c.req.query('path_prefix') ?? '';
      const limit = Number(c.req.query('limit') ?? 40);
      const db = getDb(process.env.AIGENIUS_DB_PATH!);
      if (filePath) {
        const symbols = listSymbolsForFile(db, filePath);
        return c.json({ path: filePath, symbols, outline: formatSymbolOutline(filePath, symbols) });
      }
      if (name) {
        const symbols = searchSymbolsByName(db, name, pathPrefix, limit);
        return c.json({ symbols, count: symbols.length });
      }
      return clientError(c, 'path or name query param required', 400);
    }),
  );

  r.post('/project-architecture', (c) =>
    handleRoute(c, '[search] POST /search/project-architecture', async () => {
      const body = await c.req.json().catch(() => ({}));
      const rootPath = typeof body.rootPath === 'string' ? body.rootPath.trim() : '';
      const projectName = typeof body.projectName === 'string' ? body.projectName.trim() : 'Project';
      if (!rootPath) {
        return clientError(c, 'rootPath is required', 400);
      }
      const db = getDb(process.env.AIGENIUS_DB_PATH!);
      const outline = buildProjectArchitecture(db, rootPath, projectName);
      return c.json({ outline, rootPath });
    }),
  );

  r.post('/context', (c) =>
    handleRoute(c, '[search] POST /search/context', async () => {
      const body = await c.req.json().catch(() => ({}));
      const input = typeof body.input === 'string' ? body.input.trim() : '';
      if (!input) return clientError(c, 'input is required', 400);
      const db = getDb(process.env.AIGENIUS_DB_PATH!);
      const modelsDir = process.env.AIGENIUS_MODELS_DIR ?? '';
      const result = await getContext(db, modelsDir, input, {
        includeSource: Boolean(body.includeSource),
        pathPrefix: typeof body.pathPrefix === 'string' ? body.pathPrefix : '',
        activeFile: typeof body.activeFile === 'string' ? body.activeFile : undefined,
      });
      return c.json(result);
    }),
  );

  r.get('/file-overview', (c) =>
    handleRoute(c, '[search] GET /search/file-overview', async () => {
      const filePath = c.req.query('path') ?? '';
      if (!filePath) return clientError(c, 'path required', 400);
      const db = getDb(process.env.AIGENIUS_DB_PATH!);
      return c.json(getFileOverview(db, filePath));
    }),
  );

  r.get('/symbol-detail', (c) =>
    handleRoute(c, '[search] GET /search/symbol-detail', async () => {
      const filePath = c.req.query('path') ?? '';
      const name = c.req.query('name') ?? '';
      if (!filePath || !name) return clientError(c, 'path and name required', 400);
      const db = getDb(process.env.AIGENIUS_DB_PATH!);
      const detail = getSymbolDetail(db, filePath, name);
      if (!detail) return clientError(c, 'symbol not found', 404);
      return c.json(detail);
    }),
  );

  r.get('/symbol-references', (c) =>
    handleRoute(c, '[search] GET /search/symbol-references', async () => {
      const filePath = c.req.query('path') ?? '';
      const name = c.req.query('name') ?? '';
      if (!filePath || !name) return clientError(c, 'path and name required', 400);
      const db = getDb(process.env.AIGENIUS_DB_PATH!);
      return c.json(findSymbolReferences(db, filePath, name));
    }),
  );

  r.get('/call-chain', (c) =>
    handleRoute(c, '[search] GET /search/call-chain', async () => {
      const filePath = c.req.query('path') ?? '';
      const name = c.req.query('name') ?? '';
      const maxDepth = Number(c.req.query('maxDepth') ?? 4);
      if (!filePath || !name) return clientError(c, 'path and name required', 400);
      const db = getDb(process.env.AIGENIUS_DB_PATH!);
      return c.json(traceCallChain(db, filePath, name, maxDepth));
    }),
  );

  r.get('/boundaries', (c) =>
    handleRoute(c, '[search] GET /search/boundaries', async () => {
      const pathPrefix = c.req.query('path_prefix') ?? '';
      const boundaryType = c.req.query('type') ?? undefined;
      const db = getDb(process.env.AIGENIUS_DB_PATH!);
      return c.json({ boundaries: listBoundaries(db, pathPrefix, boundaryType) });
    }),
  );

  r.get('/makefile-targets', (c) =>
    handleRoute(c, '[search] GET /search/makefile-targets', async () => {
      const filePath = c.req.query('path') ?? '';
      if (!filePath) return clientError(c, 'path required', 400);
      const db = getDb(process.env.AIGENIUS_DB_PATH!);
      return c.json({ targets: getMakefileTargets(db, filePath) });
    }),
  );

  r.get('/status', (c) =>
    handleRoute(c, '[search] GET /search/status', async () => {
      try {
        const queue = getSearchQueue();
        const depth = queue.pendingCount();
        updateSearchStatusCache({
          queue_depth: depth,
          scan_in_progress: depth > 0,
        });
      } catch {
        updateSearchStatusCache({ scan_in_progress: false, queue_depth: 0 });
      }
      return c.json({ ...getSearchStatusSnapshot(), watching: true });
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

  r.post('/index-project', (c) =>
    handleRoute(c, '[search] POST /search/index-project', async () => {
      const body = await c.req.json().catch(() => ({}));
      const rootPath = typeof body.rootPath === 'string' ? body.rootPath.trim() : '';
      const force = Boolean(body.force);
      if (!rootPath) {
        return clientError(c, 'rootPath is required', 400);
      }
      const { walkProjectFiles } = await import('../search/indexer/project-walk.js');
      const files = walkProjectFiles(rootPath);
      const queue = getSearchQueue();
      for (const filePath of files) {
        queue.push({ type: 'change', path: filePath, force });
      }
      return c.json({ queued: files.length, rootPath });
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
