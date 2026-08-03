'use strict';

const fs = require('fs');
const path = require('path');

const { resolveServerNodeModules } = require('./resolve-server-node-modules.cjs');

function resolvePythonVenvDir(desktopRoot) {
  const platform = process.env.AIGENIUS_PACKAGE_PLATFORM?.trim() || process.platform;
  const arch = process.env.AIGENIUS_PACKAGE_ARCH?.trim() || process.arch;
  const packed = path.resolve(
    desktopRoot,
    '..',
    'desktop-server',
    'pack-deps',
    `python-venv-${platform}-${arch}`,
  );
  const hostPacked = path.resolve(
    desktopRoot,
    '..',
    'desktop-server',
    'pack-deps',
    `python-venv-${process.platform}-${process.arch}`,
  );
  if (fs.existsSync(packed)) return packed;
  if (fs.existsSync(hostPacked)) return hostPacked;
  fs.mkdirSync(packed, { recursive: true });
  return packed;
}

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
const outPythonVenv = path.join(outRoot, 'python-venv');

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
const nestedStandaloneApp = path.join(outNext, 'frontend');
if (fs.existsSync(path.join(nestedStandaloneApp, 'server.js'))) {
  fs.cpSync(staticSrc, path.join(nestedStandaloneApp, '.next', 'static'), { recursive: true });
  if (fs.existsSync(publicSrc)) {
    fs.cpSync(publicSrc, path.join(nestedStandaloneApp, 'public'), { recursive: true });
  }
}
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, path.join(outNext, 'public'), { recursive: true });
}
const pkgJson = path.join(repoRoot, 'desktop-server', 'package.json');
let nodeMods;
try {
  nodeMods = resolveServerNodeModules(desktopRoot);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
const honoServer = path.join(nodeMods, '@hono', 'node-server');
if (!fs.existsSync(honoServer)) {
  console.error(
    'Incomplete desktop-server node_modules (missing @hono/node-server).\n' +
      'Workspace hoisting leaves desktop-server/node_modules incomplete.\n' +
      '  Run: cd desktop && npm run install:server-deps',
  );
  process.exit(1);
}
const indexJs = path.join(serverSrc, 'index.js');

if (!fs.existsSync(indexJs)) {
  console.error('Missing desktop-server/dist/index.js. Run: cd desktop-server && npm run build');
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

const pythonVenvSrc = resolvePythonVenvDir(desktopRoot);
fs.cpSync(pythonVenvSrc, outPythonVenv, { recursive: true });

const upstreamApiUrl = resolveUpstreamApiUrlForPackage(desktopRoot);
if (upstreamApiUrl === 'http://localhost:8000') {
  console.warn(
    '[prepare-desktop-resources] WARNING: upstream API defaults to http://localhost:8000. '
      + 'Copy desktop/package.env.example to desktop/package.env and set AIGENIUS_UPSTREAM_API_URL '
      + 'to your hosted API (e.g. Railway) before packaging.',
  );
}
fs.writeFileSync(
  path.join(outRoot, 'package-runtime.json'),
  `${JSON.stringify({ upstreamApiUrl }, null, 2)}\n`,
);

console.info(`Prepared desktop/dist-resources (next-standalone + desktop-server, node_modules from ${nodeMods}, python-venv from ${pythonVenvSrc}, upstream ${upstreamApiUrl})`);

function resolveUpstreamApiUrlForPackage(desktopRoot) {
  const fromEnv = process.env.AIGENIUS_UPSTREAM_API_URL?.trim();
  if (fromEnv) return fromEnv;

  const packageEnvPath = path.join(desktopRoot, 'package.env');
  if (fs.existsSync(packageEnvPath)) {
    for (const line of fs.readFileSync(packageEnvPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (key === 'AIGENIUS_UPSTREAM_API_URL' && value) return value;
    }
  }

  return 'http://localhost:8000';
}
