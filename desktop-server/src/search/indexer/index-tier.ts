import path from 'path';

/** Index scheduling tier — lower numeric priority runs first. */
export type IndexTier =
  | 'project_core'
  | 'project_docs'
  | 'project_media'
  | 'idle_project'
  | 'background';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'tif', 'gif']);
const DOC_EXTENSIONS = new Set(['pdf', 'docx']);

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'mdx', 'markdown', 'rst', 'csv', 'json', 'jsonl',
  'yaml', 'yml', 'toml', 'ini', 'conf', 'env',
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'c', 'cpp', 'h', 'hpp', 'cs',
  'html', 'htm', 'css', 'scss', 'less', 'xml', 'svg',
  'sh', 'bash', 'zsh', 'fish', 'bat', 'ps1',
  'sql', 'graphql', 'proto',
]);

export const TIER_PROCESS_ORDER: IndexTier[] = [
  'project_core',
  'project_docs',
  'project_media',
  'idle_project',
  'background',
];

/** Pause between files per tier (ms). Docs/media/background are intentionally slow. */
export const TIER_INTER_ITEM_DELAY_MS: Record<IndexTier, number> = {
  project_core: 0,
  project_docs: 800,
  project_media: 4_000,
  idle_project: 3_000,
  /** Homedir / non-project paths — lowest priority, minimal CPU impact */
  background: 45_000,
};

export function isPathUnderRoot(filePath: string, rootPath: string | null | undefined): boolean {
  if (!rootPath?.trim()) return false;
  const rel = path.relative(path.resolve(rootPath), path.resolve(filePath));
  return !rel.startsWith('..') && !path.isAbsolute(rel);
}

export function tierForFilePath(filePath: string, projectRoot: string | null): IndexTier {
  if (!isPathUnderRoot(filePath, projectRoot)) {
    return 'background';
  }
  const ext = path.extname(filePath).toLowerCase().replace(/^\./, '');
  if (IMAGE_EXTENSIONS.has(ext)) return 'project_media';
  if (DOC_EXTENSIONS.has(ext)) return 'project_docs';
  if (TEXT_EXTENSIONS.has(ext) || ext === '') return 'project_core';
  return 'project_core';
}

/** Demote inactive registered projects so active project search/indexing stays responsive. */
export function tierForInactiveProject(baseTier: IndexTier): IndexTier {
  if (baseTier === 'background') return 'background';
  return 'idle_project';
}
