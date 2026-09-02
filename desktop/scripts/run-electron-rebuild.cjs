'use strict';

/**
 * Run @electron/rebuild with desktop's node-abi (supports Electron 43.x).
 * Hoisted client/node_modules/node-abi@3.x does not know Electron 43.4.1.
 */
const fs = require('fs');
const path = require('path');
const Module = require('module');

const desktopRoot = path.resolve(__dirname, '..');
const clientRoot = path.resolve(desktopRoot, '..');
const desktopNodeAbiRoot = path.join(desktopRoot, 'node_modules', 'node-abi');
const desktopNodeAbiEntry = path.join(desktopNodeAbiRoot, 'index.js');

if (!fs.existsSync(desktopNodeAbiEntry)) {
  console.error(
    'run-electron-rebuild: missing desktop node-abi — run `npm install` in client/desktop',
  );
  process.exit(1);
}

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveWithDesktopNodeAbi(request, parent, isMain, options) {
  if (request === 'node-abi') {
    return desktopNodeAbiEntry;
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};

function resolveElectronRebuildCli() {
  const candidates = [
    path.join(desktopRoot, 'node_modules', '@electron', 'rebuild', 'lib', 'cli.js'),
    path.join(clientRoot, 'node_modules', '@electron', 'rebuild', 'lib', 'cli.js'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  try {
    return require.resolve('@electron/rebuild/lib/cli.js', { paths: [desktopRoot, clientRoot] });
  } catch {
    console.error('run-electron-rebuild: missing @electron/rebuild');
    process.exit(1);
  }
}

require(resolveElectronRebuildCli());
