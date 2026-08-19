import type Database from 'better-sqlite3';

const FTS_COLUMN_SPEC_CHARS =
  /\u003A|\uFF1A|\uFE55|\u0589|\u02F8|\u205A|\u2236|\u2A74|\u2E59|\u2E35|\u2E34/g;

function rebuildFileSearchFts(db: Database.Database): void {
  db.exec("INSERT INTO file_search(file_search) VALUES('rebuild')");
}

function isFtsVirtualTableIntegrityError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as NodeJS.ErrnoException & { code?: string }).code;
  return (
    code === 'SQLITE_CORRUPT_VTAB' ||
    code === 'SQLITE_CORRUPT' ||
    /missing row .*['"`]?\s*\w*\.?['"`]?file_index|fts5:/i.test(err.message)
  );
}

export function runFtsQueryTwiceAfterRebuild<T>(
  db: Database.Database,
  exec: () => T,
): T {
  try {
    return exec();
  } catch (first) {
    if (!isFtsVirtualTableIntegrityError(first)) throw first;
    console.warn(
      '[search-db] FTS5 out of sync with file_search; rebuilding index:',
      first instanceof Error ? first.message : String(first),
    );
    rebuildFileSearchFts(db);
    return exec();
  }
}

function cleanFtsTerm(term: string): string {
  let cleaned = term.normalize('NFC').trim();
  if (!cleaned) return '';

  // Count double quotes; if odd, append one to balance
  const quoteCount = (cleaned.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    cleaned += '"';
  }

  const regex = /("[^"]*")|([^"]+)/g;
  let result = '';
  let match;

  while ((match = regex.exec(cleaned)) !== null) {
    if (match[1]) {
      // Quoted phrases are kept exactly as is
      result += match[1] + ' ';
    } else if (match[2]) {
      // For unquoted text, wrap every word in quotes to prevent FTS5 syntax errors
      const words = match[2].trim().split(/\s+/);
      for (const word of words) {
        if (!word) continue;

        // Preserve SQLite FTS5 boolean operators
        if (word === 'AND' || word === 'OR' || word === 'NOT') {
          result += word + ' ';
          continue;
        }

        // Safely extract trailing asterisks for prefix searches
        const stars = word.match(/\*+$/);
        if (stars) {
          const w = word.slice(0, -stars[0].length).replace(/"/g, '');
          if (w) result += `"${w}"* `;
        } else {
          const w = word.replace(/"/g, '');
          if (w) result += `"${w}" `;
        }
      }
    }
  }

  return result.trim();
}

/** Exported for chunk-level FTS queries. */
export { cleanFtsTerm };
