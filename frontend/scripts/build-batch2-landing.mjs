/**
 * Build batch-2 landing JSON from per-locale modules in scripts/batch2-landing/.
 * Run: node scripts/build-batch2-landing.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'batch2-landing');
const outDir = path.join(__dirname, '../src/locales/data/landing');
const en = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/locales/data/landing.en.json'), 'utf8'),
);

const mods = ['sv', 'uk', 'el', 'cs', 'da', 'fi', 'no', 'ro', 'hu'];
fs.mkdirSync(outDir, { recursive: true });

for (const mod of mods) {
  const p = path.join(srcDir, `${mod}.mjs`);
  if (!fs.existsSync(p)) {
    console.warn('missing', p);
    continue;
  }
  const { landing } = await import(pathToFileURL(p).href);
  const keys = Object.keys(en);
  const missing = keys.filter((k) => landing[k] === undefined);
  const extra = Object.keys(landing).filter((k) => en[k] === undefined);
  if (missing.length || extra.length) {
    throw new Error(`${mod}: missing ${missing.length}, extra ${extra.length}`);
  }
  const outPath = path.join(outDir, `${mod}.json`);
  const ordered = {};
  for (const k of keys) ordered[k] = landing[k];
  fs.writeFileSync(outPath, JSON.stringify(ordered, null, 2), 'utf8');
  console.log('wrote', mod, keys.length);
}

function pathToFileURL(p) {
  const resolved = path.resolve(p);
  return new URL(`file:///${resolved.replace(/\\/g, '/')}`);
}
