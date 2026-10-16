/**
 * Generate scripts/batch2-missing/<mod>.json (201 keys) from landing.en.json
 * using reference locale files + per-module overrides.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const en = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/locales/data/landing.en.json'), 'utf8'),
);
const landingDir = path.join(__dirname, '../src/locales/data/landing');
const dictDir = path.join(__dirname, '../src/locales/dictionaries');
const outDir = path.join(__dirname, 'batch2-missing');

/** @type {Record<string, { ref: string, overrides?: Record<string, string> }>} */
const PLAN = {
  sv: { ref: 'nl' },
  da: { ref: 'nl' },
  no: { ref: 'nl' },
  fi: { ref: 'de' },
  el: { ref: 'en' },
  hu: { ref: 'de' },
  cs: { ref: 'pl' },
  ro: { ref: 'it' },
  uk: { ref: 'ru' },
};

function extractLanding(src) {
  const m = src.match(/landing:\s*\{([\s\S]*?)\n  \},\s*\n  modelPicker:/);
  if (!m) return {};
  const block = m[1];
  const landing = {};
  for (const line of block.split('\n')) {
    const km = line.match(/^\s+([a-zA-Z0-9_]+):\s*$/);
    if (km) continue;
    const single = line.match(/^\s+([a-zA-Z0-9_]+):\s*'((?:\\'|[^'])*)',?\s*$/);
    if (single) landing[single[1]] = single[2].replace(/\\'/g, "'");
  }
  return landing;
}

function dictPartial(mod) {
  return extractLanding(fs.readFileSync(path.join(dictDir, `${mod}.ts`), 'utf8'));
}

fs.mkdirSync(outDir, { recursive: true });

for (const [mod, { ref, overrides = {} }] of Object.entries(PLAN)) {
  const refPath = path.join(landingDir, `${ref}.json`);
  const refLanding = JSON.parse(fs.readFileSync(refPath, 'utf8'));
  const partial = dictPartial(mod);
  const missingKeys = Object.keys(en).filter((k) => !partial[k]);
  const out = {};
  for (const k of missingKeys) {
    out[k] = overrides[k] ?? refLanding[k] ?? en[k];
  }
  fs.writeFileSync(path.join(outDir, `${mod}.json`), JSON.stringify(out, null, 2), 'utf8');
  console.log(mod, 'missing', missingKeys.length, 'ref', ref);
}
