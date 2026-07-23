/**
 * Tree-sitter bridge — WASM grammars via tree-sitter-wasms (enabled by default when available).
 * Set AIGENIUS_TREE_SITTER=0 to disable.
 */
import type { ParsedSymbol } from './symbol-parser.js';
import { indexWithTreeSitter, isTreeSitterAvailable } from './tree-sitter-indexer.js';

export function isTreeSitterEnabled(): boolean {
  return isTreeSitterAvailable();
}

/** WASM tree-sitter symbols; falls back to TypeScript compiler API when disabled. */
export async function parseSymbolsTreeSitter(
  content: string,
  extension: string,
): Promise<ParsedSymbol[] | null> {
  const indexed = await indexWithTreeSitter(content, extension);
  if (indexed?.symbols.length) {
    return indexed.symbols.map((s) => ({
      kind: s.kind,
      name: s.name,
      lineStart: s.lineStart,
      lineEnd: s.lineEnd,
      signature: s.signature,
    }));
  }

  if (!isTreeSitterEnabled()) return null;
  const { parseSymbolsTypeScriptAst } = await import('./typescript-ast-symbols.js');
  const symbols = await parseSymbolsTypeScriptAst(content, extension);
  return symbols && symbols.length > 0 ? symbols : null;
}

export { indexWithTreeSitter };
