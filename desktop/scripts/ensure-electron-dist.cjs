'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const desktopRoot = path.resolve(__dirname, '..');

function electronDistCandidates() {
  return [
    path.join(desktopRoot, 'node_modules', 'electron', 'dist'),
    path.join(desktopRoot, '..', 'node_modules', 'electron', 'dist'),
  ];
}

function hasElectronApp(distDir) {
  return (
    fs.existsSync(path.join(distDir, 'Electron.app'))
    || fs.existsSync(path.join(distDir, 'electron.exe'))
    || fs.existsSync(path.join(distDir, 'electron'))
  );
}

function findElectronDist() {
  for (const dist of electronDistCandidates()) {
    if (hasElectronApp(dist)) return dist;
  }
  return null;
}

function tryInstallElectron() {
  const installScript = electronDistCandidates()
    .map((dist) => path.join(path.dirname(dist), 'install.js'))
    .find((script) => fs.existsSync(script));

  if (!installScript) return false;

  console.log('ensure-electron-dist: downloading Electron via npm electron/install.js …');
  const result = spawnSync(process.execPath, [installScript], {
    cwd: path.dirname(installScript),
    stdio: 'inherit',
  });
  return result.status === 0 && Boolean(findElectronDist());
}

function main() {
  const dist = findElectronDist();
  if (dist) {
    console.log(`ensure-electron-dist: using ${dist}`);
    return;
  }

  if (tryInstallElectron()) {
    console.log(`ensure-electron-dist: using ${findElectronDist()}`);
    return;
  }

  throw new Error(
    'Electron binary not found. Install deps from the client workspace root:\n' +
      '  cd client && npm install\n' +
      'Then re-run packaging. electron-builder is configured to use ../node_modules/electron/dist.',
  );
}

main();
