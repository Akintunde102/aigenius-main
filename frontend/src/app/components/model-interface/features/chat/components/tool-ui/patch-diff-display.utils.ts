export type DiffLineKind = 'add' | 'remove' | 'context' | 'meta';

export type DiffDisplayLine = {
  lineNumber: number | null;
  prefix: '+' | '-' | ' ' | '';
  text: string;
  kind: DiffLineKind;
};

export type DiffLineKindLegacy = 'header' | 'add' | 'remove' | 'context' | 'hunk' | 'other';

export const INITIAL_VISIBLE_LINES = 8;
export const EXPAND_STEP_LINES = 12;

export function classifyDiffLine(line: string): DiffLineKindLegacy {
  if (line.startsWith('+++ ') || line.startsWith('--- ')) return 'header';
  if (line.startsWith('@@')) return 'hunk';
  if (line.startsWith('+')) return 'add';
  if (line.startsWith('-')) return 'remove';
  if (line.startsWith(' ')) return 'context';
  return 'other';
}

export function countUnifiedDiffStats(lines: string[]): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const line of lines) {
    const kind = classifyDiffLine(line);
    if (kind === 'add') additions += 1;
    else if (kind === 'remove') deletions += 1;
  }
  return { additions, deletions };
}

export function countDiffDisplayStats(lines: DiffDisplayLine[]): { additions: number; deletions: number } {
  let additions = 0;
  let deletions = 0;
  for (const line of lines) {
    if (line.kind === 'add') additions += 1;
    else if (line.kind === 'remove') deletions += 1;
  }
  return { additions, deletions };
}

export function fileNameFromPath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || filePath;
}

export function fileExtensionLabel(filePath: string): string {
  const name = fileNameFromPath(filePath);
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return 'FILE';
  const ext = name.slice(dot + 1).toUpperCase();
  return ext.length > 4 ? ext.slice(0, 4) : ext;
}

const EXT_TO_LANGUAGE: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  py: 'python',
  json: 'json',
  html: 'xml',
  htm: 'xml',
  xml: 'xml',
  svg: 'xml',
  css: 'css',
  scss: 'css',
  less: 'css',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  yml: 'yaml',
  yaml: 'yaml',
  md: 'markdown',
  mdx: 'markdown',
};

export function languageFromFilePath(filePath: string): string {
  const name = fileNameFromPath(filePath);
  const dot = name.lastIndexOf('.');
  if (dot <= 0) return 'plaintext';
  const ext = name.slice(dot + 1).toLowerCase();
  return EXT_TO_LANGUAGE[ext] ?? 'plaintext';
}

/** Unescape literal `\\n` sequences from streamed tool JSON into real newlines. */
export function normalizePatchContent(content: string): string {
  return content.replace(/\\n/g, '\n').replace(/\\r/g, '').replace(/\\t/g, '\t');
}

export function splitPatchContent(content: string): string[] {
  const normalized = normalizePatchContent(content);
  if (!normalized) return [];
  const lines = normalized.split(/\r?\n/);
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines;
}

function assignLineNumbers(lines: DiffDisplayLine[], startAt = 1): DiffDisplayLine[] {
  let n = startAt;
  return lines.map((line) => {
    if (line.kind === 'meta') return line;
    const numbered = { ...line, lineNumber: n };
    n += 1;
    return numbered;
  });
}

export function buildContentDiffLines(content: string): DiffDisplayLine[] {
  const lines = splitPatchContent(content);
  return assignLineNumbers(
    lines.map((text) => ({
      lineNumber: null,
      prefix: '+' as const,
      text,
      kind: 'add' as const,
    })),
  );
}

export function buildDeleteDiffLines(): DiffDisplayLine[] {
  return [
    {
      lineNumber: 1,
      prefix: '-',
      text: '(deleted)',
      kind: 'remove',
    },
  ];
}

function diffLineArrays(searchLines: string[], replaceLines: string[]): DiffDisplayLine[] {
  let prefix = 0;
  while (
    prefix < searchLines.length
    && prefix < replaceLines.length
    && searchLines[prefix] === replaceLines[prefix]
  ) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < searchLines.length - prefix
    && suffix < replaceLines.length - prefix
    && searchLines[searchLines.length - 1 - suffix] === replaceLines[replaceLines.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const removed = searchLines.slice(prefix, searchLines.length - suffix);
  const added = replaceLines.slice(prefix, replaceLines.length - suffix);
  const contextBefore = searchLines.slice(0, prefix);
  const contextAfter = searchLines.slice(searchLines.length - suffix);

  const out: DiffDisplayLine[] = [];
  for (const text of contextBefore) {
    out.push({ lineNumber: null, prefix: ' ', text, kind: 'context' });
  }
  for (const text of removed) {
    out.push({ lineNumber: null, prefix: '-', text, kind: 'remove' });
  }
  for (const text of added) {
    out.push({ lineNumber: null, prefix: '+', text, kind: 'add' });
  }
  for (const text of contextAfter) {
    out.push({ lineNumber: null, prefix: ' ', text, kind: 'context' });
  }
  return assignLineNumbers(out);
}

export function buildHunkDiffLines(search: string, replace: string): DiffDisplayLine[] {
  const searchLines = splitPatchContent(search);
  const replaceLines = splitPatchContent(replace);
  if (searchLines.length === 0 && replaceLines.length === 0) {
    return [];
  }
  if (searchLines.length === 0) {
    return assignLineNumbers(
      replaceLines.map((text) => ({
        lineNumber: null,
        prefix: '+' as const,
        text,
        kind: 'add' as const,
      })),
    );
  }
  return diffLineArrays(searchLines, replaceLines);
}

export type DiffWindowSlice = {
  visible: DiffDisplayLine[];
  hiddenAbove: number;
  hiddenBelow: number;
};

export function sliceDiffWindow(
  lines: DiffDisplayLine[],
  expandAbove: number,
  expandBelow: number,
  initialVisible = INITIAL_VISIBLE_LINES,
): DiffWindowSlice {
  const total = lines.length;
  if (total <= initialVisible) {
    return { visible: lines, hiddenAbove: 0, hiddenBelow: 0 };
  }

  const maxStart = Math.max(0, total - initialVisible);
  const viewStart = Math.min(expandAbove, maxStart);
  const viewEnd = Math.min(total, viewStart + initialVisible + expandBelow);

  return {
    visible: lines.slice(viewStart, viewEnd),
    hiddenAbove: viewStart,
    hiddenBelow: total - viewEnd,
  };
}

/**
 * Build a unified-diff-style text for proposed file body (no prior snapshot — all additions).
 * @deprecated Prefer {@link buildContentDiffLines} for UI rendering.
 */
export function proposedBodyAsUnifiedDiffLines(displayPath: string, newContent: string): string[] {
  const lines = splitPatchContent(newContent);
  const out: string[] = [`--- /dev/null`, `+++ ${displayPath}`];
  for (const line of lines) {
    out.push(`+${line}`);
  }
  return out;
}
