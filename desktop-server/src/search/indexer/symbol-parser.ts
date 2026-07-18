/**
 * Structured symbol extraction for code files.
 * Regex-based today; swap internals for tree-sitter without changing callers.
 */

export type ParsedSymbol = {
  kind: string;
  name: string;
  lineStart: number;
  lineEnd: number;
  signature: string;
};

export type ParsedImport = {
  module: string;
  line: number;
  isRelative: boolean;
};

const CODE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'go', 'rs', 'java', 'kt', 'cs', 'rb', 'php',
]);

export function isCodeExtension(ext: string): boolean {
  return CODE_EXTENSIONS.has(ext.toLowerCase().replace(/^\./, ''));
}

function lineAt(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

function lineEndForSymbol(content: string, lineStart: number, nextLineStart: number | null): number {
  if (nextLineStart != null) return nextLineStart - 1;
  return content.split('\n').length;
}

function extractSignature(line: string): string {
  const trimmed = line.trim();
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
}

type PatternDef = { kind: string; re: RegExp };

const TS_PATTERNS: PatternDef[] = [
  { kind: 'class', re: /^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm },
  { kind: 'interface', re: /^\s*(?:export\s+)?interface\s+([A-Za-z_$][\w$]*)/gm },
  { kind: 'type', re: /^\s*(?:export\s+)?type\s+([A-Za-z_$][\w$]*)/gm },
  { kind: 'enum', re: /^\s*(?:export\s+)?(?:const\s+)?enum\s+([A-Za-z_$][\w$]*)/gm },
  { kind: 'function', re: /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm },
  { kind: 'const', re: /^\s*(?:export\s+)?const\s+([A-Za-z_$][\w$]*)\s*=/gm },
  { kind: 'method', re: /^\s*(?:public|private|protected)?\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*[:{]/gm },
];

const PY_PATTERNS: PatternDef[] = [
  { kind: 'class', re: /^class\s+([A-Za-z_][\w]*)/gm },
  { kind: 'function', re: /^def\s+([A-Za-z_][\w]*)/gm },
  { kind: 'async_function', re: /^async\s+def\s+([A-Za-z_][\w]*)/gm },
];

const GO_PATTERNS: PatternDef[] = [
  { kind: 'function', re: /^func\s+(?:\([^)]*\)\s+)?([A-Za-z_][\w]*)/gm },
  { kind: 'type', re: /^type\s+([A-Za-z_][\w]*)/gm },
  { kind: 'struct', re: /^type\s+([A-Za-z_][\w]*)\s+struct/gm },
];

const RS_PATTERNS: PatternDef[] = [
  { kind: 'function', re: /^\s*(?:pub\s+)?fn\s+([A-Za-z_][\w]*)/gm },
  { kind: 'struct', re: /^\s*(?:pub\s+)?struct\s+([A-Za-z_][\w]*)/gm },
  { kind: 'enum', re: /^\s*(?:pub\s+)?enum\s+([A-Za-z_][\w]*)/gm },
  { kind: 'trait', re: /^\s*(?:pub\s+)?trait\s+([A-Za-z_][\w]*)/gm },
];

function patternsForExtension(ext: string): PatternDef[] {
  const e = ext.toLowerCase();
  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(e)) return TS_PATTERNS;
  if (e === 'py') return PY_PATTERNS;
  if (e === 'go') return GO_PATTERNS;
  if (e === 'rs') return RS_PATTERNS;
  return TS_PATTERNS;
}

function collectMatches(content: string, patterns: PatternDef[]): Array<{ kind: string; name: string; line: number; sig: string }> {
  const hits: Array<{ kind: string; name: string; line: number; sig: string }> = [];
  const lines = content.split('\n');
  for (const { kind, re } of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const line = lineAt(content, m.index);
      hits.push({
        kind,
        name: m[1],
        line,
        sig: extractSignature(lines[line - 1] ?? ''),
      });
    }
  }
  hits.sort((a, b) => a.line - b.line || a.name.localeCompare(b.name));
  const deduped: typeof hits = [];
  const seen = new Set<string>();
  for (const h of hits) {
    const key = `${h.line}:${h.kind}:${h.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(h);
  }
  return deduped;
}

export function parseSymbols(content: string, extension: string): ParsedSymbol[] {
  if (!isCodeExtension(extension)) return [];
  const matches = collectMatches(content, patternsForExtension(extension));
  return matches.map((m, i) => ({
    kind: m.kind,
    name: m.name,
    lineStart: m.line,
    lineEnd: lineEndForSymbol(content, m.line, matches[i + 1]?.line ?? null),
    signature: m.sig,
  }));
}

/** Async symbol parse: tree-sitter when enabled, else regex. */
export async function parseSymbolsAsync(content: string, extension: string): Promise<ParsedSymbol[]> {
  const { parseSymbolsTreeSitter } = await import('./tree-sitter-bridge.js');
  const ts = await parseSymbolsTreeSitter(content, extension);
  if (ts && ts.length > 0) return ts;
  return parseSymbols(content, extension);
}

const IMPORT_PATTERNS: RegExp[] = [
  /^\s*import\s+.+?\s+from\s+['"]([^'"]+)['"]/gm,
  /^\s*import\s+['"]([^'"]+)['"]/gm,
  /^\s*from\s+([A-Za-z0-9_.]+)\s+import/gm,
  /^\s*use\s+([A-Za-z0-9_:]+)/gm,
  /^\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/gm,
];

export function parseImports(content: string, extension: string): ParsedImport[] {
  if (!isCodeExtension(extension)) return [];
  const out: ParsedImport[] = [];
  for (const re of IMPORT_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const module = m[1];
      const line = lineAt(content, m.index);
      const isRelative = module.startsWith('.') || module.startsWith('/');
      out.push({ module, line, isRelative });
    }
  }
  out.sort((a, b) => a.line - b.line);
  return out;
}
