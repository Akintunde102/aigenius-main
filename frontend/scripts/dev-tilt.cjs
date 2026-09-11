'use strict';

/**
 * Tilt entry for the Next.js dev server.
 * Starts `next dev`, then warms desktop-critical routes so Electron does not hit cold compiles.
 */
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const {
  resolveFrontendPort,
  waitForFrontendReady,
} = require('../../../scripts/ensure-frontend-ready.cjs');
const { isPortFree } = require('../../../scripts/dev-ports.cjs');

const frontendRoot = path.join(__dirname, '..');
const port = resolveFrontendPort();
const nextBin = path.join(frontendRoot, '..', 'node_modules', 'next', 'dist', 'bin', 'next');

// `next build` / `build:desktop` leaves a production `.next` tree. Running `next dev`
// on top of it can fail with missing vendor chunks (e.g. react-icons.js).
const nextDir = path.join(frontendRoot, '.next');
const productionBuildMarker = path.join(nextDir, 'BUILD_ID');
if (fs.existsSync(productionBuildMarker)) {
  console.warn(
    '[dev] Clearing production .next cache (from `next build` / `build:desktop`) before starting dev…',
  );
  fs.rmSync(nextDir, { recursive: true, force: true });
}

spawnSync(process.execPath, [path.join(__dirname, 'copy-vad-assets.cjs')], {
  cwd: frontendRoot,
  stdio: 'inherit',
});

/** Orphaned `next dev` from a prior Tilt session can hold the port and cause EADDRINUSE. */
function stopStaleNextOnPort(listenPort) {
  if (process.platform === 'win32') {
    const script = `
      Get-NetTCPConnection -LocalPort ${listenPort} -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
    `.trim();
    spawnSync('powershell', ['-NoProfile', '-Command', script], { stdio: 'ignore' });
    return;
  }

  spawnSync('bash', ['-lc', `lsof -ti:${listenPort} | xargs -r kill -9 2>/dev/null || true`], {
    stdio: 'ignore',
  });
}

function killProcessTree(childProc) {
  if (!childProc?.pid || childProc.killed) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/PID', String(childProc.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  childProc.kill('SIGTERM');
}

let warmupStarted = false;
let nextChild = null;

function startDesktopWarmup() {
  if (warmupStarted) return;
  warmupStarted = true;

  waitForFrontendReady({
    port,
    warmup: true,
    logPrefix: '[web dev-tilt]',
    timeoutMs: 360_000,
  }).catch((err) => {
    console.warn('[web dev-tilt] desktop route warmup failed:', err.message || err);
  });
}

async function startNextDev() {
  stopStaleNextOnPort(port);

  const portNum = Number(port);
  if (!(await isPortFree(portNum))) {
    console.error(
      `[web dev-tilt] Port ${port} is still in use after cleanup. Run \`npm run dev:tilt:down\` or restart Tilt.`,
    );
    process.exit(1);
  }

  nextChild = spawn(process.execPath, [nextBin, 'dev', '-p', String(port)], {
    cwd: frontendRoot,
    stdio: 'inherit',
    env: process.env,
  });

  nextChild.on('spawn', () => {
    startDesktopWarmup();
  });

  nextChild.on('error', (err) => {
    console.error('[web dev-tilt] Failed to start Next:', err.message);
    process.exit(1);
  });

  nextChild.on('close', (code, signal) => {
    nextChild = null;
    if (signal) {
      process.exit(128);
      return;
    }
    process.exit(code ?? 1);
  });
}

function shutdown() {
  killProcessTree(nextChild);
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(130);
});
process.on('SIGTERM', () => {
  shutdown();
  process.exit(143);
});
process.on('exit', shutdown);

startNextDev().catch((err) => {
  console.error('[web dev-tilt] Failed to start:', err.message || err);
  process.exit(1);
});
