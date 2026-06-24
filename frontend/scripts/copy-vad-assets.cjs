/**
 * Copies @ricky0123/vad-web + onnxruntime-web dist assets into public/vad for same-origin loading.
 * Resolves packages from frontend/node_modules and monorepo root (Yarn hoisting).
 * @see https://docs.vad.ricky0123.com/user-guide/browser/
 */
/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const outDir = path.join(root, 'public', 'vad');
const ortOut = path.join(outDir, 'ort');

/** Module search roots: workspace package dir, then repo root (hoisted). */
function moduleRoots() {
  const roots = [path.join(root, 'node_modules'), path.join(root, '..', 'node_modules')];
  return [...new Set(roots)];
}

function copyFile(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn('[copy-vad-assets] missing (skip):', path.relative(root, src));
    return false;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

function findVadDist() {
  for (const nm of moduleRoots()) {
    const p = path.join(nm, '@ricky0123', 'vad-web', 'dist');
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function findOrtDist(vadDist) {
  for (const nm of moduleRoots()) {
    const p = path.join(nm, 'onnxruntime-web', 'dist');
    if (fs.existsSync(p)) return p;
  }
  if (vadDist) {
    const nested = path.join(path.dirname(vadDist), 'node_modules', 'onnxruntime-web', 'dist');
    if (fs.existsSync(nested)) return nested;
  }
  return null;
}

function main() {
  const vadDist = findVadDist();
  if (!vadDist) {
    console.warn('[copy-vad-assets] @ricky0123/vad-web not installed — skip.');
    process.exit(0);
  }

  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(ortOut, { recursive: true });

  const vadFiles = ['vad.worklet.bundle.min.js', 'silero_vad_legacy.onnx', 'silero_vad_v5.onnx'];
  for (const f of vadFiles) {
    copyFile(path.join(vadDist, f), path.join(outDir, f));
  }

  const ortDist = findOrtDist(vadDist);
  if (!ortDist) {
    console.warn('[copy-vad-assets] onnxruntime-web dist missing — skip ORT assets.');
    process.exit(0);
  }

  for (const f of fs.readdirSync(ortDist)) {
    if (f.endsWith('.wasm') || f.endsWith('.mjs')) {
      copyFile(path.join(ortDist, f), path.join(ortOut, f));
    }
  }

  console.log('[copy-vad-assets] copied VAD + ORT assets to public/vad (from', path.relative(root, vadDist), ')');
}

main();
