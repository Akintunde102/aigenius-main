'use strict';

/**
 * Post-prune sanity check for pack-deps node_modules before copying into the installer.
 *
 * Usage:
 *   node scripts/verify-pack-deps.cjs [platform] [arch]
 */
const fs = require('fs');
const path = require('path');

const desktopRoot = path.resolve(__dirname, '..');
const serverRoot = path.resolve(desktopRoot, '..', 'desktop-server');

const platform = (process.env.AIGENIUS_PACKAGE_PLATFORM || process.argv[2] || process.platform).trim();
const arch = (process.env.AIGENIUS_PACKAGE_ARCH || process.argv[3] || process.arch).trim();
const packRoot = path.join(serverRoot, 'pack-deps', `${platform}-${arch}`);
const nodeModulesDir = path.join(packRoot, 'node_modules');

function fail(message) {
  console.error(`[verify-pack-deps] FAIL — ${message}`);
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

function expectedRipgrepBinDir(targetPlatform, targetArch) {
  if (targetPlatform === 'darwin') {
    return targetArch === 'arm64' ? 'darwin-arm64' : 'darwin-x64';
  }
  if (targetPlatform === 'win32') {
    return targetArch === 'arm64' ? 'win32-arm64' : 'win32-x64';
  }
  if (targetPlatform === 'linux') {
    return targetArch === 'arm64' ? 'linux-arm64' : 'linux-x64';
  }
  return null;
}

if (!fs.existsSync(nodeModulesDir)) {
  fail(`missing node_modules at ${nodeModulesDir}`);
}

const required = [
  path.join(nodeModulesDir, '@hono', 'node-server'),
  path.join(nodeModulesDir, 'hono'),
  path.join(nodeModulesDir, 'better-sqlite3'),
  path.join(nodeModulesDir, 'sharp'),
  path.join(nodeModulesDir, 'onnxruntime-node'),
  path.join(nodeModulesDir, 'ppu-paddle-ocr'),
  path.join(nodeModulesDir, 'ts-morph'),
  path.join(nodeModulesDir, '@vscode', 'ripgrep'),
];

const sharpPkg = sharpPlatformPackageName(platform, arch);
if (sharpPkg) {
  required.push(path.join(nodeModulesDir, '@img', sharpPkg));
}

for (const entry of required) {
  if (!fs.existsSync(entry)) {
    fail(`missing required module path: ${entry}`);
  }
}

const forbiddenPrefixes = ['tree-sitter'];
for (const entry of fs.readdirSync(nodeModulesDir)) {
  if (forbiddenPrefixes.some((prefix) => entry === prefix || entry.startsWith(`${prefix}-`))) {
    fail(`forbidden package still present: ${entry}`);
  }
}

const rgBinRoot = path.join(nodeModulesDir, '@vscode', 'ripgrep', 'bin');
const keepRgDir = expectedRipgrepBinDir(platform, arch);
if (keepRgDir && fs.existsSync(rgBinRoot)) {
  const rgBinary = path.join(rgBinRoot, keepRgDir, platform === 'win32' ? 'rg.exe' : 'rg');
  if (!fs.existsSync(rgBinary)) {
    fail(`missing ripgrep binary for ${platform}-${arch}: ${rgBinary}`);
  }

  for (const entry of fs.readdirSync(rgBinRoot)) {
    const fullPath = path.join(rgBinRoot, entry);
    if (!fs.statSync(fullPath).isDirectory()) {
      continue;
    }
    if (entry !== keepRgDir) {
      fail(`wrong-platform ripgrep dir still present: ${entry}`);
    }
  }
}

function expectedOnnxBindingPath(targetPlatform, targetArch) {
  const napiRoot = path.join(nodeModulesDir, 'onnxruntime-node', 'bin');
  if (!fs.existsSync(napiRoot)) {
    return null;
  }

  const napiDirs = fs.readdirSync(napiRoot).filter((entry) => entry.startsWith('napi-'));
  for (const napiDir of napiDirs) {
    const osDir =
      targetPlatform === 'darwin' ? 'darwin' : targetPlatform === 'win32' ? 'win32' : 'linux';
    const binding = path.join(napiRoot, napiDir, osDir, targetArch, 'onnxruntime_binding.node');
    if (fs.existsSync(binding)) {
      return binding;
    }
  }

  return null;
}

const onnxBinding = expectedOnnxBindingPath(platform, arch);
if (!onnxBinding) {
  fail(`missing onnxruntime binding for ${platform}-${arch}`);
}

console.log(`[verify-pack-deps] OK — ${platform}-${arch} at ${nodeModulesDir}`);
