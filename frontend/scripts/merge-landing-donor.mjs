/**
 * Fill target landing JSON missing translations from a donor locale (same keys, value !== English).
 * Usage: node scripts/merge-landing-donor.mjs ms id
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '../src/locales/data/landing');
const en = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/locales/data/landing.en.json'), 'utf8'),
);

const [targetMod, donorMod] = process.argv.slice(2);
if (!targetMod || !donorMod) throw new Error('Usage: merge-landing-donor.mjs <target> <donor>');

const targetPath = path.join(dataDir, `${targetMod}.json`);
const donorPath = path.join(dataDir, `${donorMod}.json`);
const target = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
const donor = JSON.parse(fs.readFileSync(donorPath, 'utf8'));

let filled = 0;
for (const key of Object.keys(en)) {
  const enVal = en[key];
  if (target[key] !== enVal) continue;
  const d = donor[key];
  if (d && d !== enVal) {
    target[key] = d;
    filled++;
  }
}

fs.writeFileSync(targetPath, JSON.stringify(target, null, 2), 'utf8');
console.log('filled', filled, 'keys in', targetMod, 'from', donorMod);
