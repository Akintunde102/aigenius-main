/**
 * TypeScript/JavaScript structural indexer via ts-morph.
 * Produces high-confidence symbols and call/import/extends/type-flow edges.
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
import { isTestFilePath, signatureHash } from '../graph/graph-types.js';
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
  if (project) {
    projectCache.delete(key);
    projectCache.set(key, project);
  } else {
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
    if (projectCache.size > 5) {
      const oldestKey = projectCache.keys().next().value;
      if (oldestKey !== undefined) {
        projectCache.delete(oldestKey);
      }
    }
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
    const sig = signatureFor(node);
    symbols.push({
      kind,
      name: nameNode,
      lineStart: lineOf(sf, node),
      lineEnd: node.getEndLineNumber(),
      signature: sig,
      signatureHash: signatureHash(sig),
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

function resolveCalleeTarget(
  call: CallExpression,
): { name: string; path?: string } | null {
  const textName = resolveCalleeName(call);
  if (!textName) return null;

  try {
    const symbol = call.getExpression().getSymbol();
    const decls = symbol?.getDeclarations() ?? [];
    if (decls.length > 0) {
      const decl = decls[0]!;
      const declSf = decl.getSourceFile();
      const declPath = declSf.getFilePath();
      if (Node.isFunctionDeclaration(decl) || Node.isMethodDeclaration(decl)) {
        return { name: decl.getName() ?? textName.split('.').pop() ?? textName, path: declPath };
      }
      if (Node.isVariableDeclaration(decl)) {
        return { name: decl.getName() ?? textName, path: declPath };
      }
      if (Node.isClassDeclaration(decl)) {
        return { name: decl.getName() ?? textName, path: declPath };
      }
      return { name: textName.split('.').pop() ?? textName, path: declPath };
    }
  } catch {
    /* fall through */
  }

  return { name: textName };
}

function collectCallEdges(
  sf: SourceFile,
  symbols: IndexedSymbol[],
  filePath: string,
): IndexedEdge[] {
  const edges: IndexedEdge[] = [];
  const isTest = isTestFilePath(filePath);
  const sortedSymbols = [...symbols].sort((a, b) => a.lineStart - b.lineStart);

  const enclosing = (line: number): IndexedSymbol | undefined => {
    let lo = 0;
    let hi = sortedSymbols.length - 1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      const s = sortedSymbols[mid]!;
      if (line < s.lineStart) {
        hi = mid - 1;
      } else if (line > s.lineEnd) {
        lo = mid + 1;
      } else {
        return s;
      }
    }
    return undefined;
  };

  for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const target = resolveCalleeTarget(call);
    if (!target) continue;
    const line = lineOf(sf, call);
    const from = enclosing(line);
    const edgeKind = isTest ? 'tested_by' : 'calls';
    edges.push({
      fromName: from?.name ?? '__module__',
      fromLine: from?.lineStart ?? line,
      toName: target.name,
      toPath: target.path,
      kind: edgeKind,
      line,
      confidence: target.path ? 'high' : 'heuristic',
    });
  }

  return edges;
}

function collectTypeFlowEdges(sf: SourceFile, symbols: IndexedSymbol[]): IndexedEdge[] {
  const edges: IndexedEdge[] = [];

  for (const fn of sf.getFunctions()) {
    const name = fn.getName();
    if (!name) continue;
    const from = symbols.find((s) => s.name === name && s.lineStart === fn.getStartLineNumber());
    try {
      const retType = fn.getReturnType().getText(fn);
      const named = retType.replace(/<.*>/, '').trim();
      if (named && !/^(string|number|boolean|void|any|unknown|never|undefined|null)$/i.test(named)) {
        edges.push({
          fromName: from?.name ?? name,
          fromLine: from?.lineStart ?? fn.getStartLineNumber(),
          toName: named,
          kind: 'type_flows_into',
          line: fn.getStartLineNumber(),
          confidence: 'high',
        });
      }
    } catch {
      /* optional typing */
    }

    for (const param of fn.getParameters()) {
      const typeNode = param.getTypeNode();
      if (!typeNode) continue;
      const typeText = typeNode.getText().trim();
      if (!typeText || /^(string|number|boolean|any)$/i.test(typeText)) continue;
      edges.push({
        fromName: typeText,
        fromLine: fn.getStartLineNumber(),
        toName: name,
        kind: 'type_flows_into',
        line: param.getStartLineNumber(),
        confidence: 'high',
      });
    }
  }

  for (const iface of sf.getInterfaces()) {
    const name = iface.getName();
    for (const prop of iface.getProperties()) {
      const typeNode = prop.getTypeNode();
      if (!typeNode) continue;
      const typeText = typeNode.getText().trim();
      if (!typeText) continue;
      edges.push({
        fromName: typeText,
        fromLine: prop.getStartLineNumber(),
        toName: name,
        kind: 'type_flows_into',
        line: prop.getStartLineNumber(),
        confidence: 'high',
      });
    }
  }

  return edges;
}

function collectNestJsDiEdges(sf: SourceFile): IndexedEdge[] {
  const edges: IndexedEdge[] = [];
  const nestDecorators = new Set(['Injectable', 'Controller', 'Resolver', 'Gateway', 'Module']);

  for (const cls of sf.getClasses()) {
    const decorators = cls.getDecorators().map((d) => d.getName());
    if (!decorators.some((n) => n && nestDecorators.has(n))) continue;
    const className = cls.getName();
    if (!className) continue;
    const ctor = cls.getConstructors()[0];
    if (!ctor) continue;
    for (const param of ctor.getParameters()) {
      const typeNode = param.getTypeNode();
      if (!typeNode) continue;
      const typeName = typeNode.getText().replace(/<.*>/, '').trim();
      edges.push({
        fromName: className,
        fromLine: cls.getStartLineNumber(),
        toName: typeName,
        kind: 'depends_on',
        line: ctor.getStartLineNumber(),
        confidence: 'heuristic',
      });
    }
  }

  return edges;
}

function collectReadsWritesEdges(sf: SourceFile, symbols: IndexedSymbol[]): IndexedEdge[] {
  const edges: IndexedEdge[] = [];
  const moduleVars = new Set(
    symbols.filter((s) => s.kind === 'const' && s.lineStart < 200).map((s) => s.name),
  );
  if (!moduleVars.size) return edges;

  const sortedSymbols = [...symbols].sort((a, b) => a.lineStart - b.lineStart);
  const enclosing = (line: number): IndexedSymbol | undefined => {
    for (const s of sortedSymbols) {
      if (line >= s.lineStart && line <= s.lineEnd) return s;
    }
    return undefined;
  };

  for (const id of sf.getDescendantsOfKind(SyntaxKind.Identifier)) {
    const name = id.getText();
    if (!moduleVars.has(name)) continue;
    const parent = id.getParent();
    if (!parent) continue;
    const line = lineOf(sf, id);
    const from = enclosing(line);
    if (!from || from.name === name) continue;

    let kind = 'reads';
    if (parent.getKind() === SyntaxKind.BinaryExpression) {
      const bin = parent as { getLeft?: () => MorphNode };
      if (bin.getLeft?.() === id) kind = 'writes';
    }

    edges.push({
      fromName: from.name,
      fromLine: from.lineStart,
      toName: name,
      kind,
      line,
      confidence: 'heuristic',
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
    ...collectCallEdges(sf, symbols, absPath),
    ...collectInheritanceEdges(sf, symbols),
    ...collectReferenceEdges(sf, symbols),
    ...collectTypeFlowEdges(sf, symbols),
    ...collectNestJsDiEdges(sf),
    ...collectReadsWritesEdges(sf, symbols),
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
