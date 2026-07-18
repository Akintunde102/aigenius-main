/**
 * Heuristic Python symbol extraction (confidence = heuristic).
 */
import { parseImports, parseSymbolsAsync } from './symbol-parser.js';
import type { FileIntelligence } from './language-indexer.js';

export async function indexPython(filePath: string, content: string): Promise<FileIntelligence> {
  const symbols = (await parseSymbolsAsync(content, 'py')).map((s) => ({
    ...s,
    confidence: 'heuristic' as const,
  }));

  const edges: FileIntelligence['edges'] = [];
  const imports = parseImports(content, 'py');
  for (const imp of imports) {
    edges.push({
      fromName: '__module__',
      fromLine: imp.line,
      toName: imp.module,
      kind: 'imports',
      line: imp.line,
      confidence: 'heuristic',
    });
  }

  return {
    language: 'python',
    symbols,
    edges,
    isGenerated: false,
  };
}
