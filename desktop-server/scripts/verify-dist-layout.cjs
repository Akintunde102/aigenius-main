'use strict';

/**
 * Ensures `npm run build` produced everything Electron / spawn(`node index.js`) needs,
 * including PocketTTS / voice sidecar under ``dist/python/`` — not only ``dist/index.js``.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const required = [
  path.join(root, 'dist', 'index.js'),
  path.join(root, 'dist', 'python', 'voice_sidecar.py'),
  path.join(root, 'dist', 'python', 'voice_sidecar_lib', '__init__.py'),
  path.join(root, 'dist', 'sidecar', 'index.js'),
  path.join(root, 'dist', 'search', 'schema.sql'),
];

let ok = true;
for (const f of required) {
  if (!fs.existsSync(f)) {
    console.error('Missing:', f);
    ok = false;
  }
}

if (!ok) {
  process.exit(1);
}
console.info('verify-dist-layout: OK');
