/** What can you get from a file in <1s (excluding raw content)? */
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
import { routeExtraction } from '../src/search/indexer/extractors/router.js';
import { indexWithTreeSitter } from '../src/search/indexer/tree-sitter-indexer.js';
import { parseSymbolsAsync, parseImports } from '../src/search/indexer/symbol-parser.js';
import { resolveImports } from '../src/search/indexer/import-resolver.js';
import { buildFileChunksFromSymbols } from '../src/search/indexer/chunk-indexer.js';
import { detectBoundaries } from '../src/search/indexer/boundaries.js';
import { languageForExtension } from '../src/search/indexer/language-indexer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..', '..', '..');

const FILES = [
  'client/desktop-server/src/search/indexer/exemptions.ts',
  'client/frontend/src/app/components/ChatBoxInput/ChatBoxInput.tsx',
  'client/frontend/src/app/(views)/desktop-search-index/page.tsx',
  'client/frontend/src/app/(views)/workflows/page.tsx',
];

async function time<T>(label: string, fn: () => Promise<T> | T): Promise<{ ms: number; result: T }> {
  const t0 = performance.now();
  const result = await fn();
  return { ms: performance.now() - t0, result };
}

async function main(): Promise<void> {
  console.log('Sub-1-second extractions per file\n');

  for (const rel of FILES) {
    const filePath = path.join(REPO, rel);
    const ext = path.extname(filePath).replace(/^\./, '');
    const { content } = await routeExtraction(filePath, '', true);

    const tree = await time('tree-sitter', () => indexWithTreeSitter(content, ext));
    const regex = await time('regex symbols', () => parseSymbolsAsync(content, ext));
    const imports = await time('imports', () => {
      const imps = parseImports(content, ext);
      return resolveImports(filePath, imps);
    });
    const boundaries = await time('boundaries', () => detectBoundaries(content, ext));
    const chunks = await time('chunks', () => {
      const syms = (tree.result?.symbols ?? []).map((s) => ({
        kind: s.kind, name: s.name, lineStart: s.lineStart, lineEnd: s.lineEnd, signature: s.signature,
      }));
      return buildFileChunksFromSymbols(content, ext, syms);
    });

    console.log(`\n${rel}`);
    console.log(`  language: ${languageForExtension(ext)}  |  ${content.length} chars`);
    console.log(`  tree-sitter:  ${tree.ms.toFixed(1).padStart(7)} ms  → ${tree.result?.symbols.length ?? 0} symbols, ${tree.result?.edges.length ?? 0} edges`);
    console.log(`  regex parse:  ${regex.ms.toFixed(1).padStart(7)} ms  → ${regex.result.length} symbols`);
    console.log(`  imports:      ${imports.ms.toFixed(1).padStart(7)} ms  → ${imports.result.length} resolved`);
    console.log(`  boundaries:   ${boundaries.ms.toFixed(1).padStart(7)} ms  → ${boundaries.result.length} (routes/IPC/DB)`);
    console.log(`  chunks:       ${chunks.ms.toFixed(1).padStart(7)} ms  → ${chunks.result.length} RAG chunks`);
    const total = tree.ms + imports.ms + boundaries.ms + chunks.ms;
    console.log(`  TOTAL fast:   ${total.toFixed(1).padStart(7)} ms`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
