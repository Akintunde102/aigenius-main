/**
 * Tier 1 structural indexer via web-tree-sitter + prebuilt WASM grammars.
 */
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import Parser from 'web-tree-sitter';
import type { IndexedEdge, IndexedSymbol } from './language-indexer.js';
import type { ParsedSymbol } from './symbol-parser.js';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

type LangKey = 'typescript' | 'javascript' | 'python' | 'rust' | 'cpp';

let parserReady: Promise<Parser> | null = null;
const languageCache = new Map<LangKey, Parser.Language>();

const SYMBOL_NODE_TYPES = new Set([
  'function_declaration',
  'generator_function_declaration',
  'class_declaration',
  'interface_declaration',
  'type_alias_declaration',
  'enum_declaration',
  'method_definition',
  'function_definition',
  'class_definition',
  'decorated_definition',
]);

function wasmPath(lang: LangKey): string {
  const pkgRoot = path.dirname(require.resolve('tree-sitter-wasms/package.json'));
  const file =
    lang === 'typescript'
      ? 'tree-sitter-typescript.wasm'
      : lang === 'javascript'
        ? 'tree-sitter-javascript.wasm'
        : `tree-sitter-${lang}.wasm`;
  return path.join(pkgRoot, 'out', file);
}

function langForExtension(ext: string): LangKey | null {
  const e = ext.toLowerCase().replace(/^\./, '');
  if (['ts', 'tsx'].includes(e)) return 'typescript';
  if (['js', 'jsx', 'mjs', 'cjs'].includes(e)) return 'javascript';
  if (e === 'py') return 'python';
  if (e === 'rs') return 'rust';
  if (['cpp', 'cc', 'cxx', 'c', 'h', 'hpp'].includes(e)) return 'cpp';
  return null;
}

async function getParser(): Promise<Parser> {
  if (!parserReady) {
    parserReady = (async () => {
      await Parser.init();
      const parser = new Parser();
      return parser;
    })();
  }
  return parserReady;
}

async function getLanguage(lang: LangKey): Promise<Parser.Language> {
  let cached = languageCache.get(lang);
  if (cached) return cached;
  cached = await Parser.Language.load(wasmPath(lang));
  languageCache.set(lang, cached);
  return cached;
}

function lineOf(node: Parser.SyntaxNode): number {
  return node.startPosition.row + 1;
}

function endLineOf(node: Parser.SyntaxNode): number {
  return node.endPosition.row + 1;
}

function symbolKindForType(type: string): string | null {
  if (type.includes('class')) return 'class';
  if (type.includes('interface')) return 'interface';
  if (type.includes('type_alias') || type === 'type_definition') return 'type';
  if (type.includes('enum')) return 'enum';
  if (type.includes('function') || type === 'function_definition') return 'function';
  if (type === 'method_definition') return 'method';
  return null;
}

function extractName(node: Parser.SyntaxNode): string | null {
  const nameNode = node.childForFieldName('name') ?? node.namedChildren.find((c) => c.type === 'identifier');
  return nameNode?.text ?? null;
}

function collectSymbols(root: Parser.SyntaxNode, content: string): ParsedSymbol[] {
  const symbols: ParsedSymbol[] = [];
  const seen = new Set<string>();

  const walk = (node: Parser.SyntaxNode): void => {
    const kind = symbolKindForType(node.type);
    if (kind && SYMBOL_NODE_TYPES.has(node.type)) {
      const name = extractName(node);
      if (name) {
        const lineStart = lineOf(node);
        const key = `${kind}:${name}:${lineStart}`;
        if (!seen.has(key)) {
          seen.add(key);
          const sigLine = content.split('\n')[lineStart - 1]?.trim() ?? name;
          const signature = sigLine.length > 120 ? `${sigLine.slice(0, 117)}…` : sigLine;
          symbols.push({
            kind,
            name,
            lineStart,
            lineEnd: endLineOf(node),
            signature,
          });
        }
      }
    }
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) walk(child);
    }
  };

  walk(root);
  return symbols;
}

function collectCallEdges(root: Parser.SyntaxNode, symbols: ParsedSymbol[]): IndexedEdge[] {
  const edges: IndexedEdge[] = [];
  const sorted = [...symbols].sort((a, b) => a.lineStart - b.lineStart);

  const enclosing = (line: number): ParsedSymbol | undefined => {
    for (const s of sorted) {
      if (line >= s.lineStart && line <= s.lineEnd) return s;
    }
    return undefined;
  };

  const walk = (node: Parser.SyntaxNode): void => {
    if (node.type === 'call_expression') {
      const fn = node.childForFieldName('function') ?? node.namedChildren[0];
      const callee = fn?.text;
      if (callee) {
        const line = lineOf(node);
        const from = enclosing(line);
        edges.push({
          fromName: from?.name ?? '__module__',
          fromLine: from?.lineStart ?? line,
          toName: callee,
          kind: 'calls',
          line,
          confidence: 'heuristic',
        });
      }
    }
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) walk(child);
    }
  };

  walk(root);
  return edges;
}

export function isTreeSitterAvailable(): boolean {
  if (process.env.AIGENIUS_TREE_SITTER === '0') return false;
  try {
    require.resolve('tree-sitter-wasms/package.json');
    return true;
  } catch {
    return false;
  }
}

export async function indexWithTreeSitter(
  content: string,
  extension: string,
): Promise<{ symbols: IndexedSymbol[]; edges: IndexedEdge[] } | null> {
  if (!isTreeSitterAvailable()) return null;
  const lang = langForExtension(extension);
  if (!lang) return null;

  try {
    const parser = await getParser();
    parser.setLanguage(await getLanguage(lang));
    const tree = parser.parse(content);
    if (!tree) return null;
    const root = tree.rootNode;
    const parsed = collectSymbols(root, content);
    const symbols: IndexedSymbol[] = parsed.map((s) => ({
      ...s,
      confidence: 'heuristic' as const,
    }));
    const edges = collectCallEdges(root, parsed);
    tree.delete();
    return { symbols, edges };
  } catch (err) {
    console.warn('[search] tree-sitter parse failed:', err);
    return null;
  }
}
