'use strict';

/**
 * Single source of truth: repo-root `aigenius_icon_final.png`.
 * Copies into places Electron builder and the Next app read from so dev/desktop/web stay aligned.
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

const targets = [
  path.join(desktopRoot, 'build', 'aigenius_icon_final.png'),
  path.join(repoRoot, 'frontend', 'public', 'logo.png'),
  /** Browsers request `/favicon.ico` by default; without it they often keep a stale or generic tab icon. */
  path.join(repoRoot, 'frontend', 'public', 'favicon.ico'),
];

for (const dest of targets) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

console.info(
  'sync-brand-icon: copied aigenius_icon_final.png → desktop/build, frontend/public/logo.png, frontend/public/favicon.ico',
);
