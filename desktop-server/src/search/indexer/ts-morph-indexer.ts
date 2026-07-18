/**
 * TypeScript/JavaScript structural indexer via ts-morph.
 * Produces high-confidence symbols and call/import/extends edges.
 */
import fs from 'fs';
import path from 'path';
import {
  Project,
  SyntaxKind,
  Node,
  type SourceFile,
  type Node as MorphNode,
  type CallExpression,
} from 'ts-morph';
import type { FileIntelligence, IndexedEdge, IndexedSymbol } from './language-indexer.js';

const projectCache = new Map<string, Project>();
const MAX_REFERENCE_SYMBOLS = 40;

function findTsConfig(startPath: string): string | null {
  let dir = path.dirname(startPath);
  const root = path.parse(dir).root;
  while (true) {
    const candidate = path.join(dir, 'tsconfig.json');
    if (fs.existsSync(candidate)) return candidate;
    if (dir === root) break;
    dir = path.dirname(dir);
  }
  return null;
}

function getProject(filePath: string): Project {
  const tsconfig = findTsConfig(filePath);
  const key = tsconfig ?? path.dirname(filePath);
  let project = projectCache.get(key);
  if (!project) {
    project = tsconfig
      ? new Project({ tsConfigFilePath: tsconfig, skipAddingFilesFromTsConfig: false })
      : new Project({
          compilerOptions: {
            allowJs: true,
            jsx: 2,
            target: 99,
            module: 99,
            esModuleInterop: true,
          },
        });
    projectCache.set(key, project);
  }
  return project;
}

function lineOf(sf: SourceFile, node: MorphNode): number {
  return node.getStartLineNumber();
}

function signatureFor(node: MorphNode): string {
  const text = node.getText().split('\n')[0]?.trim() ?? '';
  return text.length > 120 ? `${text.slice(0, 117)}…` : text;
}

function symbolKindFor(node: MorphNode): string | null {
  if (node.getKind() === SyntaxKind.ClassDeclaration) return 'class';
  if (node.getKind() === SyntaxKind.InterfaceDeclaration) return 'interface';
  if (node.getKind() === SyntaxKind.TypeAliasDeclaration) return 'type';
  if (node.getKind() === SyntaxKind.EnumDeclaration) return 'enum';
  if (node.getKind() === SyntaxKind.FunctionDeclaration) return 'function';
  if (node.getKind() === SyntaxKind.MethodDeclaration) return 'method';
  if (node.getKind() === SyntaxKind.Constructor) return 'constructor';
  if (node.getKind() === SyntaxKind.VariableDeclaration) return 'const';
  return null;
}

function collectSymbols(sf: SourceFile): IndexedSymbol[] {
  const symbols: IndexedSymbol[] = [];
  const seen = new Set<string>();

  for (const node of sf.getDescendants()) {
    const kind = symbolKindFor(node);
    if (!kind) continue;
    const nameNode = (node as { getName?: () => string | undefined }).getName?.();
    if (!nameNode) continue;
    const key = `${kind}:${nameNode}:${lineOf(sf, node)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    symbols.push({
      kind,
      name: nameNode,
      lineStart: lineOf(sf, node),
      lineEnd: node.getEndLineNumber(),
      signature: signatureFor(node),
      confidence: 'high',
    });
  }

  return symbols;
}

function resolveCalleeName(call: CallExpression): string | null {
  const expr = call.getExpression();
  if (expr.getKind() === SyntaxKind.Identifier) return expr.getText();
  if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
    return expr.getText();
  }
  return null;
}

function collectCallEdges(sf: SourceFile, symbols: IndexedSymbol[]): IndexedEdge[] {
  const edges: IndexedEdge[] = [];
  const enclosing = (line: number): IndexedSymbol | undefined =>
    symbols.find((s) => line >= s.lineStart && line <= s.lineEnd);

  for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const callee = resolveCalleeName(call);
    if (!callee) continue;
    const line = lineOf(sf, call);
    const from = enclosing(line);
    edges.push({
      fromName: from?.name ?? '__module__',
      fromLine: from?.lineStart ?? line,
      toName: callee,
      kind: 'calls',
      line,
      confidence: 'high',
    });
  }

  return edges;
}

function collectInheritanceEdges(sf: SourceFile, symbols: IndexedSymbol[]): IndexedEdge[] {
  const edges: IndexedEdge[] = [];

  for (const cls of sf.getClasses()) {
    const name = cls.getName();
    if (!name) continue;
    const from = symbols.find((s) => s.name === name && s.lineStart === cls.getStartLineNumber());
    const ext = cls.getExtends()?.getText();
    if (ext) {
      for (const part of ext.split(',').map((p: string) => p.trim()).filter(Boolean)) {
        edges.push({
          fromName: from?.name ?? name,
          fromLine: from?.lineStart ?? cls.getStartLineNumber(),
          toName: part,
          kind: 'extends',
          line: cls.getStartLineNumber(),
          confidence: 'high',
        });
      }
    }
    for (const impl of cls.getImplements()) {
      edges.push({
        fromName: name,
        fromLine: cls.getStartLineNumber(),
        toName: impl.getText(),
        kind: 'implements',
        line: cls.getStartLineNumber(),
        confidence: 'high',
      });
    }
  }

  for (const iface of sf.getInterfaces()) {
    const name = iface.getName();
    if (!name) continue;
    for (const e of iface.getExtends()) {
      edges.push({
        fromName: name,
        fromLine: iface.getStartLineNumber(),
        toName: e.getText(),
        kind: 'extends',
        line: iface.getStartLineNumber(),
        confidence: 'high',
      });
    }
  }

  return edges;
}

function collectReferenceEdges(sf: SourceFile, symbols: IndexedSymbol[]): IndexedEdge[] {
  const edges: IndexedEdge[] = [];
  const exported = symbols.filter(
    (s) =>
      s.kind !== 'method' &&
      s.kind !== 'constructor' &&
      s.kind !== 'member',
  ).slice(0, MAX_REFERENCE_SYMBOLS);

  for (const sym of exported) {
    const decl = sf.getDescendants().find((n) => {
      const k = symbolKindFor(n);
      if (!k || k !== sym.kind) return false;
      const name = (n as { getName?: () => string | undefined }).getName?.();
      return name === sym.name && lineOf(sf, n) === sym.lineStart;
    });
    if (!decl || !Node.isReferenceFindable(decl)) continue;

    const refs = decl.findReferencesAsNodes();
    for (const ref of refs) {
      const refSf = ref.getSourceFile();
      if (refSf === sf && lineOf(refSf, ref) === sym.lineStart) continue;
      const refPath = refSf.getFilePath();
      const refLine = lineOf(refSf, ref);
      edges.push({
        fromName: '__external__',
        fromLine: sym.lineStart,
        toName: sym.name,
        toPath: refPath,
        kind: 'references',
        line: refLine,
        confidence: 'high',
      });
    }
  }

  return edges;
}

export function indexTypeScript(filePath: string, content: string): FileIntelligence {
  const project = getProject(filePath);
  const absPath = path.resolve(filePath);
  let sf = project.getSourceFile(absPath);
  if (sf) {
    sf.replaceWithText(content);
  } else {
    sf = project.createSourceFile(absPath, content, { overwrite: true });
  }

  const symbols = collectSymbols(sf);
  const edges = [
    ...collectCallEdges(sf, symbols),
    ...collectInheritanceEdges(sf, symbols),
    ...collectReferenceEdges(sf, symbols),
  ];

  return {
    language: 'typescript',
    symbols,
    edges,
    isGenerated: false,
  };
}

export function isTypeScriptExtension(ext: string): boolean {
  return ['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(ext.toLowerCase().replace(/^\./, ''));
}

/** Clear cached ts-morph projects (e.g. after git branch switch). */
export function resetTsMorphProjects(): void {
  projectCache.clear();
}
