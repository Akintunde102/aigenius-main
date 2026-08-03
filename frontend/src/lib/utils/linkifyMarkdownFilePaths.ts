import {
  formatLocalPathMarkdownLink,
  isAbsoluteFilesystemPath,
} from '@/lib/utils/localPathLinks';

const FENCED_CODE_BLOCK_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /`([^`\n]+)`/g;

/** True when inline code is an absolute filesystem path the model already resolved. */
export function looksLikeLinkableFilePath(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) {
    return false;
  }
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('local-file://')) {
    return false;
  }
  return isAbsoluteFilesystemPath(trimmed);
}

/** Only absolute paths are linkable — the model must resolve full paths in its markdown links. */
export function resolveLinkableFileAbsolutePath(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed || !isAbsoluteFilesystemPath(trimmed)) {
    return null;
  }
  return trimmed;
}

function linkifyInlineCodeSegment(segment: string): string {
  return segment.replace(INLINE_CODE_RE, (full, inner: string) => {
    const trimmed = inner.trim();
    if (!looksLikeLinkableFilePath(trimmed)) {
      return full;
    }
    const absolute = resolveLinkableFileAbsolutePath(trimmed);
    if (!absolute) {
      return full;
    }
    return formatLocalPathMarkdownLink(absolute, trimmed);
  });
}

/**
 * Rewrites inline `` `C:\full\path` `` / `` `/abs/path` `` spans into `[path](local-file://…)` on desktop.
 * Only absolute paths the model already chose are converted — relative paths are left unchanged
 * so the model must emit proper `[label](local-file://…)` links with a full absolute href.
 */
export function linkifyMarkdownFilePaths(markdown: string): string {
  if (!markdown) {
    return markdown;
  }

  let result = '';
  let lastIndex = 0;
  FENCED_CODE_BLOCK_RE.lastIndex = 0;

  for (const match of Array.from(markdown.matchAll(FENCED_CODE_BLOCK_RE))) {
    const index = match.index ?? 0;
    result += linkifyInlineCodeSegment(markdown.slice(lastIndex, index));
    result += match[0];
    lastIndex = index + match[0].length;
  }

  result += linkifyInlineCodeSegment(markdown.slice(lastIndex));
  return result;
}
