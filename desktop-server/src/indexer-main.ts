import path from 'path';
import {
  bootstrapRegisteredProjects,
  closeSearchModule,
  enqueueProjectIndex,
  enqueueReindexPaths,
  getSearchWatchPaths,
  switchSearchProject,
} from './search/index.js';
import { startIndexerIpcServer } from './search/indexer-ipc/server.js';
import { closeDb } from './search/db/connection.js';
import {
  findRegistryEntryByRoot,
  homedirIndexDbPath,
  projectIndexDbPath,
  registerProjectIndex,
} from './search/project-index-registry.js';

let _modelsDir = '';
let _skipImageSearch = false;

function resolveProjectDb(
  userDataPath: string,
  projectId?: string,
  rootPath?: string,
  dbPath?: string,
): string {
  if (dbPath?.trim()) return path.normalize(dbPath.trim());
  if (projectId?.trim() && userDataPath) {
    return projectIndexDbPath(userDataPath, projectId.trim());
  }
  if (rootPath?.trim()) {
    const hit = findRegistryEntryByRoot(userDataPath, rootPath.trim());
    if (hit) return hit.dbPath;
  }
  return homedirIndexDbPath(userDataPath);
}

async function bootIndexer(): Promise<void> {
  const userData = process.env.AIGENIUS_USER_DATA_PATH ?? '';
  const modelsDir =
    process.env.AIGENIUS_MODELS_DIR ??
    path.join(process.cwd(), 'dist', 'search', 'models');
  const skipImageSearch = process.env.AIGENIUS_SEARCH_IMAGES !== '1';
  _modelsDir = modelsDir;
  _skipImageSearch = skipImageSearch;

  const bootProjectRoot = process.env.AIGENIUS_BOOT_PROJECT_ROOT?.trim() || '';
  const bootProjectId = process.env.AIGENIUS_BOOT_PROJECT_ID?.trim() || '';
  const bootDbPath =
    bootProjectId && userData
      ? projectIndexDbPath(userData, bootProjectId)
      : homedirIndexDbPath(userData);

  const bootEntry =
    bootProjectRoot && bootProjectId
      ? registerProjectIndex(userData, {
          projectId: bootProjectId,
          rootPath: bootProjectRoot,
          dbPath: bootDbPath,
        })
      : null;

  await bootstrapRegisteredProjects(userData, bootEntry);

  if (bootEntry?.rootPath) {
    console.info(`[indexer] Active boot project: ${bootEntry.rootPath}`);
  } else {
    console.info('[indexer] No boot project — registered projects + homedir background only');
  }

  await startIndexerIpcServer({
    ping: async () => ({ ok: true }),
    'switch-project': async (req) => {
      const userDataPath = process.env.AIGENIUS_USER_DATA_PATH ?? '';
      const projectId = req.projectId?.trim() || path.basename(req.rootPath) || 'project';
      const resolvedDb = resolveProjectDb(userDataPath, projectId, req.rootPath, req.dbPath);
      process.env.AIGENIUS_DB_PATH = resolvedDb;

      await switchSearchProject({
        projectId,
        dbPath: resolvedDb,
        projectRoot: req.rootPath,
        modelsDir: _modelsDir,
        skipImageSearch: _skipImageSearch,
        userDataPath,
      });

      return { ok: true, dbPath: resolvedDb, watchPaths: [req.rootPath] };
    },
    'index-project': async (req) => {
      const userDataPath = process.env.AIGENIUS_USER_DATA_PATH ?? '';
      const resolvedDb = resolveProjectDb(userDataPath, undefined, req.rootPath);
      const queued = await enqueueProjectIndex(req.rootPath, resolvedDb, Boolean(req.force));
      return { queued, rootPath: req.rootPath, dbPath: resolvedDb };
    },
    reindex: async (req) => {
      const paths = Array.isArray(req.paths) && req.paths.length > 0
        ? req.paths
        : getSearchWatchPaths();
      const queued = enqueueReindexPaths(paths, Boolean(req.force));
      return { queued };
    },
    shutdown: async () => {
      await closeSearchModule();
      closeDb();
      process.exit(0);
    },
  });
}

void bootIndexer().catch((err) => {
  console.error('[indexer] fatal:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('[indexer] uncaughtException:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[indexer] unhandledRejection:', reason);
});
