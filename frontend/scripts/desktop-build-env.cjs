/**
 * Desktop production build: mini-server on 127.0.0.1:8001, optional hosted upstream for CSP + direct API.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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
const env = {
  ...process.env,
  NEXT_PUBLIC_NOBOX_API_ROOT_URL: 'http://127.0.0.1:8001',
  NEXT_PUBLIC_MINI_SERVER_PORT: '8001',
};

if (upstream) {
  env.NEXT_PUBLIC_DESKTOP_UPSTREAM_API_URL = upstream;
} else {
  console.warn(
    '[build:desktop] No AIGENIUS_UPSTREAM_API_URL in desktop/package.env — '
      + 'gateway calls may 502 unless you set it before packaging.',
  );
}

const result = spawnSync('next', ['build'], {
  env,
  stdio: 'inherit',
  shell: true,
  cwd: path.join(__dirname, '..'),
});

process.exit(result.status ?? 1);
