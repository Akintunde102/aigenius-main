/**
 * Extract landing block from a dictionary module → data/landing/<mod>.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mod = process.argv[2];
if (!mod) throw new Error('Usage: node scripts/extract-landing-module.mjs <mod>');

const src = fs.readFileSync(path.join(__dirname, `../src/locales/dictionaries/${mod}.ts`), 'utf8');
const m = src.match(/landing:\s*\{([\s\S]*?)\n  \},\s*\n  modelPicker:/);
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

const outDir = path.join(__dirname, '../src/locales/data/landing');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${mod}.json`);
fs.writeFileSync(outPath, JSON.stringify(landing, null, 2), 'utf8');
console.log('wrote', outPath, Object.keys(landing).length, 'keys');
