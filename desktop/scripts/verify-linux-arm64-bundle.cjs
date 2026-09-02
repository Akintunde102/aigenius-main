'use strict';

/**
 * Sanity-check a packaged linux-arm64-unpacked folder before copying to a VM.
 *
 * Usage:
 *   node scripts/verify-linux-arm64-bundle.cjs [path-to-linux-arm64-unpacked]
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const bundleRoot = path.resolve(
  process.argv[2] || path.join(__dirname, '..', 'release', 'linux-arm64-unpacked'),
);
const serverMods = path.join(bundleRoot, 'resources', 'desktop-server', 'node_modules');
const imgDir = path.join(serverMods, '@img');

function fail(message) {
  console.error(`verify-linux-arm64-bundle: FAIL — ${message}`);
  process.exit(1);
}

if (!fs.existsSync(bundleRoot)) {
  fail(`bundle not found: ${bundleRoot}`);
}

const required = [
  path.join(imgDir, 'sharp-linux-arm64'),
  path.join(imgDir, 'sharp-libvips-linux-arm64'),
  path.join(serverMods, 'sharp'),
  path.join(serverMods, '@vscode', 'ripgrep'),
  path.join(bundleRoot, 'resources', 'desktop-server', 'index.js'),
];

for (const entry of required) {
  if (!fs.existsSync(entry)) {
    fail(`missing ${entry}`);
  }
}

const wrongSharp = fs
  .readdirSync(imgDir)
  .filter((name) => name.startsWith('sharp-') && !name.includes('linux-arm64') && !name.includes('linuxmusl-arm64'));

if (wrongSharp.length > 0) {
  fail(`wrong-platform sharp packages present: ${wrongSharp.join(', ')}`);
}

const sharpNode = path.join(imgDir, 'sharp-linux-arm64', 'lib', 'sharp-linux-arm64.node');
if (fs.existsSync(sharpNode)) {
  try {
    const fileType = execSync(`file "${sharpNode}"`, { encoding: 'utf8' }).trim();
    if (!/ARM aarch64|aarch64/i.test(fileType)) {
      fail(`sharp native binary is not arm64: ${fileType}`);
    }
    console.log(`verify-linux-arm64-bundle: sharp binary OK (${fileType})`);
  } catch {
    console.warn('verify-linux-arm64-bundle: could not run `file` command; skipped binary check');
  }
}

console.log(`verify-linux-arm64-bundle: OK — ${bundleRoot}`);
