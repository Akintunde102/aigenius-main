/**
 * Extract canonical homepage (landing) strings from en.ts → locales/data/landing.en.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const enPath = path.join(__dirname, '../src/locales/dictionaries/en.ts');
const outDir = path.join(__dirname, '../src/locales/data');
const outPath = path.join(outDir, 'landing.en.json');

const src = fs.readFileSync(enPath, 'utf8');
const m = src.match(/landing:\s*\{([\s\S]*?)\n  \},\s*\n  modelPicker:/);
if (!m) throw new Error('landing block not found');
const block = m[1];

const landing = {};
const keyRe = /^\s+([a-zA-Z0-9_]+):\s*(?:'((?:\\'|[^'])*)'|([\s\S]*?)(?=,\n\s+[a-zA-Z]|,\n\s*\n\s+[a-zA-Z]|\n\s*\}))/gm;
let match;
while ((match = keyRe.exec(block))) {
  const key = match[1];
  if (match[2] !== undefined) {
    landing[key] = match[2].replace(/\\'/g, "'");
  } else {
    const chunk = match[3].trim();
    const sm = chunk.match(/^'((?:\\'|[^'])*)'/);
    if (sm) landing[key] = sm[1].replace(/\\'/g, "'");
  }
}

// Fallback line-by-line for multiline values
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

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(landing, null, 2), 'utf8');
console.log('Wrote', outPath, Object.keys(landing).length, 'keys');
