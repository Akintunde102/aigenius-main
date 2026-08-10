import { spawn } from 'child_process';
import path from 'path';

const MAX_RG_OUT = 200 * 1024;
const DEFAULT_HEAD_LIMIT = 50;
const MAX_HEAD_LIMIT = 200;
const DEFAULT_CODE_GLOB = '*.{ts,tsx,js,jsx,py,go,rs,md}';

const PATH_REQUIRED_ERROR =
  'path is required — pass the absolute directory or file to search (alias: path_prefix). Example: { "pattern": "foo", "path": "C:\\\\project" }';

export type GrepOutputMode = 'content' | 'files_with_matches' | 'count';

export interface NormalizedGrepArgs {
  pattern: string;
  path: string;
  outputMode: GrepOutputMode;
  globs: string[];
  headLimit: number;
  offset: number;
  caseInsensitive: boolean;
  contextBefore?: number;
  contextAfter?: number;
  contextAround?: number;
  multiline: boolean;
  type?: string;
  legacyNote?: string;
}

export function resolveGrepSearchRoot(
  raw: Record<string, unknown>,
): { ok: true; root: string } | { ok: false; error: string } {
  const resolved = resolveGrepPath(raw);
  if (!resolved.ok) return resolved;
  return { ok: true, root: resolved.path };
}

export function resolveGrepPath(
  raw: Record<string, unknown>,
): { ok: true; path: string } | { ok: false; error: string } {
  const rawPath =
    pickString(raw.path) ??
    pickString(raw.path_prefix);
  if (!rawPath) {
    return { ok: false, error: PATH_REQUIRED_ERROR };
  }
  return { ok: true, path: path.resolve(rawPath.trim()) };
}

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function pickPositiveInt(value: unknown, max?: number): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const n = Math.floor(value);
  if (n < 0) return undefined;
  if (max !== undefined) return Math.min(n, max);
  return n;
}

function parseOutputMode(value: unknown): GrepOutputMode {
  if (value === 'files_with_matches' || value === 'count') return value;
  return 'content';
}

function normalizeExtensions(extensions: string[]): string[] {
  return [...new Set(
    extensions
      .map((e) => e.replace(/^\./, '').toLowerCase())
      .filter(Boolean),
  )];
}

function extensionsToGlob(extensions: string[]): string {
  const normalized = normalizeExtensions(extensions);
  if (normalized.length === 0) return '';
  if (normalized.length === 1) return `**/*.${normalized[0]}`;
  return `**/*.{${normalized.join(',')}}`;
}

function collectGlobs(raw: Record<string, unknown>, extensions: string[]): string[] {
  const globs: string[] = [];
  const globValue = raw.glob;
  if (typeof globValue === 'string' && globValue.trim()) {
    globs.push(globValue.trim());
  } else if (Array.isArray(globValue)) {
    for (const entry of globValue) {
      if (typeof entry === 'string' && entry.trim()) globs.push(entry.trim());
    }
  }

  const globExclude = raw.glob_exclude;
  if (Array.isArray(globExclude)) {
    for (const entry of globExclude) {
      if (typeof entry === 'string' && entry.trim()) {
        const trimmed = entry.trim();
        globs.push(trimmed.startsWith('!') ? trimmed : `!${trimmed}`);
      }
    }
  }

  if (globs.length === 0 && extensions.length > 0) {
    const fromExtensions = extensionsToGlob(extensions);
    if (fromExtensions) globs.push(fromExtensions);
  }

  return globs;
}

/** Map legacy + Cursor-style tool args to a normalized ripgrep invocation plan. */
export function normalizeGrepArgs(
  raw: Record<string, unknown>,
): { ok: true; args: NormalizedGrepArgs } | { ok: false; error: string } {
  const pathResult = resolveGrepPath(raw);
  if (!pathResult.ok) return pathResult;

  const legacyNotes: string[] = [];
  let outputMode = parseOutputMode(raw.output_mode);

  const rawExtensions = Array.isArray(raw.extensions)
    ? raw.extensions.filter((e): e is string => typeof e === 'string')
    : [];

  if (raw.search_filenames === true) {
    outputMode = 'files_with_matches';
    legacyNotes.push('search_filenames is deprecated — use output_mode: "files_with_matches" with glob');
  }

  const globs = collectGlobs(raw, rawExtensions);
  const pattern = typeof raw.pattern === 'string' ? raw.pattern.trim() : '';

  if (outputMode === 'files_with_matches' && !pattern && globs.length === 0) {
    return {
      ok: false,
      error:
        'glob is required when listing files without a pattern. Example: { "path": "C:\\\\Pictures", "glob": "**/*.{png,jpg,jpeg}", "output_mode": "files_with_matches" }',
    };
  }

  if (outputMode !== 'files_with_matches' && !pattern) {
    return {
      ok: false,
      error:
        'pattern is required for content and count search. Example: { "pattern": "export function", "path": "C:\\\\project" }',
    };
  }

  const headLimit = pickPositiveInt(raw.head_limit, MAX_HEAD_LIMIT)
    ?? pickPositiveInt(raw.limit, MAX_HEAD_LIMIT)
    ?? DEFAULT_HEAD_LIMIT;

  if (raw.limit !== undefined && raw.head_limit === undefined) {
    legacyNotes.push('limit is deprecated — use head_limit');
  }
  if (raw.path_prefix && !raw.path) {
    legacyNotes.push('path_prefix is deprecated — use path');
  }
  if (rawExtensions.length > 0 && !raw.glob) {
    legacyNotes.push('extensions is deprecated — use glob (e.g. "**/*.{ts,tsx}")');
  }

  const caseInsensitive =
    raw.case_insensitive === true ||
    raw['-i'] === true;

  const contextAround = pickPositiveInt(raw['-C']);
  const contextBefore = pickPositiveInt(raw['-B']);
  const contextAfter = pickPositiveInt(raw['-A']);

  const multiline = raw.multiline === true;
  const type = pickString(raw.type);
  const offset = pickPositiveInt(raw.offset) ?? 0;

  return {
    ok: true,
    args: {
      pattern,
      path: pathResult.path,
      outputMode,
      globs,
      headLimit,
      offset,
      caseInsensitive,
      contextBefore: contextAround ?? contextBefore,
      contextAfter: contextAround ?? contextAfter,
      contextAround,
      multiline,
      type,
      legacyNote: legacyNotes.length > 0 ? legacyNotes.join('; ') : undefined,
    },
  };
}

function globArgs(globs: string[], outputMode: GrepOutputMode, type?: string): string[] {
  if (globs.length > 0) {
    return globs.flatMap((g) => ['-g', g]);
  }
  if (type) return [];
  if (outputMode === 'content') {
    return ['-g', DEFAULT_CODE_GLOB];
  }
  return [];
}

export function buildRipgrepArgv(args: NormalizedGrepArgs): string[] {
  const globFlags = globArgs(args.globs, args.outputMode, args.type);
  const base = ['--color=never', ...globFlags];
  if (args.type) base.push('-t', args.type);

  if (args.outputMode === 'files_with_matches' && !args.pattern) {
    return ['--files', ...base, args.path];
  }

  const searchFlags: string[] = [...base];
  if (args.caseInsensitive) searchFlags.push('-i');
  if (args.multiline) searchFlags.push('-U', '--multiline-dotall');
  if (args.contextAround !== undefined) searchFlags.push('-C', String(args.contextAround));
  else {
    if (args.contextBefore !== undefined) searchFlags.push('-B', String(args.contextBefore));
    if (args.contextAfter !== undefined) searchFlags.push('-A', String(args.contextAfter));
  }

  if (args.outputMode === 'files_with_matches') {
    return ['-l', ...searchFlags, args.pattern, args.path];
  }

  if (args.outputMode === 'count') {
    return ['--count-matches', ...searchFlags, args.pattern, args.path];
  }

  return [
    '--no-heading',
    '--line-number',
    ...searchFlags,
    args.pattern,
    args.path,
  ];
}

function runRipgrep(
  argv: string[],
): Promise<{ ok: true; stdout: string; stderr: string; truncated: boolean } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const child = spawn('rg', argv, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    let truncated = false;
    child.stdout?.on('data', (d: Buffer) => {
      stdout += d.toString('utf8');
      if (stdout.length > MAX_RG_OUT) {
        truncated = true;
        child.kill();
      }
    });
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString('utf8');
    });
    child.on('error', () => {
      resolve({
        ok: false,
        error: 'ripgrep (rg) not found on PATH — install ripgrep for lexical search',
      });
    });
    child.on('close', () => {
      resolve({ ok: true, stdout, stderr, truncated });
    });
  });
}

function formatGlobLabel(globs: string[], type?: string): string {
  if (type) return `type:${type}`;
  if (globs.length > 0) return globs.join(', ');
  return DEFAULT_CODE_GLOB;
}

function formatHeader(args: NormalizedGrepArgs): string {
  const scope = args.path;
  const globLabel = formatGlobLabel(args.globs, args.type);
  if (args.outputMode === 'files_with_matches' && !args.pattern) {
    return `# Files matching ${globLabel} under ${scope}`;
  }
  if (args.outputMode === 'files_with_matches') {
    return `# Grep files (${globLabel}): ${args.pattern} under ${scope}`;
  }
  if (args.outputMode === 'count') {
    return `# Grep count (${globLabel}): ${args.pattern} under ${scope}`;
  }
  return `# Grep: ${args.pattern} under ${scope}`;
}

function formatNoMatches(args: NormalizedGrepArgs): string {
  if (args.outputMode === 'files_with_matches' && !args.pattern) {
    return `No files found under ${args.path} matching ${formatGlobLabel(args.globs, args.type)}`;
  }
  if (args.outputMode === 'files_with_matches') {
    return `No files with matches for \`${args.pattern}\` under ${args.path}`;
  }
  if (args.outputMode === 'count') {
    return `No matches for \`${args.pattern}\` under ${args.path}`;
  }
  return `No text matches for \`${args.pattern}\` under ${args.path}. Use output_mode "files_with_matches" with glob to list files by extension.`;
}

function formatTruncationNote(
  shown: number,
  total: number,
  truncated: boolean,
  headLimit: number,
  offset: number,
): string | undefined {
  if (!truncated && total <= shown) return undefined;
  const parts: string[] = [];
  if (offset > 0) parts.push(`offset ${offset}`);
  if (total > shown + offset) {
    parts.push(`showing ${shown} result(s)${offset > 0 ? ` after offset` : ''} (head_limit ${headLimit})`);
  }
  if (truncated) parts.push('ripgrep output truncated at 200KB — narrow glob or path');
  return parts.length > 0 ? `*${parts.join('; ')}*` : undefined;
}

export async function runGrep(
  rawArgs: Record<string, unknown>,
): Promise<{ ok: true; result: string } | { ok: false; error: string }> {
  const normalized = normalizeGrepArgs(rawArgs);
  if (!normalized.ok) return normalized;

  const args = normalized.args;
  const argv = buildRipgrepArgv(args);
  const out = await runRipgrep(argv);
  if (!out.ok) return out;

  const allLines = out.stdout.trim().split('\n').filter(Boolean);
  const sliced = allLines.slice(args.offset, args.offset + args.headLimit);
  const header = formatHeader(args);
  const body = sliced.length
    ? sliced.map((l) => `- ${l}`).join('\n')
    : formatNoMatches(args);

  const truncation = formatTruncationNote(
    sliced.length,
    allLines.length,
    out.truncated,
    args.headLimit,
    args.offset,
  );

  const sections = [header];
  if (args.legacyNote) sections.push(`*Legacy args: ${args.legacyNote}*`);
  if (truncation) sections.push(truncation);
  sections.push(body);

  const suffix = out.stderr.trim() ? `\n\nrg stderr: ${out.stderr.trim()}` : '';
  return { ok: true, result: `${sections.join('\n\n')}${suffix}` };
}
