export const DEFAULT_IGNORED_PATHS = [
  'node_modules',
  '.git',
  '.next',
  '.idea',
  '.vscode',
  '.agent',
  '.cursor',
  'dist',
  'build',
  'AppData',
  'Program Files',
  'Program Files (x86)',
  'System32',
  'Library',
  'System',
  'Volumes',
].map(p => p.toLowerCase());

/** Large static ML assets (MicVAD / onnxruntime-web) — never useful in local file search. */
const SEARCH_ASSET_PATH_PATTERNS = [/[/\\]public[/\\]vad[/\\]/i];

export function isIgnored(filePath: string): boolean {
  if (!filePath) return false;
  const parts = filePath.toLowerCase().split(/[\\/]/);
  return DEFAULT_IGNORED_PATHS.some((ignored) => parts.includes(ignored));
}

/** True for standard ignores plus bundled VAD/ORT paths under `public/vad`. */
export function shouldSkipSearchIndexing(filePath: string): boolean {
  if (!filePath) return true;
  if (isIgnored(filePath)) return true;
  return SEARCH_ASSET_PATH_PATTERNS.some((re) => re.test(filePath));
}

/** Like {@link shouldSkipSearchIndexing} but only inspects path relative to a project root. */
export function shouldSkipSearchIndexingRelative(relativePath: string): boolean {
  const norm = relativePath.replace(/\\/g, '/');
  if (!norm || norm.startsWith('..')) return true;
  if (isIgnored(norm)) return true;
  return SEARCH_ASSET_PATH_PATTERNS.some((re) => re.test(norm));
}
