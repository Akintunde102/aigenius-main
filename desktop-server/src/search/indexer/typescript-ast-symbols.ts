/**
 * TypeScript/JavaScript AST symbol extraction (Phase 7).
 * Used when AIGENIUS_TREE_SITTER=1 — no WASM grammars required.
 */
import type { ParsedSymbol } from './symbol-parser.js';

type TsModule = typeof import('typescript');

let tsModule: TsModule | null = null;
let loadFailed = false;

async function loadTypeScript(): Promise<TsModule | null> {
  if (tsModule) return tsModule;
  if (loadFailed) return null;
  try {
    tsModule = await import('typescript');
    return tsModule;
  } catch {
    loadFailed = true;
    return null;
  }
}

function lineEndFor(content: string, lineStart: number, nextLineStart: number | null): number {
  if (nextLineStart != null) return nextLineStart - 1;
  return content.split('\n').length;
}

function kindForNode(ts: TsModule, node: import('typescript').Node): string | null {
  if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) return 'class';
  if (ts.isInterfaceDeclaration(node)) return 'interface';
  if (ts.isTypeAliasDeclaration(node)) return 'type';
  if (ts.isEnumDeclaration(node)) return 'enum';
  if (ts.isFunctionDeclaration(node)) return 'function';
  if (ts.isMethodDeclaration(node)) return 'method';
  if (ts.isConstructorDeclaration(node)) return 'constructor';
  if (ts.isPropertyDeclaration(node) || ts.isVariableDeclaration(node)) return 'member';
  return null;
}

function nameForNode(ts: TsModule, node: import('typescript').Node): string | null {
  const named = node as import('typescript').NamedDeclaration;
  if (named.name && ts.isIdentifier(named.name)) {
    return named.name.text;
  }
  return null;
}

export async function parseSymbolsTypeScriptAst(
  content: string,
  extension: string,
): Promise<ParsedSymbol[] | null> {
  const ext = extension.toLowerCase();
  if (!['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(ext)) return null;

  const ts = await loadTypeScript();
  if (!ts) return null;

  const scriptKind =
    ext === 'tsx' || ext === 'jsx'
      ? ts.ScriptKind.TSX
      : ext === 'js' || ext === 'mjs' || ext === 'cjs'
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;

  const sf = ts.createSourceFile('file.' + ext, content, ts.ScriptTarget.Latest, true, scriptKind);
  const hits: Array<{ kind: string; name: string; line: number; sig: string }> = [];

  const visit = (node: import('typescript').Node): void => {
    const kind = kindForNode(ts, node);
    const name = kind ? nameForNode(ts, node) : null;
    if (kind && name) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
      const sigLine = sf.getFullText().split('\n')[line - 1]?.trim() ?? '';
      hits.push({
        kind,
        name,
        line,
        sig: sigLine.length > 120 ? `${sigLine.slice(0, 117)}…` : sigLine,
      });
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  hits.sort((a, b) => a.line - b.line || a.name.localeCompare(b.name));

  return hits.map((m, i) => ({
    kind: m.kind,
    name: m.name,
    lineStart: m.line,
    lineEnd: lineEndFor(content, m.line, hits[i + 1]?.line ?? null),
    signature: m.sig,
  }));
}
