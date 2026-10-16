import path from 'path';
import {
  homedirIndexDbPath,
  loadProjectIndexRegistry,
  resolveProjectDbPath,
  type ResolveDbPathOptions,
} from './project-index-registry.js';
import { readIndexerStatusFile } from './indexer-status-file.js';
import { readDeviceFastIndexReadiness } from './indexer/device-fast-index-readiness.js';
import { isPathUnderAnyRoot } from './device-fast-index-db-routing.js';

export type SemanticIndexScope = 'device_pocket' | 'project' | 'legacy';

export type SemanticIndexGuardResult =
  | { allowed: true; dbPath: string; scope: SemanticIndexScope }
  | { allowed: false; httpStatus: 400 | 503; error: string };

function normalizeDbPath(p: string): string {
  return path.normalize(p).replace(/\\/g, '/').toLowerCase();
}

export function checkSemanticIndexAccess(
  userData: string,
  opts: Pick<ResolveDbPathOptions, 'pathPrefix' | 'filePath' | 'rootPath' | 'projectId'>,
  kind: 'rag' | 'symbols',
): SemanticIndexGuardResult {
  const dbPath = resolveProjectDbPath({ ...opts, userData });
  const status = userData ? readIndexerStatusFile(userData) : null;
  const queueByTier = status?.queue_by_tier;
  const device = readDeviceFastIndexReadiness(userData, queueByTier);
  const homedirDb = userData ? homedirIndexDbPath(userData) : '';

  const isHomedirDb = homedirDb && normalizeDbPath(dbPath) === normalizeDbPath(homedirDb);

  if (isHomedirDb) {
    if (device.mode !== 'ready') {
      return {
        allowed: false,
        httpStatus: 503,
        error:
          'Device fast index is still building for Desktop/Documents/Downloads and planner folders. '
          + 'Use local_grep and local_read_file, or retry after pocket indexing finishes.',
      };
    }
    return { allowed: true, dbPath, scope: 'device_pocket' };
  }

  const registry = loadProjectIndexRegistry(userData);
  const projectEntry = registry.projects.find(
    (p) => normalizeDbPath(p.dbPath) === normalizeDbPath(dbPath),
  );

  if (projectEntry) {
    const fromStatus = status?.projects?.find(
      (p) => normalizeDbPath(p.db_path) === normalizeDbPath(dbPath),
    );
    const indexReady = fromStatus?.index_ready === true;
    if (!indexReady) {
      const pathHint = opts.pathPrefix || opts.filePath || projectEntry.rootPath;
      const underPocket =
        device.mode === 'ready'
        && device.roots.length > 0
        && typeof pathHint === 'string'
        && isPathUnderAnyRoot(pathHint, device.roots);
      if (kind === 'rag' && underPocket) {
        return {
          allowed: false,
          httpStatus: 400,
          error:
            'This path is under a registered code project whose index is still building. '
            + 'Scope local_rag_query to a device pocket folder (Desktop, Documents, Downloads, …) '
            + 'or use local_grep under the project root until the project index is ready.',
        };
      }
      return {
        allowed: false,
        httpStatus: 503,
        error:
          'Project search index is still building for this path. '
          + 'Use local_grep and local_read_file under the project root, or wait for index_ready.',
      };
    }
    return { allowed: true, dbPath, scope: 'project' };
  }

  if (kind === 'symbols') {
    return {
      allowed: false,
      httpStatus: 503,
      error: 'Symbol index tools require a ready code project index for this path.',
    };
  }

  return { allowed: true, dbPath, scope: 'legacy' };
}
