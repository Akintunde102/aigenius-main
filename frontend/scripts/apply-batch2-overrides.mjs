/**
 * Apply scripts/batch2-overrides/<mod>.json (full 227 keys) → data/landing/<mod>.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const en = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/locales/data/landing.en.json'), 'utf8'),
);
const overridesDir = path.join(__dirname, 'batch2-overrides');
const outDir = path.join(__dirname, '../src/locales/data/landing');

fs.mkdirSync(outDir, { recursive: true });

for (const mod of process.argv.slice(2)) {
  const p = path.join(overridesDir, `${mod}.json`);
  const landing = JSON.parse(fs.readFileSync(p, 'utf8'));
  const keys = Object.keys(en);
  const missing = keys.filter((k) => landing[k] === undefined);
  if (missing.length) throw new Error(`${mod} missing ${missing.length} keys`);
  const ordered = {};
  for (const k of keys) ordered[k] = landing[k];
  fs.writeFileSync(path.join(outDir, `${mod}.json`), JSON.stringify(ordered, null, 2), 'utf8');
  console.log('applied', mod);
}
