/**
 * Parses cold-start perf markers from desktop Electron stdout.
 *
 * Prerequisites (dev):
 *   - Tilt web + api healthy, or frontend on FRONTEND_PORT and mini-server external.
 *
 * Usage:
 *   node scripts/profile-cold-start.cjs
 *   node scripts/profile-cold-start.cjs --external-mini-server
 */

const { spawn } = require('child_process');
const path = require('path');

const PERF_PREFIX = '[aigenius-desktop][perf]';
const repoRoot = path.resolve(__dirname, '..', '..', '..');
const desktopDir = path.resolve(__dirname, '..');
const electronBin = path.join(repoRoot, 'node_modules', 'electron', 'cli.js');

const args = process.argv.slice(2);
const externalMiniServer = args.includes('--external-mini-server');

function parsePerfLines(text) {
  const marks = [];
  let summary = null;
  for (const line of text.split('\n')) {
    const idx = line.indexOf(PERF_PREFIX);
    if (idx === -1) continue;
    try {
      const payload = JSON.parse(line.slice(idx + PERF_PREFIX.length).trim());
      if (payload.type === 'startup_mark') {
        marks.push(payload);
      } else if (payload.type === 'startup_summary') {
        summary = payload;
      }
    } catch {
      /* ignore non-json perf lines */
    }
  }
  return { marks, summary };
}

async function main() {
  const env = {
    ...process.env,
    AIGENIUS_DESKTOP_PERF: '1',
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

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    const text = chunk.toString();
    stdout += text;
    process.stdout.write(text);
  });
  child.stderr.on('data', (chunk) => {
    const text = chunk.toString();
    stderr += text;
    process.stderr.write(text);
  });

  const deadline = Date.now() + 240_000;
  await new Promise((resolve) => {
    const timer = setInterval(() => {
      const { summary } = parsePerfLines(stdout);
      if (summary || Date.now() > deadline) {
        clearInterval(timer);
        if (!summary && Date.now() > deadline) {
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

  const { marks, summary } = parsePerfLines(stdout + stderr);
  const report = {
    mode: externalMiniServer ? 'external-mini-server' : 'full-local',
    marks,
    summary,
    capturedAtIso: new Date().toISOString(),
  };

  console.log('\n--- cold-start report ---');
  console.log(JSON.stringify(report, null, 2));

  if (!summary) {
    console.error('No startup_summary captured. Is the frontend reachable?');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
