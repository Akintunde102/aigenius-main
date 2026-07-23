import { getActiveCodeProject } from '@/lib/code-projects/active-code-project';
import type { ExplorerItem } from './FilePreviewExplorer';
import { parentDir } from './file-preview-fs';

type BridgeResult = { ok: boolean; error?: string; result?: string; rawData?: unknown };

function getBridge() {
  return (typeof window !== 'undefined' ? (window as any).aigeniusDesktop : null) as {
    runLocalDesktopTool?: (payload: { tool: string; arguments: Record<string, unknown> }) => Promise<BridgeResult>;
  } | null;
}

export function normalizeExplorerPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export function canonicalDirKey(dirPath: string): string {
  return normalizeExplorerPath(dirPath).replace(/\/+$/, '').toLowerCase();
}

export function pathsEqual(a: string, b: string): boolean {
  return canonicalDirKey(a) === canonicalDirKey(b);
}

export function isPathInside(child: string, parent: string): boolean {
  const childNorm = normalizeExplorerPath(child).toLowerCase();
  const parentNorm = normalizeExplorerPath(parent).toLowerCase().replace(/\/+$/, '');
  return childNorm === parentNorm || childNorm.startsWith(`${parentNorm}/`);
}

export function restorePathSeparator(normalizedPath: string, referencePath: string): string {
  return referencePath.includes('\\') ? normalizedPath.replace(/\//g, '\\') : normalizedPath;
}

export function pickMoreSpecificRoot(candidateA: string, candidateB: string): string {
  if (pathsEqual(candidateA, candidateB)) return candidateA;
  if (isPathInside(candidateB, candidateA)) return candidateB;
  if (isPathInside(candidateA, candidateB)) return candidateA;
  return candidateA;
}

export function resolveExplorerRoot(localPath: string, targetIsDirectory = false): string {
  const naturalRoot = targetIsDirectory
    ? localPath
    : (parentDir(localPath) || localPath);

  const project = getActiveCodeProject();
  if (project?.rootPath && isPathInside(localPath, project.rootPath)) {
    return pickMoreSpecificRoot(naturalRoot, project.rootPath);
  }

  return naturalRoot;
}

export function getDirectoriesToReveal(
  targetPath: string,
  rootPath: string,
  targetIsDirectory = false,
): string[] {
  const rootNorm = normalizeExplorerPath(rootPath).replace(/\/+$/, '');
  const targetNorm = normalizeExplorerPath(targetPath).replace(/\/+$/, '');
  const dirs = [rootPath];

  if (!isPathInside(targetPath, rootPath) || targetNorm === rootNorm) {
    return dirs;
  }

  const relative = targetNorm.slice(rootNorm.length + 1);
  if (!relative) return dirs;

  const segments = relative.split('/').filter(Boolean);
  if (!targetIsDirectory && segments.length > 0) {
    segments.pop();
  }

  let current = rootNorm;
  for (const segment of segments) {
    current = `${current}/${segment}`;
    dirs.push(restorePathSeparator(current, targetPath));
  }
  return dirs;
}

export function sortExplorerItems(items: ExplorerItem[]): ExplorerItem[] {
  return [...items].sort((a, b) =>
    a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1,
  );
}

export async function listDirectory(path: string, limit = 300): Promise<ExplorerItem[] | null> {
  const bridge = getBridge();
  if (!bridge?.runLocalDesktopTool) return null;

  const res = await bridge.runLocalDesktopTool({
    tool: 'local_list_directory',
    arguments: { path, limit },
  });

  if (!res.ok) return null;

  const data = (res.rawData ?? JSON.parse(res.result || '{}')) as { items?: ExplorerItem[] };
  return sortExplorerItems(
    (data.items ?? []).filter((item) => !pathsEqual(item.path, path)),
  );
}
