/**
 * Synthetic IPC round-trip benchmark (renderer invoke → main handler).
 *
 * Prerequisites (dev):
 *   - Frontend reachable at FRONTEND_PORT (Tilt `web` or `npm run dev` in frontend).
 *   - Mini-server healthy (local spawn or --external-mini-server).
 *
 * Usage:
 *   node scripts/profile-ipc-benchmark.cjs
 *   node scripts/profile-ipc-benchmark.cjs --external-mini-server
 */

const { spawn } = require('child_process');
const path = require('path');

const PERF_PREFIX = '[aigenius-desktop][perf]';
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const desktopDir = path.resolve(__dirname, '..');
const electronBin = path.join(repoRoot, 'node_modules', 'electron', 'cli.js');

const args = process.argv.slice(2);
const externalMiniServer = args.includes('--external-mini-server');

function parseBenchmark(text) {
  for (const line of text.split('\n')) {
    const idx = line.indexOf(PERF_PREFIX);
    if (idx === -1) continue;
    try {
      const payload = JSON.parse(line.slice(idx + PERF_PREFIX.length).trim());
      if (payload.type === 'ipc_benchmark') {
        return payload;
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

async function main() {
  const env = {
    ...process.env,
    AIGENIUS_DESKTOP_PERF: '1',
    AIGENIUS_DESKTOP_PERF_BENCHMARK: '1',
    ELECTRON_DISABLE_SANDBOX: '1',
    NODE_ENV: process.env.NODE_ENV || 'development',
  };
  if (externalMiniServer) {
    env.AIGENIUS_EXTERNAL_MINI_SERVER = '1';
    env.AIGENIUS_EXTERNAL_INDEXER = '1';
  }

  const child = spawn(process.execPath, [electronBin, desktopDir], {
    cwd: desktopDir,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let output = '';
  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    output += text;
    process.stdout.write(text);
  });
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    output += text;
    process.stderr.write(text);
  });

  const deadline = Date.now() + 240_000;
  await new Promise((resolve) => {
    const timer = setInterval(() => {
      if (parseBenchmark(output) || Date.now() > deadline) {
        clearInterval(timer);
        if (!parseBenchmark(output) && Date.now() > deadline) {
          child.kill();
        }
        resolve(undefined);
      }
    }, 500);
    child.on('exit', () => {
      clearInterval(timer);
      resolve(undefined);
    });
  });

  const benchmark = parseBenchmark(output);
  console.log('\n--- ipc benchmark report ---');
  console.log(JSON.stringify({ benchmark, capturedAtIso: new Date().toISOString() }, null, 2));

  if (!benchmark) {
    console.error('No ipc_benchmark payload captured.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
