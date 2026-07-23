import type Database from 'better-sqlite3';
import { getDb } from './db/connection.js';
import { resolveProjectDbPath, type ResolveDbPathOptions } from './project-index-registry.js';

export function getDbForSearchQuery(
  opts: Omit<ResolveDbPathOptions, 'userData'> & { userData?: string } = {},
): { db: Database.Database; dbPath: string } {
  const userData = opts.userData ?? process.env.AIGENIUS_USER_DATA_PATH ?? '';
  const dbPath = resolveProjectDbPath({ ...opts, userData });
  return { db: getDb(dbPath), dbPath };
}
