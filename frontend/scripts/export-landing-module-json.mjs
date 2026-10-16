/**
 * Export dictionary landing block → data/landing/<module>.json (keys ordered like landing.en.json).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const en = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/locales/data/landing.en.json'), 'utf8'),
);
const enKeys = Object.keys(en);
const dictDir = path.join(__dirname, '../src/locales/dictionaries');
const outDir = path.join(__dirname, '../src/locales/data/landing');

function extractLanding(src) {
  const m = src.match(/landing:\s*\{([\s\S]*?)\n  \},/);
  if (!m) throw new Error('landing block not found');
  const block = m[1];
  const landing = {};
  const lines = block.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const km = lines[i].match(/^\s+([a-zA-Z0-9_]+):\s*$/);
    if (km && lines[i + 1]) {
      const nm = lines[i + 1].match(/^\s+'((?:\\'|[^'])*)',?\s*$/);
      if (nm) landing[km[1]] = nm[1].replace(/\\'/g, "'");
    }
    const single = lines[i].match(/^\s+([a-zA-Z0-9_]+):\s*'((?:\\'|[^'])*)',?\s*$/);
    if (single) landing[single[1]] = single[2].replace(/\\'/g, "'");
  }
  return landing;
}

fs.mkdirSync(outDir, { recursive: true });
const mods = process.argv.slice(2);
for (const mod of mods) {
  const src = fs.readFileSync(path.join(dictDir, `${mod}.ts`), 'utf8');
  const landing = extractLanding(src);
  const out = {};
  for (const k of enKeys) {
    if (landing[k] !== undefined) out[k] = landing[k];
  }
  fs.writeFileSync(path.join(outDir, `${mod}.json`), JSON.stringify(out, null, 2), 'utf8');
  const missing = enKeys.filter((k) => out[k] === undefined);
  console.log(mod, Object.keys(out).length, 'missing', missing.length);
}
