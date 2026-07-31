/**
 * Lightweight indexing benchmark — times each pipeline stage without filling disk.
 * Uses in-memory SQLite for structure/DB phases; full content not persisted at scale.
 *
 * Run: node scripts/run-indexing-benchmark.cjs
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
import type Database from 'better-sqlite3';
import DatabaseConstructor from 'better-sqlite3';
import { listProjectFiles } from '../src/search/indexer/git-project-files.js';
import { routeExtraction } from '../src/search/indexer/extractors/router.js';
import { indexTypeScript, isTypeScriptExtension, resetTsMorphProjects } from '../src/search/indexer/ts-morph-indexer.js';
import { indexWithTreeSitter } from '../src/search/indexer/tree-sitter-indexer.js';
import { indexFileIntelligence } from '../src/search/indexer/intelligence-router.js';
import { parseImports } from '../src/search/indexer/symbol-parser.js';
import { resolveImports } from '../src/search/indexer/import-resolver.js';
import { buildFileChunksFromSymbols } from '../src/search/indexer/chunk-indexer.js';
import { upsertFileStructure } from '../src/search/db/queries-chunks.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const BENCHMARK_ROOT = process.env.BENCHMARK_ROOT
  ? path.resolve(process.env.BENCHMARK_ROOT)
  : path.join(REPO_ROOT, 'client');
const BENCHMARK_LIMIT = Number(process.env.BENCHMARK_LIMIT ?? '0');
const DB_SAMPLE = Number(process.env.DB_SAMPLE ?? '25');

type Timings = Record<string, number>;

const CODE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'rs', 'c', 'cpp', 'h', 'hpp',
  'scss', 'css', 'json', 'md', 'mdx', 'yaml', 'yml', 'sql', 'sh', 'svg',
]);

function hr(): number {
  return performance.now();
}

function memMb(): number {
  const { heapUsed, rss } = process.memoryUsage();
  return { heap: heapUsed / (1024 * 1024), rss: rss / (1024 * 1024) };
}

function extOf(filePath: string): string {
  return path.extname(filePath).toLowerCase().replace(/^\./, '');
}

function isCodeFile(filePath: string): boolean {
  return CODE_EXTENSIONS.has(extOf(filePath));
}

function fmtMs(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(1)} ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(2)} s`;
  return `${(ms / 60_000).toFixed(2)} min`;
}

function fmtRate(count: number, ms: number): string {
  if (ms <= 0) return '—';
  return `${((count / ms) * 1000).toFixed(2)} files/s`;
}

function pct(part: number, total: number): string {
  if (total <= 0) return '0%';
  return `${((part / total) * 100).toFixed(1)}%`;
}

function loadSchema(db: Database.Database): void {
  const searchDir = path.join(__dirname, '..', 'src', 'search');
  for (const file of ['schema.sql', 'schema-chunks.sql', 'schema-import-graph.sql', 'schema-intelligence.sql']) {
    db.exec(fs.readFileSync(path.join(searchDir, file), 'utf8'));
  }
  const fileCols = db.prepare('PRAGMA table_info(file_index)').all() as { name: string }[];
  const names = new Set(fileCols.map((c) => c.name));
  for (const [col, type] of [
    ['content_hash', 'TEXT'], ['language', 'TEXT'], ['index_status', 'TEXT'],
    ['is_generated', 'INTEGER DEFAULT 0'], ['last_indexed', 'INTEGER'], ['extension', 'TEXT'],
  ] as const) {
    if (!names.has(col)) db.exec(`ALTER TABLE file_index ADD COLUMN ${col} ${type}`);
  }
  const symCols = db.prepare('PRAGMA table_info(symbol_index)').all() as { name: string }[];
  const symNames = new Set(symCols.map((c) => c.name));
  for (const [col, type] of [
    ['confidence', "TEXT NOT NULL DEFAULT 'high'"], ['language', 'TEXT'],
    ['qualified_name', 'TEXT'], ['signature_hash', 'TEXT'], ['last_analyzed_at', 'INTEGER'],
  ] as const) {
    if (!symNames.has(col)) db.exec(`ALTER TABLE symbol_index ADD COLUMN ${col} ${type}`);
  }
}

function createMemoryDb(): Database.Database {
  const db = new DatabaseConstructor(':memory:');
  db.pragma('journal_mode = MEMORY');
  db.pragma('foreign_keys = ON');
  loadSchema(db);
  return db;
}

async function timeFileComponents(
  filePath: string,
  modelsDir: string,
): Promise<{ ext: string; bytes: number; timings: Timings; counts: Record<string, number> }> {
  const ext = extOf(filePath);
  const bytes = fs.statSync(filePath).size;
  const timings: Timings = {};
  const counts: Record<string, number> = {};

  const t0 = hr();
  const extract = await routeExtraction(filePath, modelsDir, true);
  timings.text_extract = hr() - t0;
  counts.content_chars = extract.content.length;
  const content = extract.content;

  if (isTypeScriptExtension(ext)) {
    const tTs = hr();
    try {
      const r = indexTypeScript(filePath, content);
      counts.ts_symbols = r.symbols.length;
      counts.ts_edges = r.edges.length;
    } catch { counts.ts_morph_failed = 1; }
    timings.ts_morph = hr() - tTs;
  }

  const tIntel = hr();
  const intel = await indexFileIntelligence(filePath, content, ext);
  timings.intelligence = hr() - tIntel;
  counts.symbols = intel.symbols.length;
  counts.edges = intel.edges.length;

  const tImp = hr();
  const imports = parseImports(content, ext);
  resolveImports(filePath, imports);
  timings.import_resolve = hr() - tImp;
  counts.imports = imports.length;

  const tChunk = hr();
  const chunkSymbols = intel.symbols.map((s) => ({
    kind: s.kind, name: s.name, lineStart: s.lineStart, lineEnd: s.lineEnd, signature: s.signature,
  }));
  const chunks = buildFileChunksFromSymbols(content, ext, chunkSymbols);
  timings.chunk_build = hr() - tChunk;
  counts.chunks = chunks.length;

  timings.cpu_total = Object.values(timings).reduce((a, b) => a + b, 0);
  return { ext, bytes, timings, counts };
}

async function timeDbStructure(filePath: string, content: string, db: Database.Database): Promise<number> {
  const ext = extOf(filePath);
  const t = hr();
  await upsertFileStructure(db, filePath, content, ext, '');
  return hr() - t;
}

function aggregate(
  rows: Array<{ path: string; ext: string; bytes: number; timings: Timings; counts: Record<string, number> }>,
) {
  const phaseTotals: Timings = {};
  const byExt: Record<string, { n: number; ms: number; textMs: number; intelMs: number }> = {};
  let bytes = 0, symbols = 0, edges = 0;

  for (const r of rows) {
    bytes += r.bytes;
    symbols += r.counts.symbols ?? 0;
    edges += r.counts.edges ?? 0;
    for (const [k, v] of Object.entries(r.timings)) {
      phaseTotals[k] = (phaseTotals[k] ?? 0) + v;
    }
    if (!byExt[r.ext]) byExt[r.ext] = { n: 0, ms: 0, textMs: 0, intelMs: 0 };
    byExt[r.ext].n += 1;
    byExt[r.ext].ms += r.timings.cpu_total ?? 0;
    byExt[r.ext].textMs += r.timings.text_extract ?? 0;
    byExt[r.ext].intelMs += r.timings.intelligence ?? 0;
  }
  return { phaseTotals, byExt, bytes, symbols, edges };
}

async function main(): Promise<void> {
  const warn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (String(args[0] ?? '').includes('ts-morph indexer failed')) return;
    warn(...args);
  };

  console.log(`Discovering files under ${BENCHMARK_ROOT}...`);
  let files = listProjectFiles(BENCHMARK_ROOT);
  if (process.env.BENCHMARK_CODE_ONLY !== '0') {
    const before = files.length;
    files = files.filter(isCodeFile);
    console.log(`Code-only filter: ${files.length} / ${before} files`);
  }
  if (BENCHMARK_LIMIT > 0) files = files.slice(0, BENCHMARK_LIMIT);

  const modelsDir = path.join(__dirname, '..', 'models');
  const mem0 = memMb();
  let memPeakRss = mem0.rss;

  // Warmup ts-morph
  resetTsMorphProjects();
  for (const f of files.slice(0, 3)) {
    await routeExtraction(f, modelsDir, true);
  }

  console.log(`\nPhase 1: CPU timing all ${files.length} files (no disk persistence)...`);
  const rows: Array<{ path: string; ext: string; bytes: number; timings: Timings; counts: Record<string, number> }> = [];
  const wallStart = hr();
  for (let i = 0; i < files.length; i++) {
    const f = files[i]!;
    const row = await timeFileComponents(f, modelsDir);
    rows.push({ path: f, ...row });
    memPeakRss = Math.max(memPeakRss, memMb().rss);
    if ((i + 1) % 100 === 0 || i + 1 === files.length) {
      process.stdout.write(`\r  ${i + 1}/${files.length} (${fmtRate(i + 1, hr() - wallStart)})`);
    }
  }
  const wallMs = hr() - wallStart;
  process.stdout.write('\n');

  const agg = aggregate(rows);

  // Phase 2: DB structure timing on sample
  console.log(`\nPhase 2: SQLite structure write (${DB_SAMPLE} file sample, in-memory DB)...`);
  const db = createMemoryDb();
  const sampleStride = Math.max(1, Math.floor(files.length / DB_SAMPLE));
  const dbSamples: number[] = [];
  for (let i = 0; i < files.length && dbSamples.length < DB_SAMPLE; i += sampleStride) {
    const f = files[i]!;
    const { content } = await routeExtraction(f, modelsDir, true);
    dbSamples.push(await timeDbStructure(f, content, db));
  }
  const dbAvgMs = dbSamples.reduce((a, b) => a + b, 0) / dbSamples.length;
  const dbExtrapMs = dbAvgMs * files.length;
  db.close();

  const workers = Math.max(1, Math.floor(os.cpus().length * 0.5));
  const cpuTotal = agg.phaseTotals.cpu_total ?? 0;
  const textTotal = agg.phaseTotals.text_extract ?? 0;
  const tsMorphTotal = agg.phaseTotals.ts_morph ?? 0;
  const intelTotal = agg.phaseTotals.intelligence ?? 0;
  const importTotal = agg.phaseTotals.import_resolve ?? 0;
  const chunkTotal = agg.phaseTotals.chunk_build ?? 0;
  const dbTotal = dbExtrapMs;

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  AIGenius Indexing Benchmark — client/');
  console.log('══════════════════════════════════════════════════════════════');
  console.log(`  Root:            ${BENCHMARK_ROOT}`);
  console.log(`  CPU cores:       ${os.cpus().length} (${workers} default text workers)`);
  console.log(`  Files:           ${files.length}`);
  console.log(`  Source size:     ${(agg.bytes / (1024 * 1024)).toFixed(1)} MB`);
  console.log(`  Wall time:       ${fmtMs(wallMs)} (measured)`);
  console.log(`  Throughput:      ${fmtRate(files.length, wallMs)}`);
  console.log(`  Memory RSS:      ${mem0.rss.toFixed(0)} → ${memPeakRss.toFixed(0)} MB peak`);
  console.log(`  Symbols:         ${agg.symbols.toLocaleString()}`);
  console.log(`  Intel edges:     ${agg.edges.toLocaleString()} (call/import/extends/reference)`);
  console.log('──────────────────────────────────────────────────────────────');
  console.log('  CPU time by component (sum across all files):');
  const phases = [
    ['text_extract', textTotal, 'Extractors — read file content (text-extractor, skip images)'],
    ['ts_morph', tsMorphTotal, 'ts-morph — symbols + call/import/extends/reference edges'],
    ['intelligence', intelTotal, 'Intelligence router — full parse (includes ts-morph for TS/JS)'],
    ['import_resolve', importTotal, 'Import resolver — map relative imports to paths'],
    ['chunk_build', chunkTotal, 'Chunk indexer — symbol-bounded RAG chunks'],
  ] as const;
  for (const [name, ms, desc] of phases) {
    console.log(`    ${name.padEnd(16)} ${fmtMs(ms).padStart(10)}  ${pct(ms, cpuTotal).padStart(5)}  ${desc}`);
  }
  console.log('──────────────────────────────────────────────────────────────');
  console.log('  Estimated full index time (client/):');
  const structCpu = intelTotal + importTotal + chunkTotal;
  const textCpu = textTotal;
  console.log(`    Text phase CPU:       ${fmtMs(textCpu)}  (${pct(textCpu, cpuTotal)} of CPU)`);
  console.log(`    Structure phase CPU:  ${fmtMs(structCpu)}  (${pct(structCpu, cpuTotal)} of CPU)`);
  console.log(`    DB writes (extrap.):  ${fmtMs(dbTotal)}  (avg ${dbAvgMs.toFixed(1)} ms/file × ${files.length})`);
  console.log(`    Total CPU (seq.):     ${fmtMs(cpuTotal + dbTotal)}`);
  console.log(`    With ${workers} workers:        ${fmtMs((cpuTotal + dbTotal) / workers)} (idealized parallel)`);
  console.log(`    Wall ≈ measured:      ${fmtMs(wallMs)} → ${fmtRate(files.length, wallMs)}`);
  console.log('──────────────────────────────────────────────────────────────');
  console.log('  Component impact (what costs the most):');
  console.log(`    1. ts-morph + symbol relationships: ~${pct(intelTotal, cpuTotal)} of CPU`);
  console.log(`       (findReferences, call edges, inheritance — NOT just symbol names)`);
  console.log(`    2. Text extractors:                 ~${pct(textTotal, cpuTotal)} of CPU`);
  console.log(`    3. Import resolution + chunks:      ~${pct(importTotal + chunkTotal, cpuTotal)} of CPU`);
  console.log(`    4. SQLite graph persistence:        ~${fmtMs(dbTotal)} extrapolated`);
  console.log('──────────────────────────────────────────────────────────────');
  console.log('  By extension (top 8 by CPU time):');
  for (const [ext, data] of Object.entries(agg.byExt).sort((a, b) => b[1].ms - a[1].ms).slice(0, 8)) {
    console.log(`    .${ext.padEnd(8)} ${String(data.n).padStart(4)} files  total=${fmtMs(data.ms)}  extract=${fmtMs(data.textMs)}  intel=${fmtMs(data.intelMs)}`);
  }
  console.log('──────────────────────────────────────────────────────────────');
  console.log('  Slowest files (top 8):');
  const slowest = [...rows].sort((a, b) => (b.timings.cpu_total ?? 0) - (a.timings.cpu_total ?? 0)).slice(0, 8);
  for (const r of slowest) {
    console.log(`    ${fmtMs(r.timings.cpu_total ?? 0).padStart(8)}  ${path.relative(BENCHMARK_ROOT, r.path)}  (${r.counts.symbols} sym, ${r.counts.edges} edges)`);
  }
  console.log('══════════════════════════════════════════════════════════════\n');
}

main().catch((e) => { console.error(e); process.exit(1); });
