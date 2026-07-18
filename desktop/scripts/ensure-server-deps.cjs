'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const clientRoot = path.join(__dirname, '..', '..');
const serverDir = path.join(clientRoot, 'desktop-server');

function moduleInstalled(name) {
  const local = path.join(serverDir, 'node_modules', name, 'package.json');
  const hoisted = path.join(clientRoot, 'node_modules', name, 'package.json');
  return fs.existsSync(local) || fs.existsSync(hoisted);
}

function needsInstall() {
  return !moduleInstalled('better-sqlite3') || !moduleInstalled('onnxruntime-node');
}

if (!needsInstall()) {
  process.exit(0);
}

console.info(
  '[ensure-server-deps] Installing desktop-server dependencies (--ignore-scripts)...',
);
const result = spawnSync('npm', ['install', '--ignore-scripts'], {
  cwd: serverDir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
