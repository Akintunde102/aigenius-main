/**
 * Live stress test for desktop sidecar endpoints used by local_* tools.
 * Spawns a real server, floods the index queue, and hammers HTTP routes under client timeouts.
 *
 * Usage: node scripts/benchmark-local-desktop-tools.cjs
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

const REPO_ROOT = path.resolve(__dirname, '..');
const DIST_ENTRY = path.join(REPO_ROOT, 'dist', 'index.js');
const TOKEN = 'benchmark-stress-token';
const CLIENT_STATUS_TIMEOUT_MS = 10_000;
const CLIENT_DEFAULT_TIMEOUT_MS = 15_000;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function percentile(sorted, p) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.floor(sorted.length * p));
  return sorted[idx];
}

async function fetchWithTimeout(url, init = {}, timeoutMs = CLIENT_DEFAULT_TIMEOUT_MS) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const started = Date.now();
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
    return { ok: res.ok, status: res.status, body, ms: Date.now() - started };
  } catch (err) {
    return {
      ok: false,
      status: 0,
      body: null,
      ms: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
      timedOut: err instanceof Error && err.name === 'AbortError',
    };
  } finally {
    clearTimeout(timer);
  }
}

function pickFreePort() {
  return new Promise((resolve, reject) => {
    const srv = http.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const port = srv.address().port;
      srv.close((err) => (err ? reject(err) : resolve(port)));
    });
  });
}

function seedFiles(rootDir, count) {
  const src = path.join(rootDir, 'src');
  fs.mkdirSync(src, { recursive: true });
  for (let i = 0; i < count; i += 1) {
    fs.writeFileSync(
      path.join(src, `module-${i}.ts`),
      `export const value${i} = ${i};\n// benchmark stress file ${i}\n`,
      'utf8',
    );
  }
}

async function waitForHealth(baseUrl, maxMs = 60_000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const res = await fetchWithTimeout(`${baseUrl}/health`, {}, 2_000);
    if (res.ok && res.status === 200) return res;
    await sleep(250);
  }
  throw new Error(`Health check failed within ${maxMs}ms`);
}

async function runConcurrent(label, count, fn) {
  const results = await Promise.all(Array.from({ length: count }, () => fn()));
  const failures = results.filter((r) => !r.ok);
  const times = results.map((r) => r.ms).sort((a, b) => a - b);
  return {
    label,
    count,
    failures: failures.length,
    timeouts: failures.filter((f) => f.timedOut).length,
    p50: percentile(times, 0.5),
    p95: percentile(times, 0.95),
    max: times[times.length - 1] ?? 0,
    sampleErrors: [...new Set(failures.map((f) => f.error || `HTTP ${f.status}`))].slice(0, 5),
  };
}

async function main() {
  if (!fs.existsSync(DIST_ENTRY)) {
    console.error('Missing dist/index.js — run: npm run build');
    process.exit(1);
  }

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-sidecar-stress-'));
  const watchDir = path.join(tmpRoot, 'project');
  const dbPath = path.join(tmpRoot, 'search.sqlite');
  const port = await pickFreePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  const auth = { Authorization: `Bearer ${TOKEN}` };

  console.log('=== AIGenius sidecar local-tool stress benchmark ===');
  console.log(`Temp root: ${tmpRoot}`);
  console.log(`Port: ${port}`);
  console.log(`Seeding files...`);

  seedFiles(watchDir, 400);

  const child = spawn(process.execPath, [DIST_ENTRY], {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      PORT: String(port),
      HOST: '127.0.0.1',
      AIGENIUS_SECRET_TOKEN: TOKEN,
      AIGENIUS_DB_PATH: dbPath,
      AIGENIUS_SEARCH_WATCH_PATHS: watchDir,
      AIGENIUS_ENABLE_TTS: '0',
      AIGENIUS_SEARCH_INIT_DELAY_MS: '1000',
      AIGENIUS_SEARCH_WORKERS: '4',
      AIGENIUS_TREE_SITTER: '0',
      AIGENIUS_SEARCH_IMAGES: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let serverLog = '';
  child.stdout.on('data', (d) => {
    serverLog += d.toString();
  });
  child.stderr.on('data', (d) => {
    serverLog += d.toString();
  });

  const reports = [];

  try {
    const health = await waitForHealth(baseUrl);
    reports.push({ phase: 'boot', healthMs: health.ms });

    // Phase A: hammer /search/status while search module is still initializing (high pressure window)
    console.log('\nPhase A: status during early boot (before index ready)...');
    const earlyStatus = await runConcurrent('GET /search/status (boot)', 40, () =>
      fetchWithTimeout(`${baseUrl}/search/status`, { headers: auth }, CLIENT_STATUS_TIMEOUT_MS),
    );
    reports.push({ phase: 'A-early-status', ...earlyStatus });

    await sleep(3500);

    // Phase B: queue a large rescan while hitting status/rag/context
    console.log('Phase B: reindex flood + concurrent tool routes...');
    const reindex = await fetchWithTimeout(
      `${baseUrl}/search/reindex`,
      {
        method: 'POST',
        headers: { ...auth, 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: [watchDir] }),
      },
      CLIENT_DEFAULT_TIMEOUT_MS,
    );
    reports.push({ phase: 'B-reindex', ok: reindex.ok, status: reindex.status, ms: reindex.ms });

    const underLoad = await Promise.all([
      runConcurrent('GET /search/status (under load)', 60, () =>
        fetchWithTimeout(`${baseUrl}/search/status`, { headers: auth }, CLIENT_STATUS_TIMEOUT_MS),
      ),
      runConcurrent('POST /search/rag (under load)', 20, () =>
        fetchWithTimeout(
          `${baseUrl}/search/rag`,
          {
            method: 'POST',
            headers: { ...auth, 'Content-Type': 'application/json' },
            body: JSON.stringify({ contentQuery: 'benchmark stress', topK: 5, pathPrefix: watchDir }),
          },
          CLIENT_DEFAULT_TIMEOUT_MS,
        ),
      ),
      runConcurrent('POST /search/context (under load)', 20, () =>
        fetchWithTimeout(
          `${baseUrl}/search/context`,
          {
            method: 'POST',
            headers: { ...auth, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              input: path.join(watchDir, 'src', 'module-1.ts'),
              pathPrefix: watchDir,
            }),
          },
          CLIENT_DEFAULT_TIMEOUT_MS,
        ),
      ),
      runConcurrent('GET /search/symbols (under load)', 15, () =>
        fetchWithTimeout(
          `${baseUrl}/search/symbols?path=${encodeURIComponent(path.join(watchDir, 'src', 'module-2.ts'))}`,
          { headers: auth },
          CLIENT_DEFAULT_TIMEOUT_MS,
        ),
      ),
    ]);
    reports.push({ phase: 'B-under-load', routes: underLoad });

    await sleep(2000);

    // Phase C: auth / connectivity failure modes (what the desktop client surfaces generically)
    console.log('Phase C: failure modes...');
    const noAuth = await fetchWithTimeout(`${baseUrl}/search/status`, {}, CLIENT_STATUS_TIMEOUT_MS);
    const badAuth = await fetchWithTimeout(
      `${baseUrl}/search/status`,
      { headers: { Authorization: 'Bearer wrong' } },
      CLIENT_STATUS_TIMEOUT_MS,
    );
    const deadPort = await fetchWithTimeout(
      `http://127.0.0.1:${port + 1}/search/status`,
      { headers: auth },
      3_000,
    );
    reports.push({
      phase: 'C-failures',
      noAuth: { status: noAuth.status, ok: noAuth.ok },
      badAuth: { status: badAuth.status, ok: badAuth.ok },
      deadPort: { error: deadPort.error, timedOut: deadPort.timedOut },
    });

    const finalStatus = await fetchWithTimeout(`${baseUrl}/search/status`, { headers: auth }, CLIENT_STATUS_TIMEOUT_MS);
    reports.push({
      phase: 'final-status',
      ok: finalStatus.ok,
      status: finalStatus.status,
      body: finalStatus.body,
      ms: finalStatus.ms,
    });
  } finally {
    child.kill('SIGTERM');
    await sleep(500);
    try {
      fs.rmSync(tmpRoot, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors on Windows file locks
    }
  }

  console.log('\n=== RESULTS ===');
  console.log(JSON.stringify(reports, null, 2));

  const statusUnderLoad = reports.find((r) => r.phase === 'B-under-load')?.routes?.[0];
  const hadStatusFailures = (statusUnderLoad?.failures ?? 0) > 0 || (statusUnderLoad?.timeouts ?? 0) > 0;
  const earlyFailures = reports.find((r) => r.phase === 'A-early-status');
  const earlyBad = (earlyFailures?.failures ?? 0) > 0 || (earlyFailures?.timeouts ?? 0) > 0;

  if (hadStatusFailures || earlyBad) {
    console.error('\nFAIL: /search/status failed or timed out under pressure.');
    process.exit(1);
  }

  console.log('\nPASS: sidecar tool routes remained reachable under stress.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
