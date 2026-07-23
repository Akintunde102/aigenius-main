import path from 'path';
import { getActiveCodeProjectId, getActiveCodeProjectRootPath } from './active-code-project';
import { loopbackHttpUrl } from './loopback-host';
import { sidecarFetch } from './sidecar-fetch';

export type LocalSearchIndexCatalogEntry = {
  projectId: string;
  rootPath: string;
  indexedFiles: number;
  indexReady: boolean;
  scanInProgress: boolean;
  lastRunMs: number;
  isActive: boolean;
};

export type LocalSearchIndexState = {
  reportedAtIso: string;
  mode: 'active_project_warming' | 'active_project_ready' | 'no_active_project';
  activeProject?: {
    projectId: string;
    rootPath: string;
    indexedFiles: number;
    indexReady: boolean;
    scanInProgress: boolean;
    lastRunMs: number;
  };
  catalogs: LocalSearchIndexCatalogEntry[];
};

type StatusProject = {
  project_id?: string;
  project_root?: string;
  indexed?: number;
  last_run?: number;
  is_active?: boolean;
  index_ready?: boolean;
};

type SearchStatusPayload = {
  indexed?: number;
  lastRun?: number;
  scan_in_progress?: boolean;
  queue_depth?: number;
  project_root?: string | null;
  active_project_id?: string | null;
  projects?: StatusProject[];
  health?: { indexer_ipc_reachable?: boolean };
};

function normalizeRoot(p: string): string {
  return path.normalize(p).replace(/\\/g, '/').toLowerCase();
}

export async function fetchLocalSearchIndexState(): Promise<LocalSearchIndexState> {
  const reportedAtIso = new Date().toISOString();
  const activeRoot = getActiveCodeProjectRootPath();
  const activeId = getActiveCodeProjectId() ?? '';

  let status: SearchStatusPayload | null = null;
  try {
    const port = process.env.AIGENIUS_MINI_SERVER_PORT ?? '8001';
    const res = await sidecarFetch(loopbackHttpUrl(port, '/search/status'));
    if (res.ok) {
      status = (await res.json()) as SearchStatusPayload;
    }
  } catch {
    status = null;
  }

  const scanInProgress = Boolean(
    status?.scan_in_progress || (typeof status?.queue_depth === 'number' && status.queue_depth > 0),
  );

  const catalogs: LocalSearchIndexCatalogEntry[] = (status?.projects ?? []).map((p) => ({
    projectId: p.project_id ?? path.basename(p.project_root ?? '') ?? 'project',
    rootPath: p.project_root ?? '',
    indexedFiles: typeof p.indexed === 'number' ? p.indexed : 0,
    indexReady: p.index_ready === true,
    scanInProgress,
    lastRunMs: typeof p.last_run === 'number' ? p.last_run : 0,
    isActive: p.is_active === true,
  }));

  if (!activeRoot?.trim()) {
    return {
      reportedAtIso,
      mode: 'no_active_project',
      catalogs,
    };
  }

  const activeNorm = normalizeRoot(activeRoot);
  const activeFromStatus = catalogs.find(
    (c) => c.rootPath && normalizeRoot(c.rootPath) === activeNorm,
  );

  const indexedFiles = activeFromStatus?.indexedFiles
    ?? (typeof status?.indexed === 'number' && status.project_root
      && normalizeRoot(status.project_root) === activeNorm
      ? status.indexed
      : 0);

  const indexReady = activeFromStatus?.indexReady === true
    && !scanInProgress
    && status?.health?.indexer_ipc_reachable !== false;

  const activeProject = {
    projectId: activeId || activeFromStatus?.projectId || path.basename(activeRoot),
    rootPath: activeRoot,
    indexedFiles,
    indexReady,
    scanInProgress,
    lastRunMs: activeFromStatus?.lastRunMs ?? (typeof status?.lastRun === 'number' ? status.lastRun : 0),
  };

  return {
    reportedAtIso,
    mode: indexReady ? 'active_project_ready' : 'active_project_warming',
    activeProject,
    catalogs,
  };
}
