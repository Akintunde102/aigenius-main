/**
 * Merge dictionary partial landing + batch2-missing/*.json → data/landing/<mod>.json
 * Usage: node scripts/merge-batch2-landing.mjs sv uk ...
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dictDir = path.join(__dirname, '../src/locales/dictionaries');
const missingDir = path.join(__dirname, 'batch2-missing');
const outDir = path.join(__dirname, '../src/locales/data/landing');
const en = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/locales/data/landing.en.json'), 'utf8'),
);

function extractLanding(src) {
  const m = src.match(/landing:\s*\{([\s\S]*?)\n  \},\s*\n  modelPicker:/);
  if (!m) return {};
  const block = m[1];
  const landing = {};
  const lines = block.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const km = lines[i].match(/^\s+([a-zA-Z0-9_]+):\s*$/);
    if (km && lines[i + 1]) {
      const nm = lines[i + 1].match(/^\s+'((?:\\'|[^'])*)',?\s*$/);
      if (nm) landing[km[1]] = nm[1].replace(/\\'/g, "'");
      continue;
    }
    const single = lines[i].match(/^\s+([a-zA-Z0-9_]+):\s*'((?:\\'|[^'])*)',?\s*$/);
    if (single) landing[single[1]] = single[2].replace(/\\'/g, "'");
  }
  return landing;
}

fs.mkdirSync(outDir, { recursive: true });

for (const mod of process.argv.slice(2)) {
  const missingPath = path.join(missingDir, `${mod}.json`);
  if (!fs.existsSync(missingPath)) {
    console.warn('no missing file', mod);
    continue;
  }
  const missing = JSON.parse(fs.readFileSync(missingPath, 'utf8'));
  const partial = extractLanding(fs.readFileSync(path.join(dictDir, `${mod}.ts`), 'utf8'));
  const merged = { ...missing, ...partial };
  const keys = Object.keys(en);
  const gaps = keys.filter((k) => merged[k] === undefined);
  if (gaps.length) {
    throw new Error(`${mod} still missing ${gaps.length}: ${gaps.slice(0, 5).join(', ')}`);
  }
  const ordered = {};
  for (const k of keys) ordered[k] = merged[k];
  fs.writeFileSync(path.join(outDir, `${mod}.json`), JSON.stringify(ordered, null, 2), 'utf8');
  console.log('merged', mod, keys.length);
}
