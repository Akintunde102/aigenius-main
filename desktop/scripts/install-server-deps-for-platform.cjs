'use strict';

/**
 * Install desktop-server production deps for a target OS/CPU into an isolated folder.
 * Used when packaging Windows (or Linux) from macOS so we don't copy darwin binaries.
 *
 * Usage: node scripts/install-server-deps-for-platform.cjs [platform] [arch]
 *   e.g. win32 x64   (default: current process.platform / process.arch)
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const desktopRoot = path.resolve(__dirname, '..');
const serverRoot = path.resolve(desktopRoot, '..', 'desktop-server');
const platform = (process.argv[2] || process.platform).trim();
const arch = (process.argv[3] || process.arch).trim();
const packRoot = path.join(serverRoot, 'pack-deps', `${platform}-${arch}`);
const nodeModulesDir = path.join(packRoot, 'node_modules');

const serverPkg = path.join(serverRoot, 'package.json');
const serverLock = path.join(serverRoot, 'package-lock.json');

if (!fs.existsSync(serverPkg)) {
  console.error('Missing desktop-server/package.json');
  process.exit(1);
}

const markers = [
  path.join(nodeModulesDir, '@hono', 'node-server'),
  path.join(nodeModulesDir, 'hono'),
  path.join(nodeModulesDir, 'better-sqlite3'),
  path.join(nodeModulesDir, 'sharp'),
  path.join(nodeModulesDir, 'onnxruntime-node'),
];

function packDepsValid() {
  return markers.every((marker) => fs.existsSync(marker));
}

if (packDepsValid()) {
  console.info(`install-server-deps: reusing existing pack-deps → ${nodeModulesDir}`);
  process.exit(0);
}

fs.rmSync(packRoot, { recursive: true, force: true });
fs.mkdirSync(packRoot, { recursive: true });
fs.copyFileSync(serverPkg, path.join(packRoot, 'package.json'));
if (fs.existsSync(serverLock)) {
  fs.copyFileSync(serverLock, path.join(packRoot, 'package-lock.json'));
}

console.info(
  `install-server-deps: npm install --omit=dev --os=${platform} --cpu=${arch} → ${packRoot}`,
);

execSync(`npm install --omit=dev --os=${platform} --cpu=${arch} --workspaces=false`, {
  cwd: packRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    npm_config_platform: platform,
    npm_config_arch: arch,
    npm_config_workspaces: 'false',
  },
});

const electronVersion = '33.2.1';
console.info(
  `install-server-deps: electron-rebuild native modules for Electron ${electronVersion} (${platform}-${arch})`,
);

execSync(
  `npx electron-rebuild -v ${electronVersion} -f -m "${packRoot}" -w better-sqlite3,sharp,onnxruntime-node --platform ${platform} --arch ${arch}`,
  { cwd: desktopRoot, stdio: 'inherit' },
);

if (!fs.existsSync(nodeModulesDir)) {
  console.error('install-server-deps: node_modules missing after install');
  process.exit(1);
}

for (const marker of markers) {
  if (!fs.existsSync(marker)) {
    console.error(`install-server-deps: expected module missing: ${marker}`);
    process.exit(1);
  }
}

console.info(`install-server-deps: OK → ${nodeModulesDir}`);
