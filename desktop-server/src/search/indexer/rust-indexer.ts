/**
 * Heuristic Rust symbol extraction (macros marked heuristic).
 */
import { parseSymbolsAsync } from './symbol-parser.js';
import type { FileIntelligence } from './language-indexer.js';

const MACRO_RE = /^\s*([a-z_][\w]*!)\s*\(/gm;

export async function indexRust(filePath: string, content: string): Promise<FileIntelligence> {
  const symbols = (await parseSymbolsAsync(content, 'rs')).map((s) => ({
    ...s,
    confidence: 'heuristic' as const,
  }));

  const edges: FileIntelligence['edges'] = [];
  const useRe = /^\s*use\s+([^;]+);/gm;
  let m: RegExpExecArray | null;
  while ((m = useRe.exec(content)) !== null) {
    const line = content.slice(0, m.index).split('\n').length;
    edges.push({
      fromName: '__module__',
      fromLine: line,
      toName: m[1]!.trim(),
      kind: 'imports',
      line,
      confidence: 'heuristic',
    });
  }

  while ((m = MACRO_RE.exec(content)) !== null) {
    const line = content.slice(0, m.index).split('\n').length;
    symbols.push({
      kind: 'macro',
      name: m[1]!,
      lineStart: line,
      lineEnd: line,
      signature: m[0].trim().slice(0, 80),
      confidence: 'heuristic',
    });
  }

  return {
    language: 'rust',
    symbols,
    edges,
    isGenerated: false,
  };
}
