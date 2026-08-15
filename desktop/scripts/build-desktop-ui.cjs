'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

function resolveDesktopUiMode() {
  const raw = process.env.AIGENIUS_DESKTOP_UI?.trim().toLowerCase();
  if (raw === 'next') {
    return 'next';
  }
  return 'vite';
}

const desktopRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(desktopRoot, '..');
const mode = resolveDesktopUiMode();

const cwd =
  mode === 'next'
    ? path.join(repoRoot, 'frontend')
  : path.join(repoRoot, 'desktop-renderer');

const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const script = mode === 'next' ? 'build:desktop' : 'build';

console.info(`[build:desktop:ui] mode=${mode} cwd=${cwd} script=${script}`);

const result = spawnSync(npmCmd, ['run', script], {
  cwd,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
