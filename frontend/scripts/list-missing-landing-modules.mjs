import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const batches = JSON.parse(fs.readFileSync(path.join(__dirname, 'landing-translation-batches.json'), 'utf8'));
const loadersSrc = fs.readFileSync(path.join(__dirname, '../src/locales/dictionary-module-loaders.ts'), 'utf8');

function moduleKeyForCode(code) {
  if (code === 'en' || code.startsWith('en-')) return null;
  const n = code.toLowerCase();
  const alias = loadersSrc.match(new RegExp(`'${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}': '([^']+)'`));
  if (alias) return alias[1] === 'en' ? null : alias[1];
  if (loadersSrc.includes(`'${n}':`)) return n;
  const base = n.split('-')[0];
  if (loadersSrc.includes(`'${base}':`)) return base;
  return null;
}

const all = batches.flat();
const missing = all.filter((c) => !moduleKeyForCode(c) && c !== 'en' && !c.startsWith('en-'));
console.log('missing modules for:', missing);
