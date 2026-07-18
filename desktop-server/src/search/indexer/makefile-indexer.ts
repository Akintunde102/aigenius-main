/**
 * Makefile target extraction — build dependency graph, not call graph.
 */
import type { FileIntelligence } from './language-indexer.js';

const TARGET_RE = /^([^\s:#][^:]*?):([^#]*)/;

export function indexMakefile(filePath: string, content: string): FileIntelligence {
  const symbols: FileIntelligence['symbols'] = [];
  const edges: FileIntelligence['edges'] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const m = TARGET_RE.exec(line);
    if (!m) continue;
    const target = m[1]!.trim();
    const prereqs = m[2]!
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (!target || target.startsWith('.')) continue;

    symbols.push({
      kind: 'make_target',
      name: target,
      lineStart: i + 1,
      lineEnd: i + 1,
      signature: prereqs.length ? `depends: ${prereqs.join(' ')}` : '',
      confidence: 'high',
    });

    for (const dep of prereqs) {
      edges.push({
        fromName: target,
        fromLine: i + 1,
        toName: dep,
        kind: 'build_depends',
        line: i + 1,
        confidence: 'high',
      });
    }
  }

  return {
    language: 'makefile',
    symbols,
    edges,
    isGenerated: false,
  };
}

export function isMakefile(filePath: string, ext: string): boolean {
  const base = filePath.replace(/\\/g, '/').split('/').pop()?.toLowerCase() ?? '';
  return base === 'makefile' || ext === 'make' || ext === 'mk';
}
