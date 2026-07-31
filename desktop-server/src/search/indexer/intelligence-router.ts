import path from 'path';
import {
  type FileIntelligence,
  isGeneratedPath,
  languageForExtension,
} from './language-indexer.js';
import { indexTypeScriptSymbols, isTypeScriptExtension } from './ts-morph-indexer.js';
import { indexPython } from './python-indexer.js';
import { indexRust } from './rust-indexer.js';
import { indexCpp, isCppExtension } from './cpp-indexer.js';
import { indexMakefile, isMakefile } from './makefile-indexer.js';
import { parseSymbolsAsync } from './symbol-parser.js';
import { indexWithTreeSitter } from './tree-sitter-indexer.js';

import type { IndexedSymbol } from './language-indexer.js';

function mergeSymbols(base: IndexedSymbol[], extra: IndexedSymbol[]): IndexedSymbol[] {
  const seen = new Set(base.map((s) => `${s.kind}:${s.name}:${s.lineStart}`));
  const merged = [...base];
  for (const s of extra) {
    const key = `${s.kind}:${s.name}:${s.lineStart}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(s);
    }
  }
  return merged;
}

/**
 * Fast structural index — tree-sitter / regex; no deep ts-morph graph.
 * Used for index_ready; deep edges are built in the background.
 */
export async function indexFileIntelligenceFast(
  filePath: string,
  content: string,
  extension: string,
): Promise<FileIntelligence> {
  const ext = extension.toLowerCase().replace(/^\./, '');
  const generated = isGeneratedPath(filePath);

  if (isMakefile(filePath, ext)) {
    const result = indexMakefile(filePath, content);
    return { ...result, isGenerated: generated };
  }

  if (isTypeScriptExtension(ext)) {
    const tree = await indexWithTreeSitter(content, ext);
    if (tree) {
      return {
        language: 'typescript',
        symbols: tree.symbols,
        edges: tree.edges,
        isGenerated: generated,
      };
    }
    try {
      const result = indexTypeScriptSymbols(filePath, content);
      return { ...result, isGenerated: generated };
    } catch {
      const symbols = (await parseSymbolsAsync(content, ext)).map((s) => ({
        ...s,
        confidence: 'heuristic' as const,
      }));
      return { language: 'typescript', symbols, edges: [], isGenerated: generated };
    }
  }

  if (ext === 'py') {
    const tree = await indexWithTreeSitter(content, ext);
    const result = await indexPython(filePath, content);
    if (tree) {
      return {
        ...result,
        symbols: mergeSymbols(result.symbols, tree.symbols),
        edges: [...result.edges, ...tree.edges],
        isGenerated: generated,
      };
    }
    return { ...result, isGenerated: generated };
  }

  if (ext === 'rs') {
    const tree = await indexWithTreeSitter(content, ext);
    const result = await indexRust(filePath, content);
    if (tree) {
      return {
        ...result,
        symbols: mergeSymbols(result.symbols, tree.symbols),
        edges: [...result.edges, ...tree.edges],
        isGenerated: generated,
      };
    }
    return { ...result, isGenerated: generated };
  }

  if (isCppExtension(ext)) {
    const tree = await indexWithTreeSitter(content, ext);
    const result = await indexCpp(filePath, content, ext);
    if (tree) {
      return {
        ...result,
        symbols: mergeSymbols(result.symbols, tree.symbols),
        edges: [...result.edges, ...tree.edges],
        isGenerated: generated,
      };
    }
    return { ...result, isGenerated: generated };
  }

  const symbols = (await parseSymbolsAsync(content, ext)).map((s) => ({
    ...s,
    confidence: 'heuristic' as const,
  }));

  return {
    language: languageForExtension(ext),
    symbols,
    edges: [],
    isGenerated: generated,
  };
}

/**
 * Full intelligence (includes deep ts-morph graph). Used by background graph worker.
 */
export async function indexFileIntelligence(
  filePath: string,
  content: string,
  extension: string,
): Promise<FileIntelligence> {
  const ext = extension.toLowerCase().replace(/^\./, '');
  const generated = isGeneratedPath(filePath);

  if (isMakefile(filePath, ext)) {
    const result = indexMakefile(filePath, content);
    return { ...result, isGenerated: generated };
  }

  if (isTypeScriptExtension(ext)) {
    try {
      const { indexTypeScript } = await import('./ts-morph-indexer.js');
      const result = indexTypeScript(filePath, content);
      return { ...result, isGenerated: generated };
    } catch (err) {
      console.warn('[search] ts-morph indexer failed, falling back to tree-sitter:', filePath, err);
      return indexFileIntelligenceFast(filePath, content, extension);
    }
  }

  return indexFileIntelligenceFast(filePath, content, extension);
}
