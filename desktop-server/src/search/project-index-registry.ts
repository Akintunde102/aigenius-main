import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export type ProjectIndexEntry = {
  projectId: string;
  rootPath: string;
  dbPath: string;
  registeredAtMs: number;
};

type RegistryFile = {
  version: 1;
  activeProjectId: string | null;
  projects: ProjectIndexEntry[];
};

const REGISTRY_VERSION = 1 as const;

function registryPath(userData: string): string {
  return path.join(userData, 'project-index-registry.json');
}

function normalizeRoot(rootPath: string): string {
  return path.normalize(rootPath).replace(/\\/g, '/').toLowerCase();
}

export function projectIndexDbPath(userData: string, projectId: string): string {
  return path.join(userData, 'search-indexes', `${projectId}.sqlite`);
}

export function homedirIndexDbPath(userData: string): string {
  return path.join(userData, 'homedir-index.sqlite');
}

export function defaultLegacyDbPath(userData: string): string {
  return path.join(userData, 'search-index.sqlite');
}

function emptyRegistry(): RegistryFile {
  return { version: REGISTRY_VERSION, activeProjectId: null, projects: [] };
}

export function loadProjectIndexRegistry(userData: string): RegistryFile {
  if (!userData) return emptyRegistry();
  try {
    const raw = fs.readFileSync(registryPath(userData), 'utf8');
    const parsed = JSON.parse(raw) as RegistryFile;
    if (!parsed || parsed.version !== REGISTRY_VERSION || !Array.isArray(parsed.projects)) {
      return emptyRegistry();
    }
    return {
      version: REGISTRY_VERSION,
      activeProjectId: typeof parsed.activeProjectId === 'string' ? parsed.activeProjectId : null,
      projects: parsed.projects.filter(
        (p) => p?.projectId && p?.rootPath && p?.dbPath,
      ),
    };
  } catch {
    return emptyRegistry();
  }
}

function saveRegistry(userData: string, registry: RegistryFile): void {
  if (!userData) return;
  fs.mkdirSync(userData, { recursive: true });
  const target = registryPath(userData);
  const tmp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(registry), 'utf8');
  try {
    fs.renameSync(tmp, target);
  } catch {
    if (fs.existsSync(target)) fs.unlinkSync(target);
    fs.renameSync(tmp, target);
  }
}

export function registerProjectIndex(
  userData: string,
  entry: { projectId: string; rootPath: string; dbPath?: string },
): ProjectIndexEntry {
  const registry = loadProjectIndexRegistry(userData);
  const dbPath = entry.dbPath?.trim() || projectIndexDbPath(userData, entry.projectId);
  const rootPath = path.normalize(entry.rootPath);
  const norm = normalizeRoot(rootPath);
  const now = Date.now();

  const existingIdx = registry.projects.findIndex(
    (p) => p.projectId === entry.projectId || normalizeRoot(p.rootPath) === norm,
  );

  const record: ProjectIndexEntry = {
    projectId: entry.projectId,
    rootPath,
    dbPath,
    registeredAtMs: now,
  };

  if (existingIdx >= 0) {
    registry.projects[existingIdx] = { ...registry.projects[existingIdx]!, ...record };
  } else {
    registry.projects.push(record);
  }

  saveRegistry(userData, registry);
  return record;
}

export function setActiveProjectIndexId(userData: string, projectId: string | null): void {
  const registry = loadProjectIndexRegistry(userData);
  registry.activeProjectId = projectId;
  saveRegistry(userData, registry);
}

export function listRegisteredProjectIndexes(userData: string): ProjectIndexEntry[] {
  const registry = loadProjectIndexRegistry(userData);
  const byDb = new Map<string, ProjectIndexEntry>();

  for (const entry of registry.projects) {
    byDb.set(entry.dbPath, entry);
  }

  const indexesDir = path.join(userData, 'search-indexes');
  try {
    for (const name of fs.readdirSync(indexesDir)) {
      if (!name.endsWith('.sqlite')) continue;
      const dbPath = path.join(indexesDir, name);
      if (byDb.has(dbPath)) continue;
      const projectId = name.slice(0, -'.sqlite'.length);
      byDb.set(dbPath, {
        projectId,
        rootPath: '',
        dbPath,
        registeredAtMs: 0,
      });
    }
  } catch {
    /* indexes dir may not exist yet */
  }

  return [...byDb.values()].sort((a, b) => a.rootPath.localeCompare(b.rootPath));
}

function findEntryForPathPrefix(
  registry: RegistryFile,
  candidatePath: string,
): ProjectIndexEntry | null {
  const norm = normalizeRoot(path.isAbsolute(candidatePath) ? candidatePath : candidatePath);
  let best: ProjectIndexEntry | null = null;
  let bestLen = -1;

  for (const entry of registry.projects) {
    const rootNorm = normalizeRoot(entry.rootPath);
    if (!rootNorm) continue;
    if (norm === rootNorm || norm.startsWith(`${rootNorm}/`)) {
      if (rootNorm.length > bestLen) {
        best = entry;
        bestLen = rootNorm.length;
      }
    }
  }
  return best;
}

export type ResolveDbPathOptions = {
  userData?: string;
  projectId?: string;
  rootPath?: string;
  pathPrefix?: string;
  filePath?: string;
  fallbackDbPath?: string;
};

/** Pick the SQLite file for a search query — never blocks on the indexer. */
export function resolveProjectDbPath(opts: ResolveDbPathOptions): string {
  const userData = opts.userData?.trim() ?? process.env.AIGENIUS_USER_DATA_PATH ?? '';
  const fallback =
    opts.fallbackDbPath?.trim()
    || process.env.AIGENIUS_DB_PATH?.trim()
    || (userData ? defaultLegacyDbPath(userData) : '');

  if (opts.projectId?.trim() && userData) {
    return projectIndexDbPath(userData, opts.projectId.trim());
  }

  const registry = loadProjectIndexRegistry(userData);

  if (opts.rootPath?.trim()) {
    const norm = normalizeRoot(opts.rootPath.trim());
    const hit = registry.projects.find((p) => normalizeRoot(p.rootPath) === norm);
    if (hit) return hit.dbPath;
  }

  for (const candidate of [opts.rootPath, opts.pathPrefix, opts.filePath]) {
    if (typeof candidate === 'string' && candidate.trim()) {
      const trimmed = candidate.trim();
      if (path.isAbsolute(trimmed) && userData) {
        try {
          if (fs.statSync(trimmed).isDirectory()) {
            ensureProjectRegisteredFromPath(userData, trimmed);
          }
        } catch {
          /* not a directory */
        }
      }
      const hit = findEntryForPathPrefix(loadProjectIndexRegistry(userData), trimmed);
      if (hit) return hit.dbPath;
    }
  }

  if (registry.activeProjectId) {
    const active = registry.projects.find((p) => p.projectId === registry.activeProjectId);
    if (active) return active.dbPath;
  }

  return fallback;
}

export function stableProjectIdForRoot(rootPath: string): string {
  const norm = normalizeRoot(path.normalize(rootPath));
  return crypto.createHash('sha256').update(norm).digest('hex').slice(0, 32);
}

export function ensureProjectRegisteredFromPath(
  userData: string,
  rootPath: string,
): ProjectIndexEntry | null {
  if (!userData || !rootPath?.trim()) return null;
  const norm = path.normalize(rootPath.trim());
  try {
    if (!fs.statSync(norm).isDirectory()) return null;
  } catch {
    return null;
  }

  const existing = findRegistryEntryByRoot(userData, norm);
  if (existing) return existing;

  return registerProjectIndex(userData, {
    projectId: stableProjectIdForRoot(norm),
    rootPath: norm,
  });
}

export function findRegistryEntryByRoot(
  userData: string,
  rootPath: string,
): ProjectIndexEntry | null {
  const norm = normalizeRoot(rootPath);
  return loadProjectIndexRegistry(userData).projects.find(
    (p) => normalizeRoot(p.rootPath) === norm,
  ) ?? null;
}
