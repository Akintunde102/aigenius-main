'use strict';

const fs = require('fs');
const path = require('path');

const desktopRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(desktopRoot, '..');
const frontend = path.join(repoRoot, 'frontend');
const standaloneSrc = path.join(frontend, '.next', 'standalone');
const staticSrc = path.join(frontend, '.next', 'static');
const publicSrc = path.join(frontend, 'public');
const serverSrc = path.join(repoRoot, 'desktop-server', 'dist');
const outRoot = path.join(desktopRoot, 'dist-resources');
const outNext = path.join(outRoot, 'next-standalone');
const outServer = path.join(outRoot, 'desktop-server');

if (!fs.existsSync(standaloneSrc)) {
  console.error(
    'Missing frontend/.next/standalone. Run from repo root:\n' +
    '  cd frontend && npm run build:desktop',
  );
  process.exit(1);
}

if (!fs.existsSync(serverSrc)) {
  console.error('Missing desktop-server/dist. Run: cd desktop-server && npm run build');
  process.exit(1);
}

fs.rmSync(outRoot, { recursive: true, force: true });
fs.mkdirSync(outNext, { recursive: true });
fs.mkdirSync(outServer, { recursive: true });

fs.cpSync(standaloneSrc, outNext, { recursive: true });
fs.cpSync(staticSrc, path.join(outNext, '.next', 'static'), { recursive: true });
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, path.join(outNext, 'public'), { recursive: true });
}
const pkgJson = path.join(repoRoot, 'desktop-server', 'package.json');
const nodeMods = path.join(repoRoot, 'desktop-server', 'node_modules');
const indexJs = path.join(serverSrc, 'index.js');

if (!fs.existsSync(indexJs)) {
  console.error('Missing desktop-server/dist/index.js. Run: cd desktop-server && npm run build');
  process.exit(1);
}
if (!fs.existsSync(nodeMods)) {
  console.error('Missing desktop-server/node_modules. Run: cd desktop-server && npm install');
  process.exit(1);
}

/** Full `dist/` tree (tts/, search/, python/voice_sidecar.py, …) — required at runtime; `index.js` alone is not enough. */
fs.cpSync(serverSrc, outServer, { recursive: true });
fs.cpSync(nodeMods, path.join(outServer, 'node_modules'), { recursive: true });
fs.copyFileSync(pkgJson, path.join(outServer, 'package.json'));
const reqTts = path.join(repoRoot, 'desktop-server', 'requirements-tts.txt');
if (fs.existsSync(reqTts)) {
  fs.copyFileSync(reqTts, path.join(outServer, 'requirements-tts.txt'));
}

console.info('Prepared desktop/dist-resources (next-standalone + desktop-server)');
