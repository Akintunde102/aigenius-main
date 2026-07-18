#!/usr/bin/env node
'use strict';
/** Runs intelligence-deep-test.ts via Electron-as-Node (correct better-sqlite3 ABI on Windows). */
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.join(__dirname, '..');
const electron = path.join(root, '..', 'node_modules', 'electron', 'dist', 'electron.exe');
const tsx = path.join(root, '..', 'node_modules', 'tsx', 'dist', 'cli.mjs');
const script = path.join(root, 'scripts', 'intelligence-deep-test.ts');

const result = spawnSync(electron, [tsx, script], {
  cwd: root,
  env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  stdio: 'inherit',
  shell: false,
});

process.exit(result.status ?? 1);
