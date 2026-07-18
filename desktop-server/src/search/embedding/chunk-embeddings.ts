import type Database from 'better-sqlite3';
import { embedTextForSearch } from './embedder.js';
import { vectorToBlob } from './hash-embedder.js';

/** Embed all chunks for a file and store vectors. */
export async function embedChunksForFile(
  db: Database.Database,
  filePath: string,
  modelsDir: string,
): Promise<number> {
  const chunks = db
    .prepare<[string], { id: number; content: string }>(
      'SELECT id, content FROM file_chunks WHERE path = ?',
    )
    .all(filePath);

  const upsert = db.prepare(`
    INSERT INTO chunk_embeddings (chunk_id, vector)
    VALUES (?, ?)
    ON CONFLICT(chunk_id) DO UPDATE SET vector = excluded.vector
  `);

  let count = 0;
  for (const chunk of chunks) {
    const vec = await embedTextForSearch(modelsDir, chunk.content);
    if (!vec) continue;
    upsert.run(chunk.id, vectorToBlob(vec));
    count += 1;
  }
  return count;
}

export function countEmbeddings(db: Database.Database): number {
  const row = db.prepare<[], { cnt: number }>('SELECT COUNT(*) AS cnt FROM chunk_embeddings').get();
  return row?.cnt ?? 0;
}

/** Backfill embeddings for chunks missing vectors (bounded batch). */
export async function embedBackfill(
  db: Database.Database,
  modelsDir: string,
  limit = 500,
  pathPrefix = '',
): Promise<{ embedded: number; remaining: number }> {
  const prefixFilter = pathPrefix ? 'AND fc.path LIKE ? || \'%\'' : '';
  const rows = db
    .prepare(
      `SELECT fc.id, fc.content
       FROM file_chunks fc
       LEFT JOIN chunk_embeddings ce ON ce.chunk_id = fc.id
       WHERE ce.chunk_id IS NULL ${prefixFilter}
       LIMIT ?`,
    )
    .all(...(pathPrefix ? [pathPrefix, limit] : [limit])) as Array<{ id: number; content: string }>;

  const upsert = db.prepare(`INSERT INTO chunk_embeddings (chunk_id, vector) VALUES (?, ?)`);

  let embedded = 0;
  for (const row of rows) {
    const vec = await embedTextForSearch(modelsDir, row.content);
    if (!vec) continue;
    upsert.run(row.id, vectorToBlob(vec));
    embedded += 1;
  }

  const remainingRow = db
    .prepare(
      `SELECT COUNT(*) AS cnt FROM file_chunks fc
       LEFT JOIN chunk_embeddings ce ON ce.chunk_id = fc.id
       WHERE ce.chunk_id IS NULL ${prefixFilter}`,
    )
    .get(...(pathPrefix ? [pathPrefix] : [])) as { cnt: number } | undefined;

  return { embedded, remaining: remainingRow?.cnt ?? 0 };
}
