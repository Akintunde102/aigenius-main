#!/usr/bin/env node
'use strict';
/** Runs indexing-benchmark.ts via Electron-as-Node (correct better-sqlite3 ABI on Windows). */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const electron = path.join(root, '..', 'node_modules', 'electron', 'dist', 'electron.exe');
const tsx = path.join(root, '..', 'node_modules', 'tsx', 'dist', 'cli.mjs');
const script = path.join(root, 'scripts', 'indexing-benchmark.ts');

const result = spawnSync(electron, [tsx, script, ...process.argv.slice(2)], {
  cwd: root,
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  stdio: 'inherit',
  shell: false,
});

process.exit(result.status ?? 1);
