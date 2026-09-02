import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { Node, Project, SyntaxKind, type DefinitionInfo, type SourceFile } from 'ts-morph';
import { isTypeScriptExtension } from './indexer/ts-morph-indexer.js';

function findTsConfig(startPath: string): string | null {
  let dir = path.dirname(path.resolve(startPath));
  const root = path.parse(dir).root;
  while (true) {
    const candidate = path.join(dir, 'tsconfig.json');
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      /* ignore */
    }
    if (dir === root) break;
    dir = path.dirname(dir);
  }
  return null;
}

function projectForFile(absPath: string): Project {
  const tsconfig = findTsConfig(absPath);
  if (tsconfig) {
    return new Project({ tsConfigFilePath: tsconfig, skipAddingFilesFromTsConfig: true });
  }
  return new Project({
    compilerOptions: {
      allowJs: true,
      jsx: 2,
      target: 99,
      module: 99,
      esModuleInterop: true,
    },
  });
}

function formatDefinition(filePath: string, line: number, column: number): string {
  return `${filePath}:${line}:${column}`;
}

function resolveTargetNode(sourceFile: SourceFile, offset: number): Node | undefined {
  const node = sourceFile.getDescendantAtPos(offset);
  if (!node) return undefined;
  if (Node.isIdentifier(node)) return node;
  return node.getFirstDescendantByKind(SyntaxKind.Identifier) ?? node;
}

function formatDefinitionInfos(definitions: DefinitionInfo[]): { ok: true; result: string } {
  const lines = definitions.map((def) => {
    const sf = def.getSourceFile();
    const start = def.getTextSpan().getStart();
    const { line, column } = sf.getLineAndColumnAtPos(start);
    return `- ${formatDefinition(sf.getFilePath(), line, column)}`;
  });
  return {
    ok: true,
    result: `# Definition\n\n*Resolved with built-in TypeScript analysis (no language server required)*\n\n${lines.join('\n')}`,
  };
}

export async function resolveGoToDefinition(
  rawPath: string,
  line: number,
  character: number,
): Promise<{ ok: true; result: string } | { ok: false; error: string }> {
  const absPath = path.resolve(rawPath.trim());
  try {
    await fsPromises.access(absPath);
  } catch {
    return { ok: false, error: `File not readable: ${absPath}` };
  }

  const ext = path.extname(absPath).toLowerCase();
  if (!isTypeScriptExtension(ext)) {
    return {
      ok: false,
      error: `Go to definition is supported for TypeScript/JavaScript files. Got ${ext || 'no extension'}.`,
    };
  }

  const project = projectForFile(absPath);
  let sourceFile = project.getSourceFile(absPath);
  if (!sourceFile) {
    sourceFile = project.addSourceFileAtPath(absPath);
  }

  const lineIndex = Math.max(0, line - 1);
  const charIndex = Math.max(0, character - 1);
  const offset = sourceFile.compilerNode.getPositionOfLineAndCharacter(lineIndex, charIndex);
  const targetNode = resolveTargetNode(sourceFile, offset);
  if (!targetNode) {
    return { ok: false, error: `No symbol at ${absPath}:${line}:${character}` };
  }

  const definitions = project.getLanguageService().getDefinitionsAtPosition(
    sourceFile,
    targetNode.getStart(),
  ) ?? [];

  if (!definitions.length) {
    return { ok: false, error: `No definition found at ${absPath}:${line}:${character}` };
  }

  return formatDefinitionInfos(definitions);
}
