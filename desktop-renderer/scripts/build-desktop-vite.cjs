/**
 * Desktop Vite production build: mini-server on 127.0.0.1:8001, optional hosted upstream for CSP + direct API.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const { readPortsFile, DEFAULTS } = require('../../../scripts/dev-ports.cjs');
const { loadDesktopBuildEnv } = require('./load-desktop-build-env.cjs');

function readUpstreamFromPackageEnv() {
  const fromEnv = process.env.AIGENIUS_UPSTREAM_API_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const packageEnvPath = path.join(__dirname, '..', '..', 'desktop', 'package.env');
  if (!fs.existsSync(packageEnvPath)) {
    return undefined;
  }

  for (const line of fs.readFileSync(packageEnvPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key === 'AIGENIUS_UPSTREAM_API_URL' && value) {
      return value;
    }
  }

  return undefined;
}

const upstream = readUpstreamFromPackageEnv();
const ports = readPortsFile() || DEFAULTS;
const sidecarPort = ports.sidecar ?? DEFAULTS.sidecar;
const apiPort = ports.api ?? DEFAULTS.api;
const miniServerRoot = `http://127.0.0.1:${sidecarPort}`;
const apiRoot = upstream || `http://localhost:${apiPort}`;

const walletEnv = loadDesktopBuildEnv();

const env = {
  ...process.env,
  NODE_ENV: 'production',
  NEXT_PUBLIC_NOBOX_API_ROOT_URL: miniServerRoot,
  NEXT_PUBLIC_MINI_SERVER_PORT: String(sidecarPort),
  NEXT_PUBLIC_DESKTOP_SIDECAR_PORT: String(sidecarPort),
  NEXT_PUBLIC_DESKTOP_UPSTREAM_API_URL: apiRoot,
  ...walletEnv,
};

if (!upstream) {
  console.warn(
    '[desktop-renderer build] No AIGENIUS_UPSTREAM_API_URL — using API port from .dev-ports.json:',
    apiRoot,
  );
}

const rendererRoot = path.join(__dirname, '..');
const viteBin = path.join(rendererRoot, 'node_modules', 'vite', 'bin', 'vite.js');
const viteCmd = fs.existsSync(viteBin) ? process.execPath : 'npx';
const viteArgs = fs.existsSync(viteBin)
  ? [viteBin, 'build']
  : ['vite', 'build'];

const result = spawnSync(viteCmd, viteArgs, {
  env,
  stdio: 'inherit',
  cwd: rendererRoot,
  shell: !fs.existsSync(viteBin),
});

process.exit(result.status ?? 1);
