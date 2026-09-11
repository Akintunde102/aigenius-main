'use strict';

/**
 * Single source of truth: repo-root `aigenius_icon_final.png`.
 * Copies into places Electron builder and the Next app read from so dev/desktop/web stay aligned.
 *
 * Also writes a real `.ico` (PNG-in-ICO). Copying PNG bytes to `favicon.ico` is not a valid
 * Windows icon and Chromium/Electron fall back to the default atom mark.
 */

const fs = require('fs');
const path = require('path');

const desktopRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(desktopRoot, '..');
const src = path.join(repoRoot, 'aigenius_icon_final.png');

if (!fs.existsSync(src)) {
  console.error(
    'sync-brand-icon: missing repo-root aigenius_icon_final.png (expected at ' + src + ')',
  );
  process.exit(1);
}

/** Vista+ ICO container that stores a PNG payload. Windows and electron-builder accept this. */
function pngBufferToIco(pngBuffer) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);

  const entry = Buffer.alloc(16);
  entry.writeUInt8(0, 0);
  entry.writeUInt8(0, 1);
  entry.writeUInt8(0, 2);
  entry.writeUInt8(0, 3);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(pngBuffer.length, 8);
  entry.writeUInt32LE(22, 12);
  return Buffer.concat([header, entry, pngBuffer]);
}

const png = fs.readFileSync(src);
const ico = pngBufferToIco(png);

const pngTargets = [
  path.join(desktopRoot, 'build', 'aigenius_icon_final.png'),
  path.join(repoRoot, 'frontend', 'public', 'logo.png'),
];
const icoTargets = [
  path.join(desktopRoot, 'build', 'icon.ico'),
  path.join(repoRoot, 'frontend', 'public', 'favicon.ico'),
];

for (const dest of pngTargets) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}
for (const dest of icoTargets) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, ico);
}

console.info(
  'sync-brand-icon: copied aigenius_icon_final.png → desktop/build + frontend/public/logo.png; wrote icon.ico + favicon.ico',
);
