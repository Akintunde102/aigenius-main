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

let warmupStarted = false;

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

const child = spawn(process.execPath, [nextBin, 'dev', '-p', String(port)], {
  cwd: frontendRoot,
  stdio: 'inherit',
  env: process.env,
});

child.on('spawn', () => {
  startDesktopWarmup();
});

child.on('error', (err) => {
  console.error('[web dev-tilt] Failed to start Next:', err.message);
  process.exit(1);
});

child.on('close', (code, signal) => {
  if (signal) {
    process.exit(128);
    return;
  }
  process.exit(code ?? 1);
});
