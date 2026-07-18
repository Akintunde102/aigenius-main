/**
 * Tree-sitter bridge (Phase 6 stub).
 * Set AIGENIUS_TREE_SITTER=1 and install web-tree-sitter + grammars to enable.
 */
import type { ParsedSymbol } from './symbol-parser.js';

export function isTreeSitterEnabled(): boolean {
  return process.env.AIGENIUS_TREE_SITTER === '1';
}

/** TS/JS AST when enabled; null to fall back to regex. */
export async function parseSymbolsTreeSitter(
  content: string,
  extension: string,
): Promise<ParsedSymbol[] | null> {
  if (!isTreeSitterEnabled()) return null;
  const { parseSymbolsTypeScriptAst } = await import('./typescript-ast-symbols.js');
  const symbols = await parseSymbolsTypeScriptAst(content, extension);
  return symbols && symbols.length > 0 ? symbols : null;
}
