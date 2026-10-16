/**
 * Extract landing block from dictionary TS → locales/data/landing/<mod>.json
 * Usage: node scripts/extract-landing-to-json.mjs id th vi ...
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dictDir = path.join(__dirname, '../src/locales/dictionaries');
const outDir = path.join(__dirname, '../src/locales/data/landing');

function extractLanding(src) {
  const m = src.match(/(?:"landing"|landing):\s*\{([\s\S]*?)\n  \},/);
  if (!m) return null;
  const block = m[1];
  const out = {};
  const lines = block.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const single = lines[i].match(
      /^\s+(?:"([a-zA-Z0-9_]+)"|([a-zA-Z0-9_]+)):\s*'((?:\\'|[^'])*)',?\s*$/,
    );
    if (single) {
      const key = single[1] || single[2];
      out[key] = single[3].replace(/\\'/g, "'");
      continue;
    }
    const dbl = lines[i].match(
      /^\s+(?:"([a-zA-Z0-9_]+)"|([a-zA-Z0-9_]+)):\s*"((?:\\"|[^"])*)",?\s*$/,
    );
    if (dbl) {
      const key = dbl[1] || dbl[2];
      out[key] = dbl[3].replace(/\\"/g, '"');
      continue;
    }
    const multilineKey = lines[i].match(/^\s+(?:"([a-zA-Z0-9_]+)"|([a-zA-Z0-9_]+)):\s*$/);
    if (multilineKey && lines[i + 1]) {
      const nm = lines[i + 1].match(/^\s+'((?:\\'|[^'])*)',?\s*$/);
      if (nm) {
        out[multilineKey[1] || multilineKey[2]] = nm[1].replace(/\\'/g, "'");
        i++;
      }
    }
  }
  return out;
}

const mods = process.argv.slice(2);
if (!mods.length) throw new Error('Pass module keys');
fs.mkdirSync(outDir, { recursive: true });

for (const mod of mods) {
  const fp = path.join(dictDir, `${mod}.ts`);
  const src = fs.readFileSync(fp, 'utf8');
  const landing = extractLanding(src);
  if (!landing) {
    console.warn('no landing', mod);
    continue;
  }
  const outPath = path.join(outDir, `${mod}.json`);
  fs.writeFileSync(outPath, JSON.stringify(landing, null, 2), 'utf8');
  console.log('wrote', outPath, Object.keys(landing).length, 'keys');
}
