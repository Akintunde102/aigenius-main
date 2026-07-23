import Database from 'better-sqlite3';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getContext, getSymbolLineRange, findEnclosingSymbolAtLine } from './queries-intelligence.js';
import { upsertFile } from './queries.js';

function makeDb(): Database.Database {
  const db = new Database(':memory:');
  for (const file of ['schema.sql', 'schema-chunks.sql', 'schema-import-graph.sql']) {
    db.exec(fs.readFileSync(path.join(__dirname, file), 'utf8'));
  }
  return db;
}

describe('getContext project root', () => {
  it('returns project_overview for project root path', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-getctx-'));
    fs.writeFileSync(path.join(root, 'package.json'), '{"name":"demo"}\n');
    fs.mkdirSync(path.join(root, 'src'));

    const db = makeDb();
    upsertFile(db, {
      path: path.join(root, 'package.json'),
      name: 'package.json',
      mtime: 1,
      content: '{}',
      tags: '',
      extension: 'json',
    });

    const result = await getContext(db, '', root, { pathPrefix: root });
    expect(result.type).toBe('project_overview');
    expect(result.projectOverview?.root).toBe(path.normalize(root));
    expect(result.projectOverview?.directory.entries.length).toBeGreaterThan(0);
    expect(result.projectOverview?.architectureMarkdown).toContain('Project architecture');

    db.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('returns directory_overview for subdirectory path', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-getctx-sub-'));
    fs.writeFileSync(path.join(root, 'package.json'), '{}');
    const sub = path.join(root, 'apps', 'web');
    fs.mkdirSync(sub, { recursive: true });
    fs.writeFileSync(path.join(sub, 'package.json'), '{"name":"web"}');

    const db = makeDb();
    const result = await getContext(db, '', 'apps/web', { pathPrefix: root });
    expect(result.type).toBe('directory_overview');
    expect(result.directoryOverview?.path).toBe(path.normalize(sub));

    db.close();
    fs.rmSync(root, { recursive: true, force: true });
  });
});

describe('symbol line range for read_file anchor', () => {
  const filePath = '/proj/src/orders.ts';

  function makeDbWithSymbol(): Database.Database {
    const db = makeDb();
    db.prepare(
      `INSERT INTO symbol_index (path, kind, name, line_start, line_end, signature, confidence)
       VALUES (?, 'class', 'OrdersService', 10, 80, 'class OrdersService', 'high')`,
    ).run(filePath);
    db.prepare(
      `INSERT INTO symbol_index (path, kind, name, line_start, line_end, signature, confidence)
       VALUES (?, 'method', 'cancelOrder', 40, 55, 'cancelOrder()', 'high')`,
    ).run(filePath);
    return db;
  }

  it('getSymbolLineRange returns exact line span', () => {
    const db = makeDbWithSymbol();
    const range = getSymbolLineRange(db, filePath, 'OrdersService');
    expect(range).not.toBeNull();
    expect(range?.line_start).toBe(10);
    expect(range?.line_end).toBe(80);
    db.close();
  });

  it('findEnclosingSymbolAtLine returns smallest enclosing symbol', () => {
    const db = makeDbWithSymbol();
    const at45 = findEnclosingSymbolAtLine(db, filePath, 45);
    expect(at45?.name).toBe('cancelOrder');
    expect(at45?.line_start).toBe(40);

    const at15 = findEnclosingSymbolAtLine(db, filePath, 15);
    expect(at15?.name).toBe('OrdersService');
    db.close();
  });

  it('returns null for unknown symbol name', () => {
    const db = makeDbWithSymbol();
    expect(getSymbolLineRange(db, filePath, 'Missing')).toBeNull();
    db.close();
  });
});
