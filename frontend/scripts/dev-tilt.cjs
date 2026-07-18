const { spawnSync } = require('child_process');
const path = require('path');

const frontendRoot = path.join(__dirname, '..');
const port = process.env.PORT || process.env.DEV_WEB_PORT || '23001';
const nextBin = path.join(frontendRoot, '..', 'node_modules', 'next', 'dist', 'bin', 'next');

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
