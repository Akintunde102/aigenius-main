/**
 * Live smoke test: index real repo files → getContext → minimal Ollama chat.
 * Run: npx tsx scripts/intelligence-live-test.ts
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { upsertFile } from '../src/search/db/queries.js';
import { upsertFileStructure } from '../src/search/db/queries-chunks.js';
import {
  getContext,
  getFileOverview,
  getSymbolDetail,
  findSymbolReferences,
} from '../src/search/db/queries-intelligence.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const TARGET_FILES = [
  'client/desktop-server/src/search/db/queries-intelligence.ts',
  'client/desktop-server/src/search/indexer/ts-morph-indexer.ts',
].map((rel) => path.join(REPO_ROOT, rel));

function loadSchema(db: Database.Database): void {
  const searchDir = path.join(__dirname, '..', 'src', 'search');
  for (const file of [
    'schema.sql',
    'schema-chunks.sql',
    'schema-import-graph.sql',
    'schema-intelligence.sql',
  ]) {
    db.exec(fs.readFileSync(path.join(searchDir, file), 'utf8'));
  }
  const fileCols = db.prepare('PRAGMA table_info(file_index)').all() as { name: string }[];
  const names = new Set(fileCols.map((c) => c.name));
  for (const [col, type] of [
    ['content_hash', 'TEXT'],
    ['language', 'TEXT'],
    ['index_status', 'TEXT'],
    ['is_generated', 'INTEGER DEFAULT 0'],
    ['last_indexed', 'INTEGER'],
  ] as const) {
    if (!names.has(col)) db.exec(`ALTER TABLE file_index ADD COLUMN ${col} ${type}`);
  }
  const symCols = db.prepare('PRAGMA table_info(symbol_index)').all() as { name: string }[];
  const symNames = new Set(symCols.map((c) => c.name));
  if (!symNames.has('confidence')) {
    db.exec("ALTER TABLE symbol_index ADD COLUMN confidence TEXT NOT NULL DEFAULT 'high'");
  }
  if (!symNames.has('language')) {
    db.exec('ALTER TABLE symbol_index ADD COLUMN language TEXT');
  }
}

async function indexFile(db: Database.Database, absPath: string): Promise<void> {
  const content = fs.readFileSync(absPath, 'utf8');
  const ext = path.extname(absPath).replace(/^\./, '') || 'ts';
  upsertFile(db, {
    path: absPath,
    name: path.basename(absPath),
    mtime: Date.now(),
    content,
    tags: ext,
    extension: ext,
    content_hash: 'live-test',
    language: ext,
    index_status: 'ok',
    last_indexed: Date.now(),
  });
  await upsertFileStructure(db, absPath, content, ext, '');
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`ASSERT FAILED: ${msg}`);
}

const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'munoz_danilo/deepseek-v4-flash:latest';

async function askOllama(prompt: string): Promise<string> {
  const res = await fetch('http://127.0.0.1:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: { num_predict: 50, temperature: 0 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { response?: string };
  return (data.response ?? '').trim();
}

async function main(): Promise<void> {
  console.log('=== Intelligence live test ===\n');
  console.log('Repo:', REPO_ROOT);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-intel-live-'));
  const dbPath = path.join(tmpDir, 'live.sqlite');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  loadSchema(db);

  console.log('\n1) Indexing real files...');
  for (const fp of TARGET_FILES) {
    assert(fs.existsSync(fp), `missing ${fp}`);
    await indexFile(db, fp);
    const symCount = (
      db.prepare('SELECT COUNT(*) AS c FROM symbol_index WHERE path = ?').get(fp) as { c: number }
    ).c;
    const edgeCount = (
      db.prepare(
        `SELECT COUNT(*) AS c FROM symbol_edges e
         JOIN symbol_index s ON e.from_symbol_id = s.id WHERE s.path = ?`,
      ).get(fp) as { c: number }
    ).c;
    console.log(`   ${path.relative(REPO_ROOT, fp)} → ${symCount} symbols, ${edgeCount} edges`);
  }

  const intelFile = TARGET_FILES[0]!;

  console.log('\n2) getContext (file path)...');
  const fileCtx = await getContext(db, '', intelFile);
  assert(fileCtx.type === 'file', `expected file, got ${fileCtx.type}`);
  assert((fileCtx.overview?.symbols.length ?? 0) > 0, 'file overview has no symbols');
  console.log(`   type=${fileCtx.type}, symbols=${fileCtx.overview?.symbols.length}`);

  console.log('\n3) getContext (symbol name)...');
  const symCtx = await getContext(db, '', 'getContext');
  assert(symCtx.type === 'symbol', `expected symbol, got ${symCtx.type}`);
  const match = symCtx.matches?.[0] as { name?: string; callees?: unknown[] } | undefined;
  console.log(`   type=${symCtx.type}, matches=${symCtx.matches?.length}, name=${match?.name}`);

  console.log('\n4) getSymbolDetail...');
  const detail = getSymbolDetail(db, intelFile, 'getContext');
  assert(detail !== null, 'getContext symbol not found');
  console.log(`   getContext @ line ${detail!.line}, callees=${detail!.callees.length}, callers=${detail!.callers.length}`);

  console.log('\n5) findSymbolReferences...');
  const refs = findSymbolReferences(db, intelFile, 'getContext');
  console.log(`   total=${refs.total}, returned=${refs.references.length}`);

  console.log('\n6) Minimal LLM call (Ollama, ~80 tokens max)...');
  const overview = getFileOverview(db, intelFile);
  const symbolNames = overview.symbols.slice(0, 8).map((s) => s.name).join(', ');
  const llmPrompt =
    `You are a code assistant. Based ONLY on this indexed overview, answer in ONE short sentence.\n` +
    `File: ${path.basename(intelFile)}\n` +
    `Symbols: ${symbolNames}\n` +
    `Question: What is the main exported function in this file and what does it do?`;

  const llmAnswer = await askOllama(llmPrompt);
  console.log('   LLM:', llmAnswer);
  assert(llmAnswer.length > 10, 'LLM returned empty/too short answer');
  assert(/getContext|context|resolver|symbol/i.test(llmAnswer), 'LLM answer unrelated to indexed data');

  db.close();
  fs.rmSync(tmpDir, { recursive: true, force: true });

  console.log('\n✅ All checks passed (index → query → LLM).\n');
}

main().catch((err) => {
  console.error('\n❌ Live test failed:', err);
  process.exit(1);
});
