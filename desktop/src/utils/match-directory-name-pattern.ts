/**
 * Basename matching for `local_list_directory` `pattern`.
 *
 * Globs only: `*` any run of chars, `?` one char, `[N-Z]` / `[!abc]` character classes.
 * Other regex metacharacters are literal. Matching is case-insensitive and anchored.
 * Slash-delimited and `^…` regex forms are not compiled — they are treated as globs
 * (so `/Aluko|Kenna/` matches a name of that exact glob, not an alternation).
 */

export const DIRECTORY_NAME_PATTERN_MAX_LENGTH = 256;

export type CompiledNamePattern =
  | { kind: 'all' }
  | { kind: 'none' }
  | { kind: 're'; re: RegExp };

function lastPathSegment(pattern: string): string {
  const parts = pattern.replace(/\\/g, '/').split('/').filter((part) => part.length > 0);
  return parts.length > 0 ? parts[parts.length - 1] : '';
}

function escapeRegexLiteral(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseGlobToRegexSource(segment: string): string {
  let source = '';
  let inClass = false;

  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];

    if (ch === '[' && !inClass) {
      const closeIdx = segment.indexOf(']', i + 1);
      if (closeIdx > i + 1) {
        inClass = true;
        source += '[';
        if (segment[i + 1] === '^' || segment[i + 1] === '!') {
          source += '^';
          i += 1;
        }
        continue;
      }
    }

    if (ch === ']' && inClass) {
      inClass = false;
      source += ']';
      continue;
    }

    if (inClass) {
      if (ch === '\\') {
        source += '\\\\';
      } else if (ch === '-' && i + 1 < segment.length && segment[i + 1] !== ']') {
        source += '-';
      } else {
        source += escapeRegexLiteral(ch);
      }
      continue;
    }

    if (ch === '*') {
      source += '.*';
      continue;
    }
    if (ch === '?') {
      source += '.';
      continue;
    }

    source += escapeRegexLiteral(ch);
  }

  if (inClass) {
    return segment
      .split('')
      .map((c) => (c === '*' ? '.*' : c === '?' ? '.' : escapeRegexLiteral(c)))
      .join('');
  }

  return `^${source}$`;
}

export function globToDirectoryNameRegExp(pattern: string): RegExp | null {
  if (typeof pattern !== 'string') return null;
  const segment = lastPathSegment(pattern.trim());
  if (!segment) return null;

  try {
    return new RegExp(parseGlobToRegexSource(segment), 'i');
  } catch {
    return null;
  }
}

export function compileDirectoryNamePattern(
  pattern: string | null | undefined,
): CompiledNamePattern {
  if (typeof pattern !== 'string') return { kind: 'all' };
  const trimmed = pattern.trim();
  if (!trimmed) return { kind: 'all' };
  if (trimmed.length > DIRECTORY_NAME_PATTERN_MAX_LENGTH) {
    return { kind: 'none' };
  }
  if (!lastPathSegment(trimmed)) {
    return { kind: 'all' };
  }

  try {
    const glob = globToDirectoryNameRegExp(trimmed);
    if (!glob) return { kind: 'all' };
    return { kind: 're', re: glob };
  } catch {
    return { kind: 'none' };
  }
}

export function matchesCompiledDirectoryNamePattern(
  name: string,
  compiled: CompiledNamePattern,
): boolean {
  if (compiled.kind === 'all') return true;
  if (compiled.kind === 'none') return false;
  compiled.re.lastIndex = 0;
  return compiled.re.test(name);
}

/**
 * True when `name` should be included. Empty / whitespace `pattern` matches everything.
 */
export function matchesDirectoryNamePattern(
  name: string,
  pattern: string | null | undefined,
): boolean {
  return matchesCompiledDirectoryNamePattern(name, compileDirectoryNamePattern(pattern));
}
