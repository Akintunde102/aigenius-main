import fs from 'fs';
import path from 'path';
import { walkProjectFiles } from './indexer/project-walk.js';

export type BundledGrepOutputMode = 'content' | 'files_with_matches' | 'count';

export type BundledGrepOptions = {
  pattern: string;
  root: string;
  glob?: string;
  headLimit?: number;
  offset?: number;
  caseInsensitive?: boolean;
  outputMode?: BundledGrepOutputMode;
  maxFiles?: number;
};

export type BundledGrepLine = {
  file: string;
  line: number;
  text: string;
};

export type BundledGrepResult = {
  lines: BundledGrepLine[];
  matchCount: number;
  filesScanned: number;
  truncated: boolean;
};

const DEFAULT_MAX_FILES = 5_000;
const MAX_LINE_BYTES = 8_192;

const GLOB_ALT_START = '\u0001ALT\u0001';
const GLOB_ALT_OR = '\u0001OR\u0001';
const GLOB_ALT_END = '\u0001ENDALT\u0001';

function escapeGlobLiteral(segment: string): string {
  return segment
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '§§')
    .replace(/\*/g, '[^/]*')
    .replace(/§§/g, '.*');
}

function expandGlobBraceAlternates(glob: string): string {
  return glob.replace(/\{([^}]+)\}/g, (_match, group: string) => {
    const parts = group.split(',').map((part) => part.trim()).filter(Boolean);
    if (parts.length === 0) {
      return _match;
    }
    return `${GLOB_ALT_START}${parts.map((part) => escapeGlobLiteral(part)).join(GLOB_ALT_OR)}${GLOB_ALT_END}`;
  });
}

function globToRegExp(glob: string): RegExp | null {
  const trimmed = glob.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\\/g, '/');
  const withBraces = expandGlobBraceAlternates(normalized);
  const escaped = escapeGlobLiteral(withBraces)
    .replaceAll(GLOB_ALT_START, '(?:')
    .replaceAll(GLOB_ALT_OR, '|')
    .replaceAll(GLOB_ALT_END, ')');
  try {
    return new RegExp(`(^|/)${escaped}$`, 'i');
  } catch {
    return null;
  }
}

function compilePattern(pattern: string, caseInsensitive: boolean): RegExp {
  try {
    return new RegExp(pattern, caseInsensitive ? 'i' : '');
  } catch {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped, caseInsensitive ? 'i' : '');
  }
}

function listSearchFiles(root: string, glob: string | undefined, maxFiles: number): string[] {
  const resolved = path.resolve(root);
  let files: string[] = [];
  try {
    const stat = fs.statSync(resolved);
    if (stat.isFile()) {
      files = [resolved];
    } else if (stat.isDirectory()) {
      files = walkProjectFiles(resolved);
    }
  } catch {
    return [];
  }

  const globRe = glob ? globToRegExp(glob) : null;
  if (globRe) {
    files = files.filter((filePath) => {
      const rel = path.relative(resolved, filePath).replace(/\\/g, '/');
      return globRe.test(rel) || globRe.test(`/${rel}`);
    });
  }

  return files.slice(0, maxFiles);
}

function readSearchableLines(filePath: string): string[] | null {
  try {
    const buf = fs.readFileSync(filePath);
    if (buf.includes(0)) return null;
    if (buf.byteLength > 2 * 1024 * 1024) return null;
    return buf.toString('utf8').split(/\r?\n/);
  } catch {
    return null;
  }
}

export function bundledGrep(options: BundledGrepOptions): BundledGrepResult {
  const {
    pattern,
    root,
    glob,
    headLimit = 50,
    offset = 0,
    caseInsensitive = false,
    outputMode = 'content',
    maxFiles = DEFAULT_MAX_FILES,
  } = options;

  const regex = compilePattern(pattern, caseInsensitive);
  const files = listSearchFiles(root, glob, maxFiles);
  const matches: BundledGrepLine[] = [];
  const matchedFiles = new Set<string>();
  let truncated = files.length >= maxFiles;

  for (const filePath of files) {
    const lines = readSearchableLines(filePath);
    if (!lines) continue;

    for (let i = 0; i < lines.length; i += 1) {
      const lineText = lines[i].slice(0, MAX_LINE_BYTES);
      if (!regex.test(lineText)) continue;
      matchedFiles.add(filePath);
      if (outputMode === 'files_with_matches') {
        break;
      }
      if (outputMode === 'count') {
        matches.push({ file: filePath, line: i + 1, text: lineText });
        continue;
      }
      matches.push({ file: filePath, line: i + 1, text: lineText });
    }
  }

  let resultLines = matches;
  if (outputMode === 'files_with_matches') {
    resultLines = [...matchedFiles].map((file) => ({ file, line: 0, text: '' }));
  } else if (outputMode === 'count') {
    const counts = new Map<string, number>();
    for (const hit of matches) {
      counts.set(hit.file, (counts.get(hit.file) ?? 0) + 1);
    }
    resultLines = [...counts.entries()].map(([file, count]) => ({
      file,
      line: 0,
      text: String(count),
    }));
  }

  const sliced = resultLines.slice(offset, offset + headLimit);
  if (resultLines.length > offset + headLimit) {
    truncated = true;
  }

  return {
    lines: sliced,
    matchCount: resultLines.length,
    filesScanned: files.length,
    truncated,
  };
}

export function formatBundledGrepResult(
  header: string,
  result: BundledGrepResult,
  outputMode: BundledGrepOutputMode,
): string {
  const body = result.lines.length
    ? result.lines.map((hit) => {
      if (outputMode === 'files_with_matches') return `- ${hit.file}`;
      if (outputMode === 'count') return `- ${hit.file}:${hit.text}`;
      return `- ${hit.file}:${hit.line}:${hit.text}`;
    }).join('\n')
    : 'No matches found.';

  const notes: string[] = ['*Search engine: built-in (no ripgrep required)*'];
  if (result.truncated) notes.push('*Results truncated — narrow the path or glob*');
  return `${header}\n\n${notes.join('\n')}\n\n${body}`;
}
