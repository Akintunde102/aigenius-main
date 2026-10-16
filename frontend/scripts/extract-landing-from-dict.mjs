/**
 * Extract landing block from a dictionary .ts file to JSON (same keys as landing.en.json).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mod = process.argv[2];
if (!mod) throw new Error('Usage: node extract-landing-from-dict.mjs <module>');

const en = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/locales/data/landing.en.json'), 'utf8'),
);
const src = fs.readFileSync(path.join(__dirname, `../src/locales/dictionaries/${mod}.ts`), 'utf8');
const m = src.match(/  (?:"landing"|landing):\s*\{([\s\S]*?)\n  \},/);
if (!m) throw new Error('no landing block');

const block = m[1];
const out = {};
const re = /^\s{4}(?:"?)([a-zA-Z0-9_]+)(?:"?):\s*(?:'((?:\\'|[^'])*)'|"([^"]*)")/gm;
let match;
while ((match = re.exec(block))) {
  const key = match[1];
  const val = (match[2] || match[3] || '').replace(/\\'/g, "'");
  out[key] = val;
}

// multiline
const multiRe = /^\s{4}(?:"?)([a-zA-Z0-9_]+)(?:"?):\s*\n\s*'((?:\\'|[^'])*)'/gm;
while ((match = multiRe.exec(block))) {
  out[match[1]] = match[2].replace(/\\'/g, "'");
}

const ordered = {};
for (const k of Object.keys(en)) {
  if (out[k] !== undefined) ordered[k] = out[k];
}
console.log(JSON.stringify(ordered, null, 2));
