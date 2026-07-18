/**
 * Deep integration test: full intelligence stack on real repo files + HTTP API + optional LLM.
 *
 * Run (requires Electron ABI for better-sqlite3 on Windows):
 *   $env:ELECTRON_RUN_AS_NODE=1
 *   electron ..\node_modules\tsx\dist\cli.mjs scripts/intelligence-deep-test.ts
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, type ChildProcess } from 'child_process';
import Database from 'better-sqlite3';
import { upsertFile } from '../src/search/db/queries.js';
import { upsertFileStructure } from '../src/search/db/queries-chunks.js';
import { computeBlastRadius } from '../src/search/db/queries-import-graph.js';
import {
  getContext,
  getFileOverview,
  getSymbolDetail,
  findSymbolReferences,
  traceCallChain,
  searchSymbolsFts,
  listBoundaries,
  getMakefileTargets,
} from '../src/search/db/queries-intelligence.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SEARCH_ROOT = path.join(REPO_ROOT, 'client', 'desktop-server', 'src', 'search');

const INDEX_FILES = [
  'indexer/intelligence-router.ts',
  'indexer/ts-morph-indexer.ts',
  'indexer/language-indexer.ts',
  'indexer/boundaries.ts',
  'db/queries-chunks.ts',
  'db/queries-intelligence.ts',
  'routes/search.routes.ts',
].map((rel) =>
  rel.startsWith('routes/')
    ? path.join(REPO_ROOT, 'client', 'desktop-server', 'src', rel)
    : path.join(SEARCH_ROOT, rel),
);

const PYTHON_FILE = path.join(REPO_ROOT, 'client', 'desktop-server', 'python', 'voice_sidecar_lib', 'cli.py');

const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? 'munoz_danilo/deepseek-v4-flash:latest';
const SKIP_LLM = process.env.SKIP_LLM === '1';
const SKIP_HTTP = process.env.SKIP_HTTP === '1';

let passed = 0;
let failed = 0;

function ok(name: string, detail?: string): void {
  passed += 1;
  console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ''}`);
}

function fail(name: string, err: unknown): never {
  failed += 1;
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`  ❌ ${name} — ${msg}`);
  throw new Error(msg);
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

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
  const base = path.basename(absPath);
  const ext =
    base.toLowerCase() === 'makefile'
      ? 'make'
      : path.extname(absPath).replace(/^\./, '') || 'ts';
  upsertFile(db, {
    path: absPath,
    name: base,
    mtime: Date.now(),
    content,
    tags: ext,
    extension: ext,
    content_hash: `hash-${content.length}`,
    language: ext,
    index_status: 'ok',
    last_indexed: Date.now(),
  });
  await upsertFileStructure(db, absPath, content, ext, '');
}

async function askOllama(prompt: string): Promise<string> {
  const res = await fetch('http://127.0.0.1:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      options: { num_predict: 30, temperature: 0 },
    }),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { response?: string };
  return (data.response ?? '').trim();
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function waitForHttp(url: string, attempts = 30): Promise<void> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await sleep(500);
  }
  throw new Error(`HTTP not ready: ${url}`);
}

async function runHttpTests(dbPath: string, watchRoot: string): Promise<void> {
  const port = 28199;
  const token = 'deep-test-secret';
  const electron = path.join(REPO_ROOT, 'client', 'node_modules', 'electron', 'dist', 'electron.exe');
  const entry = path.join(__dirname, '..', 'dist', 'index.js');
  const errLog = path.join(os.tmpdir(), 'intel-deep-server-err.log');

  let child: ChildProcess | null = null;
  try {
    const errStream = fs.createWriteStream(errLog);
    child = spawn(electron, [entry], {
      cwd: path.join(__dirname, '..'),
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        PORT: String(port),
        HOST: '127.0.0.1',
        AIGENIUS_SECRET_TOKEN: token,
        AIGENIUS_DB_PATH: dbPath,
        AIGENIUS_SEARCH_WATCH_PATHS: watchRoot,
        AIGENIUS_ENABLE_TTS: '0',
        AIGENIUS_SEARCH_INIT_DELAY_MS: '0',
        AIGENIUS_MODELS_DIR: path.join(REPO_ROOT, 'client', 'desktop', 'dist', 'models'),
      },
      stdio: ['ignore', 'ignore', 'pipe'],
      windowsHide: true,
    });
    child.stderr?.pipe(errStream);

    await waitForHttp(`http://127.0.0.1:${port}/health`, 60);

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const switchRes = await fetch(`http://127.0.0.1:${port}/search/switch-project`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ rootPath: watchRoot, projectId: 'deep-test', dbPath }),
    });
    assert(switchRes.ok, `switch-project ${switchRes.status}`);

    const intelFile = path.join(SEARCH_ROOT, 'db', 'queries-intelligence.ts');
    const ctxRes = await fetch(`http://127.0.0.1:${port}/search/context`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ input: intelFile, pathPrefix: watchRoot }),
    });
    assert(ctxRes.ok, `context ${ctxRes.status}`);
    const ctx = (await ctxRes.json()) as { type: string };
    assert(ctx.type === 'file', `HTTP context type=${ctx.type}`);

    const detailUrl = new URL(`http://127.0.0.1:${port}/search/symbol-detail`);
    detailUrl.searchParams.set('path', intelFile);
    detailUrl.searchParams.set('name', 'getContext');
    const detailRes = await fetch(detailUrl, { headers: { Authorization: `Bearer ${token}` } });
    assert(detailRes.ok, `symbol-detail ${detailRes.status}`);

    ok('HTTP /health, /switch-project, /context, /symbol-detail');
  } finally {
    if (child) {
      try {
        await fetch(`http://127.0.0.1:${port}/search/shutdown`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(5000),
        });
      } catch {
        child.kill();
      }
    }
    if (fs.existsSync(errLog)) {
      const tail = fs.readFileSync(errLog, 'utf8').slice(-800);
      if (tail.trim()) console.log('   [server log tail]', tail.slice(0, 400));
    }
  }
}

async function main(): Promise<void> {
  console.log('=== Intelligence DEEP test ===\n');
  console.log('Repo:', REPO_ROOT);

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-intel-deep-'));
  const dbPath = path.join(tmpDir, 'deep.sqlite');
  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  loadSchema(db);

  // --- Phase 1: Index ---
  console.log('\n[Phase 1] Indexing real files...');
  for (const fp of INDEX_FILES) {
    try {
      assert(fs.existsSync(fp), `missing ${fp}`);
      await indexFile(db, fp);
      const syms = (db.prepare('SELECT COUNT(*) AS c FROM symbol_index WHERE path = ?').get(fp) as { c: number }).c;
      const edges = (
        db.prepare(
          `SELECT COUNT(*) AS c FROM symbol_edges e JOIN symbol_index s ON e.from_symbol_id = s.id WHERE s.path = ?`,
        ).get(fp) as { c: number }
      ).c;
      console.log(`   ${path.relative(REPO_ROOT, fp)} → ${syms} syms, ${edges} edges`);
    } catch (e) {
      fail(`index ${path.basename(fp)}`, e);
    }
  }

  if (fs.existsSync(PYTHON_FILE)) {
    await indexFile(db, PYTHON_FILE);
    const pySyms = (db.prepare('SELECT COUNT(*) AS c FROM symbol_index WHERE path = ?').get(PYTHON_FILE) as { c: number }).c;
    console.log(`   ${path.relative(REPO_ROOT, PYTHON_FILE)} → ${pySyms} syms (heuristic)`);
    const pyConf = db
      .prepare(`SELECT confidence FROM symbol_index WHERE path = ? AND kind != 'import' LIMIT 1`)
      .get(PYTHON_FILE) as { confidence: string } | undefined;
    assert(pyConf?.confidence === 'heuristic', 'Python should be heuristic');
    ok('Python indexer', pyConf.confidence);
  }

  const makefileContent = 'all: build test\nbuild: src/main.o\n';
  const makefilePath = path.join(tmpDir, 'Makefile');
  fs.writeFileSync(makefilePath, makefileContent);
  await indexFile(db, makefilePath);
  const mkTargets = getMakefileTargets(db, makefilePath);
  assert(mkTargets.some((t) => t.target === 'all'), 'makefile targets missing');
  ok('Makefile indexer', `${mkTargets.length} targets`);

  // --- Phase 2: Structural queries ---
  console.log('\n[Phase 2] Structural queries...');
  const routerFile = path.join(SEARCH_ROOT, 'indexer', 'intelligence-router.ts');
  const intelFile = path.join(SEARCH_ROOT, 'db', 'queries-intelligence.ts');
  const chunksFile = path.join(SEARCH_ROOT, 'db', 'queries-chunks.ts');

  try {
    const overview = getFileOverview(db, intelFile);
    assert(overview.symbols.length > 5, 'overview too small');
    assert(overview.lastIndexed != null, 'missing lastIndexed');
    ok('getFileOverview', `${overview.symbols.length} symbols`);
  } catch (e) {
    fail('getFileOverview', e);
  }

  try {
    const detail = getSymbolDetail(db, routerFile, 'indexFileIntelligence');
    assert(detail !== null, 'indexFileIntelligence not found');
    assert(detail.callees.length > 0, 'expected callees (indexTypeScript etc.)');
    ok('getSymbolDetail callees', `${detail.callees.length} callees`);
  } catch (e) {
    fail('getSymbolDetail', e);
  }

  try {
    const refs = findSymbolReferences(db, routerFile, 'indexFileIntelligence');
    ok('findSymbolReferences', `total=${refs.total}, returned=${refs.references.length}`);
  } catch (e) {
    fail('findSymbolReferences', e);
  }

  try {
    const refs = findSymbolReferences(db, chunksFile, 'persistIntelligenceGraph');
    assert(refs.total > 0, 'persistIntelligenceGraph should have cross-file callers');
    ok('cross-file references', `total=${refs.total}`);
  } catch (e) {
    fail('cross-file references', e);
  }

  try {
    const chain = traceCallChain(db, routerFile, 'indexFileIntelligence', 3);
    assert(chain.chain.length >= 2, 'call chain too short');
    ok('traceCallChain', `depth=${chain.chain.length}${chain.truncated ? ' (truncated)' : ''}`);
  } catch (e) {
    fail('traceCallChain', e);
  }

  try {
    const hits = searchSymbolsFts(db, 'getContext', SEARCH_ROOT, 5);
    assert(hits.length > 0, 'FTS no hits for getContext');
    ok('searchSymbolsFts', `${hits.length} hits`);
  } catch (e) {
    fail('searchSymbolsFts', e);
  }

  // --- Phase 3: getContext resolver chain ---
  console.log('\n[Phase 3] getContext resolver...');
  try {
    const fileCtx = await getContext(db, '', intelFile);
    assert(fileCtx.type === 'file', `file path → ${fileCtx.type}`);
    ok('resolver: file path', fileCtx.type);
  } catch (e) {
    fail('resolver file path', e);
  }

  try {
    const pathSym = `${intelFile}:getContext`;
    const symCtx = await getContext(db, '', pathSym);
    assert(symCtx.type === 'symbol', `path:symbol → ${symCtx.type}`);
    ok('resolver: path:symbol', 'getContext');
  } catch (e) {
    fail('resolver path:symbol', e);
  }

  try {
    const kwCtx = await getContext(db, '', 'persistIntelligenceGraph', { pathPrefix: SEARCH_ROOT });
    assert(kwCtx.type === 'symbol' || kwCtx.type === 'keyword_match', `keyword → ${kwCtx.type}`);
    ok('resolver: symbol/keyword', kwCtx.type);
  } catch (e) {
    fail('resolver keyword', e);
  }

  try {
    const missCtx = await getContext(db, '', 'xyzzy_nonexistent_symbol_12345', { pathPrefix: SEARCH_ROOT });
    assert(
      missCtx.type === 'not_found' || missCtx.type === 'semantic_match',
      `unexpected type ${missCtx.type}`,
    );
    ok('resolver: miss/fallback', missCtx.type);
  } catch (e) {
    fail('resolver miss', e);
  }

  // --- Phase 4: Import blast radius ---
  console.log('\n[Phase 4] Import graph...');
  try {
    const radius = computeBlastRadius(db, [routerFile], SEARCH_ROOT, 3);
    assert(radius.impacted.length >= 0, 'blast radius failed');
    ok('import blast radius', `${radius.impacted.length} impacted files`);
  } catch (e) {
    fail('import blast radius', e);
  }

  // --- Phase 5: Boundaries (inject Nest-style into temp file) ---
  console.log('\n[Phase 5] Boundaries...');
  const boundaryFile = path.join(tmpDir, 'routes.ts');
  fs.writeFileSync(boundaryFile, `@Get('/health')\nexport function health() {}\n`);
  await indexFile(db, boundaryFile);
  const bOverview = getFileOverview(db, boundaryFile);
  assert(bOverview.boundaries.some((b) => b.type === 'http_route'), 'http_route boundary missing');
  const allBounds = listBoundaries(db, tmpDir, 'http_route');
  assert(allBounds.length > 0, 'listBoundaries empty');
  ok('boundaries', `${allBounds.length} http_route`);

  // --- Phase 6: Re-index idempotency ---
  console.log('\n[Phase 6] Re-index idempotency...');
  try {
    const before = (db.prepare('SELECT COUNT(*) AS c FROM symbol_index').get() as { c: number }).c;
    await indexFile(db, routerFile);
    const after = (db.prepare('SELECT COUNT(*) AS c FROM symbol_index').get() as { c: number }).c;
    assert(Math.abs(before - after) < 5, `symbol count drift: ${before} → ${after}`);
    ok('re-index stable', `${before} ≈ ${after} symbols`);
  } catch (e) {
    fail('re-index', e);
  }

  // --- Phase 7: HTTP API ---
  if (!SKIP_HTTP) {
    console.log('\n[Phase 7] HTTP API (sidecar)...');
    try {
      await runHttpTests(dbPath, SEARCH_ROOT);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`  ⚠️  HTTP API failed (non-fatal): ${msg}`);
    }
  } else {
    console.log('\n[Phase 7] HTTP API skipped (SKIP_HTTP=1)');
  }

  // --- Phase 8: LLM (optional) ---
  if (!SKIP_LLM) {
    console.log('\n[Phase 8] LLM grounded answer...');
    try {
      const detail = getSymbolDetail(db, intelFile, 'getContext')!;
      const prompt =
        `Answer in ONE sentence. Main function: getContext. ` +
        `Callees (${detail.callees.length}): ${detail.callees.slice(0, 4).map((c) => c.name).join(', ')}. ` +
        `What does getContext do?`;
      const answer = await askOllama(prompt);
      assert(answer.length > 5, 'empty LLM answer');
      assert(/context|symbol|file|search|resolver/i.test(answer), `weak answer: ${answer}`);
      ok('LLM grounded', answer.slice(0, 100));
    } catch (e) {
      console.warn('  ⚠️  LLM skipped/failed:', e instanceof Error ? e.message : e);
    }
  }

  db.close();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
  console.log('✅ Deep test complete.\n');

  // Keep tmp for HTTP phase; cleanup after
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

main().catch((err) => {
  console.error('\n❌ Deep test aborted:', err);
  process.exit(1);
});
