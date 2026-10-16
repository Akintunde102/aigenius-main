import fs from 'fs';
import path from 'path';
import { baselineFastIndexDirectories } from './device-known-folders.js';
import { buildDeviceFolderStructureMap } from './device-folder-structure-map.js';
import { planAdditionalFastIndexDirectories } from './device-pocket-openrouter.js';
import { loadProjectIndexRegistry } from '../project-index-registry.js';
import { shouldSkipSearchIndexing } from './exemptions.js';
import { isDeviceFastIndexEnabled } from './device-fast-index-enabled.js';

const DEVICE_MAX_POCKET_FILES = 1_200;
const MAX_DEPTH = 3;
const MAX_FILES_PER_DIR = 200;

export type DeviceFastIndexPocketState = {
  updated_at_ms: number;
  baseline_directories: string[];
  model_suggested_directories: string[];
  planner_model: string | null;
  last_planner_run_ms: number | null;
  last_planner_error: string | null;
  /** Hy3 install planner finished successfully at least once. */
  install_planner_completed: boolean;
  install_planner_app_version: string | null;
};

let activeFastDirectories: string[] = [];

function stateFilePath(userDataPath: string): string {
  return path.join(userDataPath, 'device-fast-index-pocket.json');
}

export function loadDeviceFastIndexPocketState(userDataPath: string): DeviceFastIndexPocketState | null {
  if (!userDataPath) return null;
  try {
    const raw = fs.readFileSync(stateFilePath(userDataPath), 'utf8');
    return normalizeLoadedState(JSON.parse(raw) as DeviceFastIndexPocketState);
  } catch {
    return null;
  }
}

export function saveDeviceFastIndexPocketState(
  userDataPath: string,
  state: DeviceFastIndexPocketState,
): void {
  if (!userDataPath) return;
  const target = stateFilePath(userDataPath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf8');
  try {
    fs.renameSync(tmp, target);
  } catch {
    fs.copyFileSync(tmp, target);
    fs.unlinkSync(tmp);
  }
}

export function getDeviceFastIndexDirectories(): string[] {
  return [...activeFastDirectories];
}

export function isUnderDeviceFastIndexDirectory(filePath: string): boolean {
  const norm = path.normalize(filePath);
  for (const root of activeFastDirectories) {
    const normRoot = path.normalize(root);
    if (process.platform === 'win32') {
      const rel = path.relative(normRoot.toLowerCase(), norm.toLowerCase());
      if (!rel.startsWith('..') && !path.isAbsolute(rel)) return true;
    } else {
      const rel = path.relative(normRoot, norm);
      if (!rel.startsWith('..') && !path.isAbsolute(rel)) return true;
    }
  }
  return false;
}

function collectShallowFilesInDir(dirPath: string, out: string[], depth: number): void {
  if (out.length >= DEVICE_MAX_POCKET_FILES || depth > MAX_DEPTH) return;

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  let addedHere = 0;
  for (const ent of entries) {
    if (out.length >= DEVICE_MAX_POCKET_FILES || addedHere >= MAX_FILES_PER_DIR) break;
    const abs = path.join(dirPath, ent.name);
    if (shouldSkipSearchIndexing(abs)) continue;
    if (ent.isFile()) {
      out.push(abs);
      addedHere += 1;
    } else if (ent.isDirectory()) {
      collectShallowFilesInDir(abs, out, depth + 1);
    }
  }
}

function dedupePaths(paths: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const p of paths) {
    const norm = path.normalize(p);
    const key = process.platform === 'win32' ? norm.toLowerCase() : norm;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(norm);
    }
  }
  return result;
}

export function collectDeviceFastIndexPocketFiles(directories: string[]): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const dir of directories) {
    if (ordered.length >= DEVICE_MAX_POCKET_FILES) break;
    const root = path.normalize(dir);
    try {
      if (!fs.statSync(root).isDirectory()) continue;
    } catch {
      continue;
    }
    const batch: string[] = [];
    collectShallowFilesInDir(root, batch, 0);
    for (const p of batch) {
      const norm = path.normalize(p);
      const key = process.platform === 'win32' ? norm.toLowerCase() : norm;
      if (seen.has(key)) continue;
      seen.add(key);
      ordered.push(norm);
      if (ordered.length >= DEVICE_MAX_POCKET_FILES) break;
    }
  }
  return ordered;
}

function mergeEffectiveDirectories(state: DeviceFastIndexPocketState | null): string[] {
  const baseline = baselineFastIndexDirectories();
  const suggested = state?.model_suggested_directories ?? [];
  return dedupePaths([...baseline, ...suggested]);
}

/** Persisted + baseline device fast-index roots (for search DB routing). */
export function listDeviceFastIndexRoots(userData?: string): string[] {
  const state = userData ? loadDeviceFastIndexPocketState(userData) : null;
  const fromState = state
    ? [...(state.baseline_directories ?? []), ...(state.model_suggested_directories ?? [])]
    : [];
  const merged = dedupePaths([...baselineFastIndexDirectories(), ...fromState]);
  return merged.filter((p) => {
    try {
      return fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  });
}

export function shouldRunInstallPocketPlanner(state: DeviceFastIndexPocketState | null): boolean {
  if (process.env.AIGENIUS_DEVICE_POCKET_PLANNER === '0') return false;
  if (state?.install_planner_completed === true) return false;
  if (!process.env.OPENROUTER_API_KEY?.trim() && !process.env.PROVIDER_OPENROUTER_API_KEY?.trim()) {
    return false;
  }
  return true;
}

function normalizeLoadedState(raw: DeviceFastIndexPocketState | null): DeviceFastIndexPocketState | null {
  if (!raw) return null;
  return {
    ...raw,
    install_planner_completed: raw.install_planner_completed === true,
    install_planner_app_version: raw.install_planner_app_version ?? null,
  };
}

export type DevicePocketBootstrapResult = {
  directories: string[];
  filesQueued: number;
  plannerScheduled: boolean;
};

export async function bootstrapDeviceFastIndexPocket(
  userDataPath: string,
  enqueueFiles: (paths: string[]) => number,
): Promise<DevicePocketBootstrapResult> {
  if (!isDeviceFastIndexEnabled()) {
    activeFastDirectories = [];
    return { directories: [], filesQueued: 0, plannerScheduled: false };
  }

  const state = loadDeviceFastIndexPocketState(userDataPath);
  activeFastDirectories = mergeEffectiveDirectories(state);
  const files = collectDeviceFastIndexPocketFiles(activeFastDirectories);
  const filesQueued = enqueueFiles(files);

  console.info(
    `[device-pocket] Fast index dirs (${activeFastDirectories.length}):`,
    activeFastDirectories.join('; ') || '(none)',
  );

  return { directories: activeFastDirectories, filesQueued, plannerScheduled: false };
}

/** One-time Hy3 folder mapping after install (or until it succeeds). */
export async function runInstallDevicePocketPlanner(
  userDataPath: string,
  enqueueFiles: (paths: string[]) => number,
  appVersion?: string,
): Promise<{ ran: boolean; completed: boolean; error: string | null }> {
  if (!isDeviceFastIndexEnabled() || !userDataPath) {
    return { ran: false, completed: false, error: null };
  }
  const state = loadDeviceFastIndexPocketState(userDataPath);
  if (!shouldRunInstallPocketPlanner(state)) {
    return { ran: false, completed: state?.install_planner_completed === true, error: null };
  }
  const err = await runDevicePocketPlanner(userDataPath, enqueueFiles, appVersion, true);
  return { ran: true, completed: err === null, error: err };
}

async function runDevicePocketPlanner(
  userDataPath: string,
  enqueueFiles: (paths: string[]) => number,
  appVersion?: string,
  markInstallCompleteOnSuccess = false,
): Promise<string | null> {
  const map = buildDeviceFolderStructureMap();
  const prev = loadDeviceFastIndexPocketState(userDataPath);
  const baseline = baselineFastIndexDirectories();

  let plannerError: string | null = null;
  let suggested: string[] = prev?.model_suggested_directories ?? [];
  let plannerModel: string | null = prev?.planner_model ?? null;

  try {
    const registry = loadProjectIndexRegistry(userDataPath);
    const result = await planAdditionalFastIndexDirectories(map, undefined, {
      existingSuggestedDirectories: prev?.model_suggested_directories ?? [],
      registeredCodeProjectRoots: registry.projects.map((p) => p.rootPath),
    });
    suggested = dedupePaths([
      ...(prev?.model_suggested_directories ?? []),
      ...result.additionalDirectories,
    ]);
    plannerModel = result.model;
    console.info(
      '[device-pocket] Hy3 suggested extra dirs:',
      suggested.join('; ') || '(none)',
    );
  } catch (err) {
    plannerError = err instanceof Error ? err.message : String(err);
  }

  const version =
    appVersion?.trim()
    || process.env.AIGENIUS_APP_VERSION?.trim()
    || null;
  const nextState: DeviceFastIndexPocketState = {
    updated_at_ms: Date.now(),
    baseline_directories: baseline,
    model_suggested_directories: suggested,
    planner_model: plannerModel,
    last_planner_run_ms: Date.now(),
    last_planner_error: plannerError,
    install_planner_completed:
      markInstallCompleteOnSuccess && plannerError === null
        ? true
        : (prev?.install_planner_completed === true),
    install_planner_app_version:
      markInstallCompleteOnSuccess && plannerError === null
        ? version
        : (prev?.install_planner_app_version ?? null),
  };
  saveDeviceFastIndexPocketState(userDataPath, nextState);

  const toKey = (p: string) => (process.platform === 'win32' ? path.normalize(p).toLowerCase() : path.normalize(p));
  const prevKeys = new Set(mergeEffectiveDirectories(prev).map(toKey));
  activeFastDirectories = mergeEffectiveDirectories(nextState);
  const newDirs = activeFastDirectories.filter((d) => !prevKeys.has(toKey(d)));
  if (newDirs.length > 0) {
    const extraFiles = collectDeviceFastIndexPocketFiles(newDirs);
    const queued = enqueueFiles(extraFiles);
    console.info(`[device-pocket] Enqueued ${queued} files from ${newDirs.length} new planner dir(s).`);
  }
  return plannerError;
}

export function getDeviceFastIndexPocketStatus(userDataPath: string): {
  directories: string[];
  state: DeviceFastIndexPocketState | null;
} {
  const state = userDataPath ? loadDeviceFastIndexPocketState(userDataPath) : null;
  const directories = activeFastDirectories.length
    ? [...activeFastDirectories]
    : mergeEffectiveDirectories(state);
  return { directories, state };
}
