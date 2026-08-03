const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const frontendRoot = path.join(__dirname, '..');
const port = process.env.PORT || process.env.DEV_WEB_PORT || '23001';
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

const result = spawnSync(process.execPath, [nextBin, 'dev', '-p', String(port)], {
  cwd: frontendRoot,
  stdio: 'inherit',
  env: process.env,
});

process.exit(result.status ?? 1);
