import path from 'path';
import type Database from 'better-sqlite3';

export type ImportEdge = {
  importer_path: string;
  imported_path: string | null;
  module_spec: string;
  line: number;
};

export function deleteImportsForFile(db: Database.Database, filePath: string): void {
  db.prepare('DELETE FROM import_index WHERE importer_path = ?').run(filePath);
}

export function upsertImports(
  db: Database.Database,
  edges: Array<{
    importerPath: string;
    importedPath: string | null;
    moduleSpec: string;
    line: number;
    isRelative: boolean;
  }>,
): void {
  const insert = db.prepare(`
    INSERT INTO import_index (importer_path, imported_path, module_spec, line, is_relative)
    VALUES (@importerPath, @importedPath, @moduleSpec, @line, @isRelative)
  `);
  db.transaction(() => {
    for (const e of edges) {
      insert.run({
        importerPath: e.importerPath,
        importedPath: e.importedPath,
        moduleSpec: e.moduleSpec,
        line: e.line,
        isRelative: e.isRelative ? 1 : 0,
      });
    }
  })();
}

export function listImportersOfFile(
  db: Database.Database,
  targetPath: string,
  pathPrefix = '',
): ImportEdge[] {
  const norm = path.normalize(targetPath);
  const prefixFilter = pathPrefix ? 'AND importer_path LIKE ? || \'%\'' : '';
  return db
    .prepare(
      `SELECT importer_path, imported_path, module_spec, line
       FROM import_index
       WHERE imported_path = ? ${prefixFilter}
       ORDER BY importer_path, line`,
    )
    .all(...(pathPrefix ? [norm, pathPrefix] : [norm])) as ImportEdge[];
}

export function listImportsForFile(db: Database.Database, filePath: string): ImportEdge[] {
  return db
    .prepare(
      `SELECT importer_path, imported_path, module_spec, line
       FROM import_index WHERE importer_path = ?
       ORDER BY line`,
    )
    .all(path.normalize(filePath)) as ImportEdge[];
}

/**
 * BFS reverse import walk: files that (transitively) import any of `seedPaths`.
 */
export function computeBlastRadius(
  db: Database.Database,
  seedPaths: string[],
  pathPrefix = '',
  maxDepth = 4,
  maxFiles = 80,
): { seeds: string[]; impacted: Array<{ path: string; depth: number; via: string }> } {
  const seeds = [...new Set(seedPaths.map((p) => path.normalize(p)))];
  const visited = new Map<string, { depth: number; via: string }>();
  let frontier = seeds.map((p) => ({ path: p, depth: 0, via: p }));

  while (frontier.length > 0 && visited.size < maxFiles) {
    const next: typeof frontier = [];
    for (const node of frontier) {
      if (node.depth >= maxDepth) continue;
      const importers = listImportersOfFile(db, node.path, pathPrefix);
      for (const imp of importers) {
        const p = path.normalize(imp.importer_path);
        if (seeds.includes(p) || visited.has(p)) continue;
        visited.set(p, { depth: node.depth + 1, via: node.path });
        next.push({ path: p, depth: node.depth + 1, via: node.path });
        if (visited.size >= maxFiles) break;
      }
    }
    frontier = next;
  }

  return {
    seeds,
    impacted: [...visited.entries()].map(([p, v]) => ({ path: p, depth: v.depth, via: v.via })),
  };
}

export function formatBlastRadiusReport(
  result: ReturnType<typeof computeBlastRadius>,
): string {
  const lines = ['# Import blast radius', '', `**Seeds:** ${result.seeds.map((s) => `\`${s}\``).join(', ')}`, ''];
  if (!result.impacted.length) {
    lines.push('_No importers found in the index (re-index project for import graph)._');
    return lines.join('\n');
  }
  lines.push('## Importers (transitive)', '');
  for (const row of result.impacted.sort((a, b) => a.depth - b.depth || a.path.localeCompare(b.path))) {
    lines.push(`- depth ${row.depth}: \`${row.path}\` ← via \`${row.via}\``);
  }
  return lines.join('\n');
}
