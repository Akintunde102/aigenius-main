import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import type { ToolboxCapabilityFlag, ToolboxRuntime, ToolboxScope, ToolboxToolRecord } from './types';
import { toolboxDbPath, toolboxRootDir } from './paths';

type Row = {
  id: string;
  scope: string;
  project_id: string | null;
  name: string;
  description: string;
  keywords: string;
  runtime: string;
  entry: string;
  os: string | null;
  flags: string;
  approved_hash: string | null;
  pinned: number;
  archived: number;
  version: number;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
};

function rowToRecord(row: Row): ToolboxToolRecord {
  return {
    id: row.id,
    scope: row.scope as ToolboxScope,
    projectId: row.project_id,
    name: row.name,
    description: row.description,
    keywords: JSON.parse(row.keywords || '[]') as string[],
    runtime: row.runtime as ToolboxRuntime,
    entry: row.entry,
    os: row.os ? (JSON.parse(row.os) as string[]) : null,
    flags: JSON.parse(row.flags || '[]') as ToolboxCapabilityFlag[],
    approvedHash: row.approved_hash,
    pinned: row.pinned === 1,
    archived: row.archived === 1,
    version: row.version,
    lastRunAt: row.last_run_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ToolboxStore {
  private readonly db: DatabaseSync;

  constructor(userDataDir: string) {
    fs.mkdirSync(toolboxRootDir(userDataDir), { recursive: true });
    this.db = new DatabaseSync(toolboxDbPath(userDataDir));
    this.db.exec('PRAGMA journal_mode=WAL;');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tools (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL,
        project_id TEXT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        keywords TEXT NOT NULL DEFAULT '[]',
        runtime TEXT NOT NULL,
        entry TEXT NOT NULL,
        os TEXT,
        flags TEXT NOT NULL DEFAULT '[]',
        approved_hash TEXT,
        pinned INTEGER NOT NULL DEFAULT 0,
        archived INTEGER NOT NULL DEFAULT 0,
        version INTEGER NOT NULL DEFAULT 1,
        last_run_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(scope, project_id, name)
      );
    `);
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS tools_fts USING fts5(
        tool_id UNINDEXED,
        name,
        description,
        keywords,
        tokenize='porter'
      );
    `);
  }

  upsertTool(record: ToolboxToolRecord): void {
    const stmt = this.db.prepare(`
      INSERT INTO tools (
        id, scope, project_id, name, description, keywords, runtime, entry, os, flags,
        approved_hash, pinned, archived, version, last_run_at, created_at, updated_at
      ) VALUES (
        @id, @scope, @project_id, @name, @description, @keywords, @runtime, @entry, @os, @flags,
        @approved_hash, @pinned, @archived, @version, @last_run_at, @created_at, @updated_at
      )
      ON CONFLICT(id) DO UPDATE SET
        description=excluded.description,
        keywords=excluded.keywords,
        runtime=excluded.runtime,
        entry=excluded.entry,
        os=excluded.os,
        flags=excluded.flags,
        approved_hash=excluded.approved_hash,
        pinned=excluded.pinned,
        archived=excluded.archived,
        version=excluded.version,
        last_run_at=excluded.last_run_at,
        updated_at=excluded.updated_at
    `);
    stmt.run({
      id: record.id,
      scope: record.scope,
      project_id: record.projectId,
      name: record.name,
      description: record.description,
      keywords: JSON.stringify(record.keywords),
      runtime: record.runtime,
      entry: record.entry,
      os: record.os ? JSON.stringify(record.os) : null,
      flags: JSON.stringify(record.flags),
      approved_hash: record.approvedHash,
      pinned: record.pinned ? 1 : 0,
      archived: record.archived ? 1 : 0,
      version: record.version,
      last_run_at: record.lastRunAt,
      created_at: record.createdAt,
      updated_at: record.updatedAt,
    });
    this.db.prepare('DELETE FROM tools_fts WHERE tool_id = ?').run(record.id);
    this.db
      .prepare(
        'INSERT INTO tools_fts(tool_id, name, description, keywords) VALUES (?, ?, ?, ?)',
      )
      .run(record.id, record.name, record.description, record.keywords.join(' '));
  }

  getByScopeName(
    scope: ToolboxScope,
    projectId: string | null,
    name: string,
  ): ToolboxToolRecord | null {
    const row = this.db
      .prepare(
        `SELECT * FROM tools WHERE scope = ? AND name = ? AND (project_id IS ? OR project_id = ?) LIMIT 1`,
      )
      .get(scope, name, projectId, projectId) as Row | undefined;
    return row ? rowToRecord(row) : null;
  }

  getById(id: string): ToolboxToolRecord | null {
    const row = this.db.prepare('SELECT * FROM tools WHERE id = ?').get(id) as Row | undefined;
    return row ? rowToRecord(row) : null;
  }

  listVisible(activeProjectId: string | null, includeArchived = false): ToolboxToolRecord[] {
    const archivedClause = includeArchived ? '1=1' : 'archived = 0';
    const rows = this.db
      .prepare(
        `SELECT * FROM tools WHERE ${archivedClause} AND (
          scope = 'global' OR (scope = 'project' AND project_id = ?)
        ) ORDER BY name, scope DESC`,
      )
      .all(activeProjectId) as Row[];
    const records = rows.map(rowToRecord);
    const seen = new Map<string, ToolboxToolRecord>();
    for (const rec of records) {
      if (!seen.has(rec.name) || rec.scope === 'project') {
        seen.set(rec.name, rec);
      }
    }
    return Array.from(seen.values());
  }

  searchFts(query: string, limit: number, activeProjectId: string | null): ToolboxToolRecord[] {
    const ftsQuery = query
      .trim()
      .split(/\s+/)
      .filter((w) => w.replace(/["*]/g, '').length > 0)
      .map((w) => `"${w.replace(/"/g, '')}"`)
      .join(' ');
    if (!ftsQuery) {
      return [];
    }
    try {
      const ids = this.db
        .prepare(
          `SELECT tool_id FROM tools_fts WHERE tools_fts MATCH ? ORDER BY rank LIMIT ?`,
        )
        .all(ftsQuery, limit * 3) as Array<{ tool_id: string }>;
      const seen = new Map<string, ToolboxToolRecord>();
      for (const { tool_id } of ids) {
        const rec = this.getById(tool_id);
        if (!rec || rec.archived) {
          continue;
        }
        if (rec.scope === 'project' && rec.projectId !== activeProjectId) {
          continue;
        }
        if (!seen.has(rec.name) || rec.scope === 'project') {
          seen.set(rec.name, rec);
        }
        if (seen.size >= limit) {
          break;
        }
      }
      return Array.from(seen.values());
    } catch {
      return [];
    }
  }

  deleteTool(id: string): void {
    this.db.prepare('DELETE FROM tools WHERE id = ?').run(id);
    this.db.prepare('DELETE FROM tools_fts WHERE tool_id = ?').run(id);
  }

  close(): void {
    this.db.close();
  }
}
