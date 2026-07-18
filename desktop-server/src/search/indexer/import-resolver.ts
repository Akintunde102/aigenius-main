import fs from 'fs';
import path from 'path';

const TRY_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json'];

/**
 * Best-effort resolve of a module specifier to an absolute file path on disk.
 */
export function resolveImportPath(importerFile: string, moduleSpec: string): string | null {
  const spec = moduleSpec.trim();
  if (!spec || spec.startsWith('node:')) return null;

  const importerDir = path.dirname(path.resolve(importerFile));

  if (spec.startsWith('.') || spec.startsWith('/')) {
    const base = path.resolve(importerDir, spec);
    return resolveFileCandidate(base);
  }

  return null;
}

function resolveFileCandidate(base: string): string | null {
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return path.normalize(base);

  for (const ext of TRY_EXTENSIONS) {
    const withExt = base + ext;
    if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
      return path.normalize(withExt);
    }
  }

  for (const ext of TRY_EXTENSIONS) {
    const indexFile = path.join(base, `index${ext}`);
    if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
      return path.normalize(indexFile);
    }
  }

  return null;
}

export type ResolvedImport = {
  importerPath: string;
  importedPath: string | null;
  moduleSpec: string;
  line: number;
  isRelative: boolean;
};

export function resolveImports(
  importerPath: string,
  imports: Array<{ module: string; line: number; isRelative: boolean }>,
): ResolvedImport[] {
  return imports.map((imp) => ({
    importerPath: path.resolve(importerPath),
    importedPath: imp.isRelative ? resolveImportPath(importerPath, imp.module) : null,
    moduleSpec: imp.module,
    line: imp.line,
    isRelative: imp.isRelative,
  }));
}
