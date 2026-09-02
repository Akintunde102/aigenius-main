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

function sharpPlatformPackageName(targetPlatform, targetArch) {
  if (targetPlatform === 'darwin') {
    return targetArch === 'arm64' ? 'sharp-darwin-arm64' : 'sharp-darwin-x64';
  }
  if (targetPlatform === 'win32') {
    return targetArch === 'arm64' ? 'sharp-win32-arm64' : 'sharp-win32-x64';
  }
  if (targetPlatform === 'linux') {
    return targetArch === 'arm64' ? 'sharp-linux-arm64' : 'sharp-linux-x64';
  }
  return null;
}

const sharpPkg = sharpPlatformPackageName(platform, arch);
const readyStamp = path.join(packRoot, '.pack-deps-ready');
const markers = [
  path.join(nodeModulesDir, '@hono', 'node-server'),
  path.join(nodeModulesDir, 'hono'),
  path.join(nodeModulesDir, 'better-sqlite3'),
  path.join(nodeModulesDir, 'sharp'),
  path.join(nodeModulesDir, 'onnxruntime-node'),
  path.join(nodeModulesDir, 'ppu-paddle-ocr'),
  path.join(nodeModulesDir, 'ts-morph'),
  path.join(nodeModulesDir, 'web-tree-sitter'),
  path.join(nodeModulesDir, '@vscode', 'ripgrep'),
  ...(sharpPkg ? [path.join(nodeModulesDir, '@img', sharpPkg)] : []),
];

function packDepsValid() {
  return fs.existsSync(readyStamp) && markers.every((marker) => fs.existsSync(marker));
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

execSync(
  `npm install --omit=dev --include=optional --os=${platform} --cpu=${arch} --workspaces=false`,
  {
    cwd: packRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      npm_config_platform: platform,
      npm_config_arch: arch,
      npm_config_workspaces: 'false',
    },
  },
);

// electron-rebuild removed because modern native deps (better-sqlite3, onnxruntime) use N-API
// and provide cross-platform prebuilds that are ABI stable without recompilation.

if (sharpPkg) {
  const sharpPlatformDir = path.join(nodeModulesDir, '@img', sharpPkg);
  if (!fs.existsSync(sharpPlatformDir)) {
    const sharpPkgJson = path.join(nodeModulesDir, 'sharp', 'package.json');
    const sharpVersion = fs.existsSync(sharpPkgJson)
      ? JSON.parse(fs.readFileSync(sharpPkgJson, 'utf8')).version
      : null;
    if (!sharpVersion) {
      console.error('install-server-deps: sharp is installed but package.json is missing');
      process.exit(1);
    }
    console.info(`install-server-deps: installing @img/${sharpPkg}@${sharpVersion}`);
    execSync(`npm install @img/${sharpPkg}@${sharpVersion} --os=${platform} --cpu=${arch} --force`, {
      cwd: packRoot,
      stdio: 'inherit',
      env: {
        ...process.env,
        npm_config_platform: platform,
        npm_config_arch: arch,
        npm_config_workspaces: 'false',
      },
    });
  }
}

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

fs.writeFileSync(
  readyStamp,
  JSON.stringify({ platform, arch, electronVersion: 'native-prebuilds', builtAt: new Date().toISOString() }, null, 2),
);

console.info(`install-server-deps: OK → ${nodeModulesDir}`);
