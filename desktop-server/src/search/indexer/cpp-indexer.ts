/**
 * Heuristic C/C++ symbol extraction — requires compile_commands for full accuracy.
 */
import { parseSymbolsAsync } from './symbol-parser.js';
import type { FileIntelligence } from './language-indexer.js';

const CPP_PATTERNS = [
  { kind: 'function', re: /^\s*(?:static\s+)?(?:inline\s+)?[\w:<>,\s*&]+\s+([A-Za-z_]\w*)\s*\([^;{]*\)\s*(?:const)?\s*\{/gm },
  { kind: 'class', re: /^\s*(?:class|struct)\s+([A-Za-z_]\w*)/gm },
];

export async function indexCpp(filePath: string, content: string, ext: string): Promise<FileIntelligence> {
  const symbols: FileIntelligence['symbols'] = [];
  const edges: FileIntelligence['edges'] = [];

  for (const pat of CPP_PATTERNS) {
    let m: RegExpExecArray | null;
    while ((m = pat.re.exec(content)) !== null) {
      const line = content.slice(0, m.index).split('\n').length;
      const sigLine = content.split('\n')[line - 1]?.trim() ?? '';
      symbols.push({
        kind: pat.kind,
        name: m[1]!,
        lineStart: line,
        lineEnd: line,
        signature: sigLine.length > 120 ? `${sigLine.slice(0, 117)}…` : sigLine,
        confidence: 'heuristic',
      });
    }
  }

  if (!symbols.length) {
    const fallback = await parseSymbolsAsync(content, ext);
    for (const s of fallback) {
      symbols.push({ ...s, confidence: 'heuristic' });
    }
  }

  const includeRe = /^\s*#\s*include\s*[<"]([^>"]+)[>"]/gm;
  let m: RegExpExecArray | null;
  while ((m = includeRe.exec(content)) !== null) {
    const line = content.slice(0, m.index).split('\n').length;
    edges.push({
      fromName: '__translation_unit__',
      fromLine: line,
      toName: m[1]!,
      kind: 'imports',
      line,
      confidence: 'heuristic',
    });
  }

  return {
    language: 'cpp',
    symbols,
    edges,
    isGenerated: false,
  };
}

export function isCppExtension(ext: string): boolean {
  return ['cpp', 'cc', 'cxx', 'c', 'h', 'hpp'].includes(ext.toLowerCase().replace(/^\./, ''));
}
