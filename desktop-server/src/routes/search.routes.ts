import { Hono } from 'hono';
import {
  closeSearchModule,
  enqueueProjectIndex,
  enqueueReindexPaths,
  getSearchQueue,
  getSearchWatchPaths,
  switchSearchProject,
} from '../search/index.js';
import {
  getSearchStatusSnapshot,
  updateSearchStatusCache,
} from '../search/status-snapshot.js';
import { readIndexerStatusFile } from '../search/indexer-status-file.js';
import { callIndexerIpc, isExternalIndexerEnabled } from '../search/indexer-ipc/client.js';
import { warmSearchCache } from '../search/warm-search-cache.js';
import { readAigeniusIgnoreFile, writeAigeniusIgnoreFile } from '../search/aigeniusignore-io.js';
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
  getSymbolLineRange,
  findEnclosingSymbolAtLine,
  findSymbolReferences,
  traceCallChain,
  listBoundaries,
  getMakefileTargets,
} from '../search/db/queries-intelligence.js';
import {
  findCallers,
  symbolBlastRadius,
  typeFlowTrace,
  buildStructuralDigest,
  formatCallersReport,
  formatSymbolBlastRadiusReport,
  formatTypeFlowReport,
} from '../search/db/queries-graph.js';
import { getDb } from '../search/db/connection.js';
import { getDbForSearchQuery } from '../search/search-db-resolve.js';
import path from 'path';
import {
  listRegisteredProjectIndexes,
  projectIndexDbPath,
  registerProjectIndex,
  resolveProjectDbPath,
  setActiveProjectIndexId,
} from '../search/project-index-registry.js';
import { stopVoiceSidecar } from '../sidecar/index.js';
import { aigeniusSecretToken } from '../config/server-env.js';
import { clientError, handleRoute } from '../utils/route-json.js';

export function createSearchRoutes(): Hono {
  const r = new Hono();

  function resolveReadDb(opts: {
    projectId?: string;
    rootPath?: string;
    pathPrefix?: string;
    filePath?: string;
  }) {
    const userData = process.env.AIGENIUS_USER_DATA_PATH ?? '';
    return getDbForSearchQuery({ ...opts, userData });
  }

  async function queueIndexerOp(
    body: Record<string, unknown>,
    op: 'switch-project' | 'index-project',
  ): Promise<void> {
    if (!isExternalIndexerEnabled()) return;
    const rootPath = typeof body.rootPath === 'string' ? body.rootPath.trim() : '';
    const projectId = typeof body.projectId === 'string' ? body.projectId.trim() : '';
    try {
      if (op === 'switch-project' && rootPath) {
        await callIndexerIpc({
          op: 'switch-project',
          projectId,
          rootPath,
          dbPath: typeof body.dbPath === 'string' ? body.dbPath : undefined,
        }, 8_000);
      } else if (op === 'index-project' && rootPath) {
        await callIndexerIpc({
          op: 'index-project',
          rootPath,
          force: Boolean(body.force),
        }, 8_000);
      }
    } catch (err) {
      console.warn(`[search] background indexer ${op} failed:`, err);
    }
  }

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
      const body = await c.req.json();
      const { term, limit, pathPrefix } = body;
      const { db } = resolveReadDb({
        pathPrefix: typeof pathPrefix === 'string' ? pathPrefix : undefined,
      });
      return c.json(searchFiles(db, term, limit));
    }),
  );

  r.post('/rag', (c) =>
    handleRoute(c, '[search] POST /search/rag', async () => {
      const { contentQuery, pathQuery, topK, pathPrefix, extensions } = await c.req.json();
      const { db } = resolveReadDb({
        pathPrefix: typeof pathPrefix === 'string' ? pathPrefix : undefined,
      });
      const modelsDir = process.env.AIGENIUS_MODELS_DIR ?? '';
      return c.json(
        await ragQueryHybrid(db, modelsDir, contentQuery, pathQuery, topK, pathPrefix, extensions),
      );
    }),
  );

  r.post('/embed-backfill', (c) =>
    handleRoute(c, '[search] POST /search/embed-backfill', async () => {
      const body = await c.req.json().catch(() => ({}));
      const pathPrefix = typeof body.pathPrefix === 'string' ? body.pathPrefix : '';
      const { db } = resolveReadDb({ pathPrefix });
      const modelsDir = process.env.AIGENIUS_MODELS_DIR ?? '';
      const limit = typeof body.limit === 'number' ? body.limit : 500;
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
        dbPath = projectIndexDbPath(userData, projectId);
      }
      if (!dbPath) {
        dbPath = resolveProjectDbPath({ userData, rootPath, projectId });
      }
      if (!dbPath) {
        return clientError(c, 'dbPath could not be resolved', 400);
      }

      const resolvedProjectId = projectId || path.basename(rootPath) || 'project';
      registerProjectIndex(userData, {
        projectId: resolvedProjectId,
        rootPath,
        dbPath,
      });
      setActiveProjectIndexId(userData, resolvedProjectId);
      process.env.AIGENIUS_DB_PATH = dbPath;

      // Open the DB for reads immediately — search never waits for indexing.
      const db = getDb(dbPath);
      warmSearchCache(db, rootPath);

      if (isExternalIndexerEnabled()) {
        void queueIndexerOp({ ...body, projectId: resolvedProjectId, rootPath, dbPath }, 'switch-project');
        void queueIndexerOp({ rootPath, force: false }, 'index-project');
        return c.json({
          ok: true,
          dbPath,
          watchPaths: [rootPath],
          indexing: 'queued',
        });
      }

      await switchSearchProject({
        projectId: resolvedProjectId,
        dbPath,
        projectRoot: rootPath,
        modelsDir,
        userDataPath: userData,
      });
      return c.json({ ok: true, dbPath, watchPaths: [rootPath], indexing: 'queued' });
    }),
  );

  r.post('/import-graph', (c) =>
    handleRoute(c, '[search] POST /search/import-graph', async () => {
      const body = await c.req.json().catch(() => ({}));
      const pathPrefix = typeof body.pathPrefix === 'string' ? body.pathPrefix : '';
      const filePath = typeof body.path === 'string' ? body.path.trim() : '';
      const { db, dbPath } = resolveReadDb({ pathPrefix, filePath });
      const maxDepth = typeof body.maxDepth === 'number' ? body.maxDepth : 4;
      if (filePath) {
        const imports = listImportsForFile(db, filePath);
        return c.json({ path: filePath, imports, dbPath });
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
        dbPath,
      });
    }),
  );

  r.get('/symbols', (c) =>
    handleRoute(c, '[search] GET /search/symbols', async () => {
      const filePath = c.req.query('path') ?? '';
      const name = c.req.query('name') ?? '';
      const pathPrefix = c.req.query('path_prefix') ?? '';
      const limit = Number(c.req.query('limit') ?? 40);
      const { db } = resolveReadDb({ pathPrefix, filePath });
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
      const { db } = resolveReadDb({ rootPath });
      const outline = buildProjectArchitecture(db, rootPath, projectName);
      return c.json({ outline, rootPath });
    }),
  );

  r.post('/context', (c) =>
    handleRoute(c, '[search] POST /search/context', async () => {
      const body = await c.req.json().catch(() => ({}));
      const input = typeof body.input === 'string' ? body.input.trim() : '';
      if (!input) return clientError(c, 'input is required', 400);
      const pathPrefix = typeof body.pathPrefix === 'string' ? body.pathPrefix : '';
      const activeFile = typeof body.activeFile === 'string' ? body.activeFile : undefined;
      const { db } = resolveReadDb({
        pathPrefix,
        filePath: activeFile || input,
        rootPath: pathPrefix || input,
      });
      const modelsDir = process.env.AIGENIUS_MODELS_DIR ?? '';
      const result = await getContext(db, modelsDir, input, {
        includeSource: Boolean(body.includeSource),
        pathPrefix,
        activeFile,
      });
      return c.json(result);
    }),
  );

  r.get('/file-overview', (c) =>
    handleRoute(c, '[search] GET /search/file-overview', async () => {
      const filePath = c.req.query('path') ?? '';
      if (!filePath) return clientError(c, 'path required', 400);
      const { db } = resolveReadDb({ filePath });
      return c.json(getFileOverview(db, filePath));
    }),
  );

  r.get('/symbol-detail', (c) =>
    handleRoute(c, '[search] GET /search/symbol-detail', async () => {
      const filePath = c.req.query('path') ?? '';
      const name = c.req.query('name') ?? '';
      if (!filePath || !name) return clientError(c, 'path and name required', 400);
      const { db } = resolveReadDb({ filePath });
      const detail = getSymbolDetail(db, filePath, name);
      if (!detail) return clientError(c, 'symbol not found', 404);
      return c.json(detail);
    }),
  );

  r.get('/symbol-line-range', (c) =>
    handleRoute(c, '[search] GET /search/symbol-line-range', async () => {
      const filePath = c.req.query('path') ?? '';
      const name = c.req.query('name') ?? '';
      if (!filePath || !name) return clientError(c, 'path and name required', 400);
      const { db } = resolveReadDb({ filePath });
      const range = getSymbolLineRange(db, filePath, name);
      if (!range) return clientError(c, 'symbol not found', 404);
      return c.json({ path: filePath, ...range });
    }),
  );

  r.get('/symbol-at-line', (c) =>
    handleRoute(c, '[search] GET /search/symbol-at-line', async () => {
      const filePath = c.req.query('path') ?? '';
      const line = Number(c.req.query('line') ?? 0);
      if (!filePath || !Number.isFinite(line) || line < 1) {
        return clientError(c, 'path and line (>=1) required', 400);
      }
      const { db } = resolveReadDb({ filePath });
      const range = findEnclosingSymbolAtLine(db, filePath, line);
      if (!range) return clientError(c, 'no symbol at line', 404);
      return c.json({ path: filePath, ...range });
    }),
  );

  r.get('/symbol-references', (c) =>
    handleRoute(c, '[search] GET /search/symbol-references', async () => {
      const filePath = c.req.query('path') ?? '';
      const name = c.req.query('name') ?? '';
      if (!filePath || !name) return clientError(c, 'path and name required', 400);
      const { db } = resolveReadDb({ filePath });
      return c.json(findSymbolReferences(db, filePath, name));
    }),
  );

  r.get('/call-chain', (c) =>
    handleRoute(c, '[search] GET /search/call-chain', async () => {
      const filePath = c.req.query('path') ?? '';
      const name = c.req.query('name') ?? '';
      const maxDepth = Number(c.req.query('maxDepth') ?? 4);
      if (!filePath || !name) return clientError(c, 'path and name required', 400);
      const { db } = resolveReadDb({ filePath });
      return c.json(traceCallChain(db, filePath, name, maxDepth));
    }),
  );

  r.get('/structural-digest', (c) =>
    handleRoute(c, '[search] GET /search/structural-digest', async () => {
      const rootPath = c.req.query('root') ?? c.req.query('rootPath') ?? '';
      const projectName = c.req.query('projectName') ?? 'Project';
      if (!rootPath) return clientError(c, 'root required', 400);
      const { db } = resolveReadDb({ rootPath });
      const digest = buildStructuralDigest(db, rootPath, projectName);
      return c.json({ digest, rootPath });
    }),
  );

  r.get('/find-callers', (c) =>
    handleRoute(c, '[search] GET /search/find-callers', async () => {
      const qualifiedName = c.req.query('qualified_name') ?? '';
      const filePath = c.req.query('path') ?? '';
      const name = c.req.query('name') ?? '';
      const maxDepth = Number(c.req.query('maxDepth') ?? 1);
      const minConfidence = (c.req.query('min_confidence') ?? 'static-heuristic') as
        | 'static-certain'
        | 'static-heuristic'
        | 'inferred';
      const pathPrefix = c.req.query('path_prefix') ?? '';
      if (!qualifiedName && (!filePath || !name)) {
        return clientError(c, 'qualified_name or path+name required', 400);
      }
      const { db } = resolveReadDb({ pathPrefix, filePath });
      const qn = qualifiedName || `${filePath}#${name}`;
      const result = findCallers(db, qn, { maxDepth, minConfidence, pathPrefix });
      return c.json({ ...result, outline: formatCallersReport(result) });
    }),
  );

  r.post('/symbol-blast-radius', (c) =>
    handleRoute(c, '[search] POST /search/symbol-blast-radius', async () => {
      const body = await c.req.json().catch(() => ({}));
      const qualifiedName =
        typeof body.qualified_name === 'string'
          ? body.qualified_name
          : typeof body.path === 'string' && typeof body.name === 'string'
            ? `${body.path}#${body.name}`
            : '';
      const changeType = (body.change_type ?? 'signature_change') as
        | 'signature_change'
        | 'removal'
        | 'return_type_change';
      const pathPrefix = typeof body.path_prefix === 'string' ? body.path_prefix : '';
      const maxDepth = typeof body.max_depth === 'number' ? body.max_depth : 2;
      if (!qualifiedName) return clientError(c, 'qualified_name or path+name required', 400);
      const { db } = resolveReadDb({
        pathPrefix,
        filePath: typeof body.path === 'string' ? body.path : undefined,
      });
      const result = symbolBlastRadius(db, qualifiedName, changeType, { pathPrefix, maxDepth });
      return c.json({ ...result, outline: formatSymbolBlastRadiusReport(result) });
    }),
  );

  r.get('/type-flow', (c) =>
    handleRoute(c, '[search] GET /search/type-flow', async () => {
      const typeName = c.req.query('type_name') ?? c.req.query('name') ?? '';
      const direction = (c.req.query('direction') ?? 'both') as 'upstream' | 'downstream' | 'both';
      const pathPrefix = c.req.query('path_prefix') ?? '';
      if (!typeName) return clientError(c, 'type_name required', 400);
      const { db } = resolveReadDb({ pathPrefix });
      const result = typeFlowTrace(db, typeName, direction, { pathPrefix });
      return c.json({ ...result, outline: formatTypeFlowReport(result) });
    }),
  );

  r.get('/boundaries', (c) =>
    handleRoute(c, '[search] GET /search/boundaries', async () => {
      const pathPrefix = c.req.query('path_prefix') ?? '';
      const boundaryType = c.req.query('type') ?? undefined;
      const { db } = resolveReadDb({ pathPrefix });
      return c.json({ boundaries: listBoundaries(db, pathPrefix, boundaryType) });
    }),
  );

  r.get('/makefile-targets', (c) =>
    handleRoute(c, '[search] GET /search/makefile-targets', async () => {
      const filePath = c.req.query('path') ?? '';
      if (!filePath) return clientError(c, 'path required', 400);
      const { db } = resolveReadDb({ filePath });
      return c.json({ targets: getMakefileTargets(db, filePath) });
    }),
  );

  r.get('/status', (c) =>
    handleRoute(c, '[search] GET /search/status', async () => {
      const userData = process.env.AIGENIUS_USER_DATA_PATH ?? '';
      const fileStatus = readIndexerStatusFile(userData);
      const registered = listRegisteredProjectIndexes(userData);

      let indexerIpcOk = false;
      if (isExternalIndexerEnabled()) {
        try {
          await callIndexerIpc({ op: 'ping' }, 1_500);
          indexerIpcOk = true;
        } catch {
          indexerIpcOk = false;
        }
      }

      if (fileStatus) {
        const health = fileStatus.health ?? {
          indexer_ipc_reachable: indexerIpcOk,
          db_integrity: 'unknown' as const,
          last_error: null,
          queue_text_depth: 0,
          queue_structure_depth: 0,
        };
        return c.json({
          indexed: fileStatus.indexed,
          watching: fileStatus.watching,
          lastRun: fileStatus.last_run,
          scan_in_progress: fileStatus.scan_in_progress,
          queue_depth: fileStatus.queue_depth,
          db_path: fileStatus.db_path,
          project_root: fileStatus.project_root,
          active_project_id: fileStatus.active_project_id ?? null,
          projects: fileStatus.projects ?? registered.map((p) => ({
            project_id: p.projectId,
            project_root: p.rootPath,
            db_path: p.dbPath,
            indexed: 0,
            last_run: 0,
            is_active: p.projectId === fileStatus.active_project_id,
            watching: true,
            index_ready: false,
          })),
          core_ready: fileStatus.core_ready,
          enrichment_ready: fileStatus.enrichment_ready,
          queue_by_tier: fileStatus.queue_by_tier,
          health: {
            ...health,
            indexer_ipc_reachable: isExternalIndexerEnabled() ? indexerIpcOk : true,
          },
        });
      }

      if (!isExternalIndexerEnabled()) {
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
      }

      return c.json({
        ...getSearchStatusSnapshot(),
        watching: true,
        core_ready: true,
        enrichment_ready: true,
        projects: registered,
        health: {
          indexer_ipc_reachable: isExternalIndexerEnabled() ? indexerIpcOk : true,
          db_integrity: 'unknown',
          last_error: null,
          queue_text_depth: 0,
          queue_structure_depth: 0,
        },
      });
    }),
  );

  r.get('/aigeniusignore', (c) =>
    handleRoute(c, '[search] GET /search/aigeniusignore', async () => {
      const rootPath = (c.req.query('rootPath') ?? '').trim();
      if (!rootPath) return clientError(c, 'rootPath is required', 400);
      const data = readAigeniusIgnoreFile(rootPath);
      return c.json(data);
    }),
  );

  r.put('/aigeniusignore', (c) =>
    handleRoute(c, '[search] PUT /search/aigeniusignore', async () => {
      const body = await c.req.json().catch(() => ({}));
      const rootPath = typeof body.rootPath === 'string' ? body.rootPath.trim() : '';
      const content = typeof body.content === 'string' ? body.content : '';
      if (!rootPath) return clientError(c, 'rootPath is required', 400);
      const result = writeAigeniusIgnoreFile(rootPath, content);
      return c.json({ ok: true, ...result });
    }),
  );

  /** Debug: paginated `file_index` rows (content preview only). Bearer token required. */
  r.post('/browse', (c) =>
    handleRoute(c, '[search] POST /search/browse', async () => {
      const body = await c.req.json().catch(() => ({}));
      const pathPrefix = typeof body.pathPrefix === 'string' ? body.pathPrefix : '';
      const { db } = resolveReadDb({ pathPrefix });
      return c.json(browseFileIndex(db, body));
    }),
  );

  /** Debug: rollup distinct parent folders (same filters as `/search/browse` minus pagination). */
  r.post('/folders', (c) =>
    handleRoute(c, '[search] POST /search/folders', async () => {
      const body = await c.req.json().catch(() => ({}));
      const pathPrefix = typeof body.pathPrefix === 'string' ? body.pathPrefix : '';
      const { db } = resolveReadDb({ pathPrefix });
      return c.json(browseFolderGroups(db, body));
    }),
  );

  /** Explorer-style: folder rollups at root, or subfolders + files in a directory. */
  r.post('/explorer', (c) =>
    handleRoute(c, '[search] POST /search/explorer', async () => {
      const body = await c.req.json().catch(() => ({}));
      const directoryPath = typeof body.directoryPath === 'string' ? body.directoryPath : '';
      const { db } = resolveReadDb({ pathPrefix: directoryPath, filePath: directoryPath });
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
      const { db } = resolveReadDb({ filePath });
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
      if (isExternalIndexerEnabled()) {
        const p = Array.isArray(paths) ? paths : undefined;
        void callIndexerIpc<{ queued: number }>({
          op: 'reindex',
          paths: p,
          force: Boolean(force),
        }, 8_000).catch((err) => {
          console.warn('[search] background reindex failed:', err);
        });
        return c.json({ queued: 0, indexing: 'queued' });
      }
      const p = Array.isArray(paths) ? paths : getSearchWatchPaths();
      const queued = enqueueReindexPaths(p, Boolean(force));
      return c.json({ queued });
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
      const userData = process.env.AIGENIUS_USER_DATA_PATH ?? '';
      const dbPath = resolveProjectDbPath({ userData, rootPath });
      if (isExternalIndexerEnabled()) {
        void callIndexerIpc<{ queued: number; rootPath: string }>({
          op: 'index-project',
          rootPath,
          force,
        }, 8_000).catch((err) => {
          console.warn('[search] background index-project failed:', err);
        });
        return c.json({ queued: 0, rootPath, dbPath, indexing: 'queued' });
      }
      const queued = await enqueueProjectIndex(rootPath, dbPath, force);
      return c.json({ queued, rootPath, dbPath });
    }),
  );

  r.post('/remove', (c) =>
    handleRoute(c, '[search] POST /search/remove', async () => {
      const { path: filePath } = await c.req.json();
      const { db } = resolveReadDb({ filePath });
      deleteFile(db, filePath);
      return c.json({ ok: true });
    }),
  );

  // Graceful shutdown: Electron calls this in before-quit — stops watcher/queue/workers and closes SQLite (singleton cleared).
  r.post('/shutdown', (c) =>
    handleRoute(c, '[search] POST /search/shutdown', async () => {
      if (isExternalIndexerEnabled()) {
        await callIndexerIpc({ op: 'shutdown' }, 5_000).catch(() => undefined);
      } else if (process.env.AIGENIUS_DB_PATH) {
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
