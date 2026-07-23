import {
  formatLocalPathMarkdownLink,
  isAbsoluteFilesystemPath,
} from '@/lib/utils/localPathLinks';

const FENCED_CODE_BLOCK_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`([^`\n]+)`/g;

const GIT_BRANCH_PREFIX_RE =
  /^(feat|fix|chore|docs|style|refactor|test|ci|build|perf|revert|hotfix|release)\//i;

export type LinkifyMarkdownFilePathsOptions = {
  /** Active code project root; required to resolve repo-relative paths. */
  projectRoot?: string | null;
};

function normalizeSlashes(value: string): string {
  return value.replace(/\\/g, '/');
}

function joinFilesystemPath(root: string, relative: string): string {
  const rootNorm = root.replace(/\\/g, '/').replace(/\/+$/, '');
  const relNorm = relative.replace(/\\/g, '/').replace(/^\.?\//, '');
  const joined = `${rootNorm}/${relNorm}`;
  return root.includes('\\') ? joined.replace(/\//g, '\\') : joined;
}

function looksLikeGitBranch(value: string): boolean {
  const normalized = normalizeSlashes(value);
  if (!GIT_BRANCH_PREFIX_RE.test(normalized)) {
    return false;
  }
  return !/\.[A-Za-z0-9]{1,16}$/.test(normalized);
}

/** True when inline code likely names a file or directory (not a symbol, branch, or URL). */
export function looksLikeLinkableFilePath(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return false;
  }
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('local-file://')) {
    return false;
  }
  if (isAbsoluteFilesystemPath(trimmed)) {
    return true;
  }

  const normalized = normalizeSlashes(trimmed);
  if (/\.[A-Za-z0-9]{1,16}$/.test(normalized)) {
    return true;
  }
  if (normalized.includes('/')) {
    return !looksLikeGitBranch(normalized);
  }
  return /^[\w@][\w.-]*\.[a-z0-9]{1,16}$/i.test(normalized);
}

export function resolveLinkableFileAbsolutePath(
  input: string,
  projectRoot?: string | null,
): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }
  if (isAbsoluteFilesystemPath(trimmed)) {
    return trimmed;
  }
  if (!projectRoot?.trim()) {
    return null;
  }
  return joinFilesystemPath(projectRoot.trim(), trimmed);
}

function linkifyInlineCodeSegment(
  segment: string,
  options: LinkifyMarkdownFilePathsOptions,
): string {
  return segment.replace(INLINE_CODE_RE, (full, inner: string) => {
    const trimmed = inner.trim();
    if (!looksLikeLinkableFilePath(trimmed)) {
      return full;
    }
    const absolute = resolveLinkableFileAbsolutePath(trimmed, options.projectRoot);
    if (!absolute) {
      return full;
    }
    return formatLocalPathMarkdownLink(absolute, trimmed);
  });
}

/**
 * Rewrites inline `` `path` `` spans into `[path](local-file://…)` preview links on desktop.
 * Skips fenced code blocks and leaves non-path inline code unchanged.
 */
export function linkifyMarkdownFilePaths(
  markdown: string,
  options: LinkifyMarkdownFilePathsOptions = {},
): string {
  if (!markdown) {
    return markdown;
  }

  let result = '';
  let lastIndex = 0;
  FENCED_CODE_BLOCK_RE.lastIndex = 0;

  for (const match of markdown.matchAll(FENCED_CODE_BLOCK_RE)) {
    const index = match.index ?? 0;
    result += linkifyInlineCodeSegment(markdown.slice(lastIndex, index), options);
    result += match[0];
    lastIndex = index + match[0].length;
  }

  result += linkifyInlineCodeSegment(markdown.slice(lastIndex), options);
  return result;
}
