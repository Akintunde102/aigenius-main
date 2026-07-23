import path from 'path';
import fs from 'fs';
import os from 'os';
import type { SearchModuleConfig } from './types.js';
import { closeDb, getDb, listOpenDbPaths } from './db/connection.js';
import {
  upsertFile,
  deleteFile,
  checkMtime,
  checkContentHash,
  purgeExemptedFiles,
  getFileIndexRow,
} from './db/queries.js';
import { upsertFileStructure } from './db/queries-chunks.js';
import { WorkerPool } from './indexer/worker-pool.js';
import { startWatcher, type WatchEvent } from './indexer/file-watcher.js';
import { createTieredIndexQueue, type IndexJobScope } from './indexer/tiered-index-queue.js';
import { shouldSkipSearchIndexing } from './indexer/exemptions.js';
import { hashContent } from './indexer/content-hash.js';
import { resetTsMorphProjects } from './indexer/ts-morph-indexer.js';
import { startStaleEdgeSweepWorker, stopStaleEdgeSweepWorker } from './indexer/stale-edge-sweep.js';
import { languageForExtension } from './indexer/language-indexer.js';
import {
  tierForFilePath,
  tierForInactiveProject,
  isPathUnderRoot,
  type IndexTier,
} from './indexer/index-tier.js';
import { getStatus } from './db/queries.js';
import {
  refreshSearchStatusFromDb,
  resetSearchStatusSnapshot,
  setSearchStatusDbPath,
  updateSearchStatusCache,
} from './status-snapshot.js';
import {
  computeCoreReady,
  computeEnrichmentReady,
  writeIndexerStatusFile,
} from './indexer-status-file.js';
import type { TieredQueueItem } from './indexer/tiered-index-queue.js';
import {
  homedirIndexDbPath,
  loadProjectIndexRegistry,
  registerProjectIndex,
  setActiveProjectIndexId,
  type ProjectIndexEntry,
} from './project-index-registry.js';
import { resolveSearchWorkerCountFromEnv, SEARCH_WORKER_CPU_FRACTION } from './indexer/resolve-worker-count.js';
import { normalizeIndexPhase } from './indexer/index-phase.js';
import { listProjectFiles } from './indexer/git-project-files.js';
import { enqueueWithBackpressure } from './indexer/queue-backpressure.js';
import { FileWriteBatcher } from './indexer/file-write-batcher.js';
import { startWalMaintenance, stopWalMaintenance } from './indexer/wal-maintenance.js';
import { startEmbedIdleScheduler, stopEmbedIdleScheduler } from './indexer/embed-idle-scheduler.js';
import { warmSearchCache } from './warm-search-cache.js';

type TieredQueue = ReturnType<typeof createTieredIndexQueue>;

type ProjectSlot = {
  projectId: string;
  rootPath: string;
  dbPath: string;
  stopWatcher: (() => Promise<void>) | null;
  /** Full directory walk only once per session — steady state uses watchers. */
  initialScanDone: boolean;
  needsStructurePass: boolean;
  structurePassScheduled: boolean;
  indexReady: boolean;
};

let _queue: TieredQueue | null = null;
let _pool: WorkerPool | null = null;
let _modelsDir = '';
let _skipImageSearch = false;
let _userDataPath = '';
let _homedirDbPath = '';
let _stopHomedirWatcher: (() => Promise<void>) | null = null;
let _infraReady = false;
let _fileBatcher: FileWriteBatcher | null = null;
let _lastIndexerError: string | null = null;

const _projectSlots = new Map<string, ProjectSlot>();
let _activeDbPath: string | null = null;
let _activeProjectRoot: string | null = null;
let _activeProjectId: string | null = null;

function yieldEventLoop(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

function jobScope(dbPath: string, projectRoot: string | null): IndexJobScope {
  return { dbPath, projectRoot };
}

function resolveTierForScope(
  filePath: string,
  projectRoot: string | null,
  dbPath: string,
  baseTier?: IndexTier,
): IndexTier {
  const tier = baseTier ?? tierForFilePath(filePath, projectRoot);
  if (dbPath === _activeDbPath) return tier;
  return tierForInactiveProject(tier);
}

function publishIndexerStatus(dbPath: string, projectRoot: string | null): void {
  if (!_userDataPath || !_queue) return;
  try {
    const db = getDb(dbPath);
    const counts = _queue.pendingCountByTier();
    refreshSearchStatusFromDb(db);
    const row = getStatus(db);
    const queueDepth = _queue.pendingCount();
    const phaseCounts = _queue.pendingCountByPhase();

    updateSearchStatusCache({
      queue_depth: queueDepth,
      scan_in_progress: queueDepth > 0,
      indexed: row.indexed,
      lastRun: row.lastRun,
    });

    const registry = loadProjectIndexRegistry(_userDataPath);
    const projectSummaries = [..._projectSlots.values()].map((slot) => {
      let indexed = 0;
      let lastRun = 0;
      try {
        const slotDb = getDb(slot.dbPath);
        const status = getStatus(slotDb);
        indexed = status.indexed;
        lastRun = status.lastRun;
      } catch {
        /* slot db may not exist yet */
      }
      return {
        project_id: slot.projectId,
        project_root: slot.rootPath,
        db_path: slot.dbPath,
        indexed,
        last_run: lastRun,
        is_active: slot.dbPath === _activeDbPath,
        watching: Boolean(slot.stopWatcher),
        index_ready: slot.indexReady,
      };
    });

    writeIndexerStatusFile(_userDataPath, {
      updated_at_ms: Date.now(),
      db_path: dbPath,
      project_root: projectRoot,
      active_project_id: _activeProjectId,
      projects: projectSummaries,
      watching: true,
      indexed: row.indexed,
      last_run: row.lastRun,
      scan_in_progress: queueDepth > 0,
      queue_depth: queueDepth,
      queue_by_tier: counts,
      core_ready: computeCoreReady(counts),
      enrichment_ready: computeEnrichmentReady(counts),
      health: {
        indexer_ipc_reachable: true,
        db_integrity: 'ok',
        last_error: _lastIndexerError,
        queue_text_depth: phaseCounts.text,
        queue_structure_depth: phaseCounts.structure,
      },
    });
  } catch (err) {
    console.warn('[search] publishIndexerStatus failed:', err);
  }
}

function enqueueScopedEvent(
  event: WatchEvent,
  scope: IndexJobScope,
  tier?: IndexTier,
): void {
  if (!_queue) return;
  const resolvedTier = resolveTierForScope(event.path, scope.projectRoot, scope.dbPath, tier);
  _queue.push(event, resolvedTier, scope);
  publishIndexerStatus(scope.dbPath, scope.projectRoot);
}

function findSlotForFilePath(filePath: string): ProjectSlot | null {
  const resolved = path.resolve(filePath);
  let best: ProjectSlot | null = null;
  let bestLen = -1;
  for (const slot of _projectSlots.values()) {
    if (isPathUnderRoot(resolved, slot.rootPath)) {
      const len = path.resolve(slot.rootPath).length;
      if (len > bestLen) {
        best = slot;
        bestLen = len;
      }
    }
  }
  return best;
}

async function processWatchEvent(item: TieredQueueItem): Promise<void> {
  const phase = item.phase == null ? 'full' : normalizeIndexPhase(item.phase);
  if (phase === 'structure') {
    await processStructurePhase(item);
    return;
  }
  if (phase === 'text') {
    await processTextPhase(item);
    if (item.pipelineStructure) {
      enqueueScopedEvent(
        { type: 'change', path: item.path, force: item.force, phase: 'structure' },
        item.scope,
        item.tier,
      );
    }
    return;
  }
  await processTextPhase(item);
  await processStructurePhase(item);
}

async function processTextPhase(item: TieredQueueItem): Promise<void> {
  const dbPath = item.scope.dbPath;
  const projectRoot = item.scope.projectRoot;
  let db = getDb(dbPath);
  const filePath = item.path;
  const event = item;
  let mtime: number;

  if (event.type === 'unlink') {
    deleteFile(db, filePath);
    publishIndexerStatus(dbPath, projectRoot);
    return;
  }

  if (event.stats) {
    mtime = Math.floor(event.stats.mtimeMs);
  } else {
    try {
      const stat = fs.statSync(filePath);
      mtime = Math.floor(stat.mtimeMs);
    } catch {
      console.info('[search] File missing during indexing:', filePath);
      deleteFile(db, filePath);
      publishIndexerStatus(dbPath, projectRoot);
      return;
    }
  }

  const storedMtime = checkMtime(db, filePath);
  if (storedMtime === mtime && !event.force) {
    publishIndexerStatus(dbPath, projectRoot);
    return;
  }

  if (shouldSkipSearchIndexing(filePath)) {
    publishIndexerStatus(dbPath, projectRoot);
    return;
  }

  const tier = item.tier;
  console.info(`\x1b[34m[search] Indexing text [${tier}]:\x1b[0m`, filePath);

  const output = await _pool!.run({
    path: filePath,
    mtime,
    skipImages: _skipImageSearch || tier === 'background',
  });
  db = getDb(dbPath);
  if (output.error) {
    console.warn('[search] extract error for', filePath, output.error);
    _lastIndexerError = output.error;
  }

  const contentHash = hashContent(output.content);
  const storedHash = checkContentHash(db, filePath);
  if (storedHash === contentHash && !event.force) {
    publishIndexerStatus(dbPath, projectRoot);
    return;
  }

  const ext = path.extname(filePath).toLowerCase().replace(/^\./, '');
  const row = {
    path: filePath,
    name: path.basename(filePath),
    mtime,
    content: output.content,
    tags: output.tags.join(' '),
    extension: ext,
    content_hash: contentHash,
    language: languageForExtension(ext),
    index_status: output.error ? `extract_error: ${output.error}` : 'text_ok',
    last_indexed: Date.now(),
  };

  if (_fileBatcher) {
    _fileBatcher.add(dbPath, row);
  } else {
    upsertFile(db, row);
  }

  publishIndexerStatus(dbPath, projectRoot);
  await yieldEventLoop();
}

async function processStructurePhase(item: TieredQueueItem): Promise<void> {
  const dbPath = item.scope.dbPath;
  const projectRoot = item.scope.projectRoot;
  const filePath = item.path;
  const tier = item.tier;

  if (shouldSkipSearchIndexing(filePath)) {
    publishIndexerStatus(dbPath, projectRoot);
    return;
  }

  _fileBatcher?.flushAll();
  const db = getDb(dbPath);
  const existing = getFileIndexRow(db, filePath, 2_000_000);
  if (!existing?.content && !item.force) {
    publishIndexerStatus(dbPath, projectRoot);
    return;
  }

  let content = existing?.content ?? '';
  if (!content.trim()) {
    try {
      const stat = fs.statSync(filePath);
      const output = await _pool!.run({
        path: filePath,
        mtime: Math.floor(stat.mtimeMs),
        skipImages: _skipImageSearch || tier === 'background',
      });
      content = output.content;
    } catch {
      publishIndexerStatus(dbPath, projectRoot);
      return;
    }
  }

  const ext = path.extname(filePath).toLowerCase().replace(/^\./, '');
  console.info(`\x1b[36m[search] Indexing structure [${tier}]:\x1b[0m`, filePath);

  try {
    await upsertFileStructure(db, filePath, content, ext, _modelsDir);
    db.prepare('UPDATE file_index SET index_status = ? WHERE path = ?').run('ok', filePath);
    _lastIndexerError = null;
  } catch (structErr) {
    const msg = structErr instanceof Error ? structErr.message : String(structErr);
    console.warn('[search] chunk/symbol index error for', filePath, structErr);
    _lastIndexerError = msg;
    db.prepare('UPDATE file_index SET index_status = ? WHERE path = ?').run(
      `structure_error: ${msg}`,
      filePath,
    );
    throw structErr;
  }

  publishIndexerStatus(dbPath, projectRoot);
  await yieldEventLoop();
}

function refreshProjectIndexReady(): void {
  if (!_queue || _queue.pendingCount() > 0) return;
  for (const slot of _projectSlots.values()) {
    if (!slot.initialScanDone || slot.needsStructurePass) {
      slot.indexReady = false;
      continue;
    }
    slot.indexReady = true;
  }
}

function markProjectScanStarting(slot: ProjectSlot): void {
  slot.indexReady = false;
  slot.needsStructurePass = true;
  slot.structurePassScheduled = false;
}

function scheduleStructurePasses(): void {
  if (!_queue) return;

  const activeSlot = _activeDbPath
    ? [..._projectSlots.values()].find((s) => s.dbPath === _activeDbPath)
    : null;

  if (activeSlot?.needsStructurePass && !activeSlot.structurePassScheduled) {
    activeSlot.structurePassScheduled = true;
    void enqueueStructurePass(activeSlot.rootPath, activeSlot.dbPath, false);
    return;
  }

  const counts = _queue.pendingCountByTier();
  const activeBusy =
    counts.project_core > 0 || counts.project_docs > 0 || counts.project_media > 0;
  if (activeBusy) return;

  for (const slot of _projectSlots.values()) {
    if (slot.dbPath === _activeDbPath) continue;
    if (!slot.needsStructurePass || slot.structurePassScheduled) continue;
    slot.structurePassScheduled = true;
    void enqueueStructurePass(slot.rootPath, slot.dbPath, false);
    break;
  }
}

async function enqueueStructurePass(rootPath: string, dbPath: string, force: boolean): Promise<number> {
  const files = listProjectFiles(rootPath);
  const scope = jobScope(dbPath, rootPath);
  const pending = () => _queue?.pendingCount() ?? 0;

  await enqueueWithBackpressure(files, pending, (filePath) => {
    const tier = resolveTierForScope(filePath, rootPath, dbPath);
    enqueueScopedEvent(
      { type: 'change', path: filePath, force, phase: 'structure' },
      scope,
      tier,
    );
  });

  const slot = [..._projectSlots.values()].find((s) => s.dbPath === dbPath);
  if (slot) {
    slot.needsStructurePass = false;
  }
  return files.length;
}

function ensureHomedirWatcher(): void {
  if (_stopHomedirWatcher || process.env.AIGENIUS_HOMEDIR_INDEX === '0') return;
  const homedir = os.homedir();
  const scope = jobScope(_homedirDbPath, null);
  _stopHomedirWatcher = startWatcher([homedir], (event) => {
    if (shouldSkipSearchIndexing(event.path)) return;
    for (const slot of _projectSlots.values()) {
      if (isPathUnderRoot(event.path, slot.rootPath)) return;
    }
    const db = getDb(_homedirDbPath);
    if (event.type === 'unlink') {
      deleteFile(db, event.path);
      publishIndexerStatus(_homedirDbPath, null);
      return;
    }
    enqueueScopedEvent(event, scope, 'background');
  });
}

async function ensureIndexerInfrastructure(config: {
  modelsDir: string;
  skipImageSearch?: boolean;
  userDataPath?: string;
  workerCount?: number;
}): Promise<void> {
  if (_infraReady) return;

  _modelsDir = config.modelsDir;
  _skipImageSearch = config.skipImageSearch ?? false;
  _userDataPath = config.userDataPath ?? '';
  _homedirDbPath = _userDataPath
    ? homedirIndexDbPath(_userDataPath)
    : path.join(os.homedir(), '.aigenius-homedir-index.sqlite');

  getDb(_homedirDbPath);

  const workerCount = config.workerCount ?? resolveSearchWorkerCountFromEnv();
  console.info(
    `[search] Indexer worker pool: ${workerCount} thread(s) (${Math.round(SEARCH_WORKER_CPU_FRACTION * 100)}% of ${os.cpus().length} logical CPUs unless AIGENIUS_SEARCH_WORKERS is set)`,
  );

  _fileBatcher = new FileWriteBatcher();

  const pool = new WorkerPool(workerCount, _modelsDir, _skipImageSearch);
  pool.start();
  _pool = pool;

  const queue = createTieredIndexQueue(async (item) => {
    await processWatchEvent(item);
  });
  queue.onIdle(() => {
    _fileBatcher?.flushAll();
    scheduleStructurePasses();
    refreshProjectIndexReady();
  });
  _queue = queue;

  ensureHomedirWatcher();

  startStaleEdgeSweepWorker(
    () => getDb(_activeDbPath ?? _homedirDbPath),
    () => (_queue?.pendingCount() ?? 0) === 0,
  );

  startWalMaintenance(() => listOpenDbPaths().map((p) => getDb(p)));

  startEmbedIdleScheduler({
    isQueueIdle: () => (_queue?.pendingCount() ?? 0) === 0,
    listTargets: () => {
      const targets: Array<{ db: ReturnType<typeof getDb>; dbPath: string; pathPrefix: string }> = [];
      if (_activeDbPath && _activeProjectRoot) {
        targets.push({
          db: getDb(_activeDbPath),
          dbPath: _activeDbPath,
          pathPrefix: _activeProjectRoot,
        });
      }
      for (const slot of _projectSlots.values()) {
        if (slot.dbPath === _activeDbPath) continue;
        targets.push({ db: getDb(slot.dbPath), dbPath: slot.dbPath, pathPrefix: slot.rootPath });
      }
      return targets;
    },
    modelsDir: _modelsDir,
  });

  _infraReady = true;
}

function prepareProjectDb(dbPath: string): void {
  const db = getDb(dbPath);
  purgeExemptedFiles(db);
  setSearchStatusDbPath(dbPath);
  refreshSearchStatusFromDb(db);

  try {
    const missingExtRows = db
      .prepare("SELECT path FROM file_index WHERE extension IS NULL OR extension = ''")
      .all() as { path: string }[];
    if (missingExtRows.length > 0) {
      const updateExt = db.prepare('UPDATE file_index SET extension = @ext WHERE path = @path');
      db.transaction(() => {
        for (const row of missingExtRows) {
          const ext = path.extname(row.path).toLowerCase().replace(/^\./, '');
          updateExt.run({ ext, path: row.path });
        }
      })();
    }
  } catch (err) {
    console.warn('[search] Failed to migrate empty extensions:', err);
  }
}

async function attachProjectWatcher(slot: ProjectSlot): Promise<void> {
  if (slot.stopWatcher) return;

  const scope = jobScope(slot.dbPath, slot.rootPath);
  const db = getDb(slot.dbPath);

  slot.stopWatcher = startWatcher([slot.rootPath], (event) => {
    if (shouldSkipSearchIndexing(event.path)) return;

    if (event.type === 'git_branch_switch') {
      console.info('[search] Git branch switch detected — batch re-index', slot.rootPath);
      resetTsMorphProjects();
      markProjectScanStarting(slot);
      void enqueueProjectIndex(slot.rootPath, slot.dbPath, true);
      return;
    }

    if (event.type === 'unlink') {
      console.info('[search] Watcher: file removed', event.path);
      deleteFile(db, event.path);
      publishIndexerStatus(slot.dbPath, slot.rootPath);
      return;
    }

    enqueueScopedEvent(event, scope);
  });
}

export async function registerProjectSlot(config: {
  projectId: string;
  rootPath: string;
  dbPath: string;
  userDataPath?: string;
}): Promise<ProjectSlot> {
  await ensureIndexerInfrastructure({
    modelsDir: _modelsDir || process.env.AIGENIUS_MODELS_DIR || '',
    skipImageSearch: _skipImageSearch,
    userDataPath: config.userDataPath ?? _userDataPath,
  });

  const rootPath = path.normalize(config.rootPath);
  const dbPath = path.normalize(config.dbPath);
  const userData = config.userDataPath ?? _userDataPath;

  if (userData) {
    registerProjectIndex(userData, {
      projectId: config.projectId,
      rootPath,
      dbPath,
    });
  }

  prepareProjectDb(dbPath);

  let slot = _projectSlots.get(dbPath);
  if (!slot) {
    slot = {
      projectId: config.projectId,
      rootPath,
      dbPath,
      stopWatcher: null,
      initialScanDone: false,
      needsStructurePass: false,
      structurePassScheduled: false,
      indexReady: false,
    };
    _projectSlots.set(dbPath, slot);
  } else {
    slot.projectId = config.projectId;
    slot.rootPath = rootPath;
  }

  await attachProjectWatcher(slot);

  if (!slot.initialScanDone) {
    slot.initialScanDone = true;
    slot.needsStructurePass = true;
    slot.structurePassScheduled = false;
    void enqueueProjectIndex(rootPath, dbPath, false);
  }

  return slot;
}

export function setActiveProjectFocus(projectId: string, rootPath: string, dbPath: string): void {
  _activeProjectId = projectId;
  _activeProjectRoot = path.normalize(rootPath);
  _activeDbPath = path.normalize(dbPath);
  if (_userDataPath) {
    setActiveProjectIndexId(_userDataPath, projectId);
  }
  try {
    warmSearchCache(getDb(_activeDbPath), _activeProjectRoot);
  } catch {
    /* db may not exist yet */
  }
  const slot = [..._projectSlots.values()].find((s) => s.dbPath === _activeDbPath);
  if (slot && !slot.indexReady) {
    scheduleStructurePasses();
  }
  publishIndexerStatus(_activeDbPath, _activeProjectRoot);
}

/**
 * Registers the local file search module (legacy single-project bootstrap).
 */
export function registerSearchModule(config: SearchModuleConfig): void {
  const {
    watchPaths,
    dbPath,
    modelsDir,
    workerCount = resolveSearchWorkerCountFromEnv(),
    skipImageSearch = false,
    projectRoot = null,
    userDataPath = '',
  } = config;

  _userDataPath = userDataPath;

  void ensureIndexerInfrastructure({
    modelsDir,
    skipImageSearch,
    userDataPath,
    workerCount,
  }).then(async () => {
    const roots = projectRoot
      ? [projectRoot]
      : watchPaths.filter((p) => p !== os.homedir());

    for (const root of roots) {
      const projectId = path.basename(path.normalize(root)) || 'project';
      await registerProjectSlot({
        projectId,
        rootPath: root,
        dbPath,
        userDataPath,
      });
      setActiveProjectFocus(projectId, root, dbPath);
    }

    if (!roots.length) {
      prepareProjectDb(dbPath);
    } else {
      publishIndexerStatus(dbPath, projectRoot);
    }
  });
}

export async function closeSearchModule(): Promise<void> {
  stopEmbedIdleScheduler();
  stopWalMaintenance();
  _fileBatcher?.flushAll();
  _fileBatcher = null;
  stopStaleEdgeSweepWorker();
  if (_queue) {
    _queue.stop();
    await _queue.waitForIdle(120_000);
    _queue = null;
  }

  for (const slot of _projectSlots.values()) {
    if (slot.stopWatcher) {
      await slot.stopWatcher();
      slot.stopWatcher = null;
    }
  }
  _projectSlots.clear();

  if (_stopHomedirWatcher) {
    await _stopHomedirWatcher();
    _stopHomedirWatcher = null;
  }

  if (_pool) {
    await _pool.terminate();
    _pool = null;
  }

  _activeDbPath = null;
  _activeProjectRoot = null;
  _activeProjectId = null;
  _infraReady = false;
  _modelsDir = '';
  _userDataPath = '';
  _homedirDbPath = '';
  resetSearchStatusSnapshot();
  closeDb();
}

export function getSearchQueue(): TieredQueue {
  if (!_queue) throw new Error('Search queue not initialized');
  return _queue;
}

export function getSearchWatchPaths(): string[] {
  const paths: string[] = [];
  for (const slot of _projectSlots.values()) {
    paths.push(slot.rootPath);
  }
  if (process.env.AIGENIUS_HOMEDIR_INDEX !== '0') {
    paths.push(os.homedir());
  }
  return paths;
}

export function getActiveProjectRoot(): string | null {
  return _activeProjectRoot;
}

export function listProjectSlots(): ProjectSlot[] {
  return [..._projectSlots.values()];
}

export async function switchSearchProject(config: {
  projectId?: string;
  dbPath: string;
  projectRoot: string;
  modelsDir?: string;
  skipImageSearch?: boolean;
  userDataPath?: string;
}): Promise<void> {
  const modelsDir = config.modelsDir ?? _modelsDir ?? process.env.AIGENIUS_MODELS_DIR ?? '';
  const userDataPath = config.userDataPath ?? _userDataPath;
  const projectId = config.projectId?.trim() || path.basename(config.projectRoot) || 'project';

  await ensureIndexerInfrastructure({
    modelsDir,
    skipImageSearch: config.skipImageSearch ?? _skipImageSearch,
    userDataPath,
  });

  await registerProjectSlot({
    projectId,
    rootPath: config.projectRoot,
    dbPath: config.dbPath,
    userDataPath,
  });

  setActiveProjectFocus(projectId, config.projectRoot, config.dbPath);
}

export async function enqueueProjectIndex(
  rootPath: string,
  dbPath: string,
  force = false,
): Promise<number> {
  const files = listProjectFiles(rootPath);
  const scope = jobScope(dbPath, rootPath);
  const slot = [..._projectSlots.values()].find((s) => s.dbPath === dbPath);
  if (slot) {
    markProjectScanStarting(slot);
  }

  const pending = () => _queue?.pendingCount() ?? 0;
  await enqueueWithBackpressure(files, pending, (filePath) => {
    const tier = tierForFilePath(filePath, rootPath);
    enqueueScopedEvent(
      {
        type: 'change',
        path: filePath,
        force,
        phase: 'text',
      },
      scope,
      tier,
    );
  });
  return files.length;
}

export function enqueueReindexPaths(paths: string[], force = false): number {
  let queued = 0;
  for (const filePath of paths) {
    const slot = findSlotForFilePath(filePath);
    if (!slot) continue;
    const scope = jobScope(slot.dbPath, slot.rootPath);
    const tier = tierForFilePath(filePath, slot.rootPath);
    enqueueScopedEvent({ type: 'change', path: filePath, force }, scope, tier);
    queued += 1;
  }
  return queued;
}

export async function bootstrapRegisteredProjects(
  userDataPath: string,
  active?: ProjectIndexEntry | null,
): Promise<void> {
  const registry = loadProjectIndexRegistry(userDataPath);
  const modelsDir = process.env.AIGENIUS_MODELS_DIR ?? '';
  await ensureIndexerInfrastructure({
    modelsDir,
    userDataPath,
    skipImageSearch: process.env.AIGENIUS_SEARCH_IMAGES !== '1',
  });

  const seen = new Set<string>();
  for (const entry of registry.projects) {
    if (!entry.rootPath?.trim()) continue;
    seen.add(entry.dbPath);
    await registerProjectSlot({
      projectId: entry.projectId,
      rootPath: entry.rootPath,
      dbPath: entry.dbPath,
      userDataPath,
    });
  }

  if (active?.rootPath && active.projectId && !seen.has(active.dbPath)) {
    await registerProjectSlot({
      projectId: active.projectId,
      rootPath: active.rootPath,
      dbPath: active.dbPath,
      userDataPath,
    });
  }

  if (active?.projectId && active.rootPath && active.dbPath) {
    setActiveProjectFocus(active.projectId, active.rootPath, active.dbPath);
  }
}
