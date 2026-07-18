#!/usr/bin/env node
/**
 * Live benchmark for local desktop search/indexer tools (sidecar HTTP).
 *
 * Prerequisites:
 *   - desktop-server running (default http://localhost:8001)
 *   - AIGENIUS_SECRET_TOKEN set in env or passed via --token
 *
 * Environment:
 *   BENCHMARK_SIDECAR_URL   — default http://localhost:8001
 *   AIGENIUS_SECRET_TOKEN     — bearer token (required)
 *   BENCHMARK_ITERATIONS    — per-endpoint iterations (default 10)
 *   BENCHMARK_TOOLS           — comma list: status,rag,reindex,symbols,context (default all)
 *
 * Run:
 *   cd client/desktop-server
 *   AIGENIUS_SECRET_TOKEN=... npm run benchmark:local-tools
 */

const BASE_URL = (process.env.BENCHMARK_SIDECAR_URL ?? 'http://localhost:8001').replace(/\/$/, '');
const TOKEN = process.env.AIGENIUS_SECRET_TOKEN ?? '';
const ITERATIONS = Math.max(1, parseInt(process.env.BENCHMARK_ITERATIONS ?? '10', 10) || 10);

const ALL_TOOLS = ['status', 'rag', 'reindex', 'symbols', 'context'];

function parseToolFilter() {
  const raw = process.env.BENCHMARK_TOOLS?.trim();
  if (!raw) return new Set(ALL_TOOLS);
  return new Set(raw.split(',').map((s) => s.trim()).filter(Boolean));
}

function roundMs(ms) {
  return Math.round(ms * 100) / 100;
}

async function timedFetch(name, fn) {
  const t0 = performance.now();
  const result = await fn();
  const ms = roundMs(performance.now() - t0);
  return { name, ms, result };
}

function authHeaders() {
  if (!TOKEN) {
    console.error('[benchmark] AIGENIUS_SECRET_TOKEN is required');
    process.exit(1);
  }
  return {
    Authorization: `Bearer ${TOKEN}`,
    'Content-Type': 'application/json',
  };
}

async function benchStatus() {
  const samples = [];
  let lastBody = null;
  for (let i = 0; i < ITERATIONS; i += 1) {
    const row = await timedFetch('GET /search/status', async () => {
      const res = await fetch(`${BASE_URL}/search/status`, { headers: authHeaders() });
      const body = await res.json();
      if (!res.ok) throw new Error(`status ${res.status}: ${JSON.stringify(body)}`);
      return body;
    });
    samples.push(row.ms);
    lastBody = row.result;
  }
  return { tool: 'status', samples, lastBody };
}

async function benchRag() {
  const samples = [];
  let lastBody = null;
  const payload = {
    contentQuery: 'helper function',
    pathQuery: '',
    topK: 5,
    pathPrefix: '',
  };
  for (let i = 0; i < ITERATIONS; i += 1) {
    const row = await timedFetch('POST /search/rag', async () => {
      const res = await fetch(`${BASE_URL}/search/rag`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(`status ${res.status}: ${JSON.stringify(body)}`);
      return body;
    });
    samples.push(row.ms);
    lastBody = row.result;
  }
  return { tool: 'rag', samples, lastBody };
}

async function benchReindex() {
  const samples = [];
  let lastBody = null;
  const payload = { paths: [], force: false };
  for (let i = 0; i < Math.min(3, ITERATIONS); i += 1) {
    const row = await timedFetch('POST /search/reindex', async () => {
      const res = await fetch(`${BASE_URL}/search/reindex`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(`status ${res.status}: ${JSON.stringify(body)}`);
      return body;
    });
    samples.push(row.ms);
    lastBody = row.result;
  }
  return { tool: 'reindex', samples, lastBody };
}

async function benchSymbols() {
  const samples = [];
  let lastBody = null;
  for (let i = 0; i < ITERATIONS; i += 1) {
    const row = await timedFetch('GET /search/symbols', async () => {
      const res = await fetch(`${BASE_URL}/search/symbols?name=helper`, {
        headers: authHeaders(),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(`status ${res.status}: ${JSON.stringify(body)}`);
      return body;
    });
    samples.push(row.ms);
    lastBody = row.result;
  }
  return { tool: 'symbols', samples, lastBody };
}

async function benchContext() {
  const samples = [];
  let lastBody = null;
  const payload = { input: 'src', pathPrefix: '' };
  for (let i = 0; i < ITERATIONS; i += 1) {
    const row = await timedFetch('POST /search/context', async () => {
      const res = await fetch(`${BASE_URL}/search/context`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(`status ${res.status}: ${JSON.stringify(body)}`);
      return body;
    });
    samples.push(row.ms);
    lastBody = row.result;
  }
  return { tool: 'context', samples, lastBody };
}

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? 0;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1] ?? 0;
  const max = sorted[sorted.length - 1] ?? 0;
  const avg = sorted.reduce((a, b) => a + b, 0) / (sorted.length || 1);
  return { p50: roundMs(p50), p95: roundMs(p95), max: roundMs(max), avg: roundMs(avg), n: sorted.length };
}

async function main() {
  const filter = parseToolFilter();
  console.log(`[benchmark] sidecar=${BASE_URL} iterations=${ITERATIONS} tools=${[...filter].join(',')}`);

  const runners = {
    status: benchStatus,
    rag: benchRag,
    reindex: benchReindex,
    symbols: benchSymbols,
    context: benchContext,
  };

  const results = [];
  for (const [key, fn] of Object.entries(runners)) {
    if (!filter.has(key)) continue;
    try {
      const row = await fn();
      const stats = summarize(row.samples);
      results.push({ tool: key, stats, lastBody: row.lastBody });
      console.log(
        `[benchmark] ${key}: p50=${stats.p50}ms p95=${stats.p95}ms max=${stats.max}ms avg=${stats.avg}ms (n=${stats.n})`,
      );
    } catch (err) {
      console.error(`[benchmark] ${key} FAILED:`, err instanceof Error ? err.message : err);
      process.exitCode = 1;
    }
  }

  console.log('\n=== Summary ===');
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error('[benchmark] fatal:', err);
  process.exit(1);
});
