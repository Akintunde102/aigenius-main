/**
 * One-off scaffold for ti.ts (minimal common + English landing placeholder).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const landing = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/locales/data/landing.en.json'), 'utf8'),
);

function tsString(s) {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

const lines = [
  "import { TranslationDictionary } from '../types';",
  '',
  'export const ti: TranslationDictionary = {',
  '  common: {',
  "    cancel: 'ሰርዝ',",
  "    confirm: 'ኣረጋግጽ',",
  "    save: 'ኣቐምጥ',",
  "    delete: 'ሰርዝ',",
  "    search: 'ድለ',",
  "    back: 'ተመለስ',",
  "    close: 'ዕጸው',",
  "    loading: 'ይጽዕን...',",
  "    language: 'ቋንቋ',",
  "    appearance: 'መልክዕ',",
  "    settings: 'ቅንብራት',",
  "    credits: 'ክሬዲት',",
  "    add: 'ወስኽ',",
  "    copy: 'ቅዳሕ',",
  "    copied: 'ተቐዲሑ',",
  "    edit: 'ኣርም',",
  "    done: 'ተዛዘመ',",
  "    clear: 'ኣጽሪ',",
  "    retry: 'ደጊምካ ፈትን',",
  "    refresh: 'ኣድስ',",
  "    star: 'ኮኾብ',",
  "    unstar: 'ኮኾብ ኣልግስ',",
  "    starred: 'ኮኾብ ተወሃበ',",
  "    unstarred: 'ኮኾብ ተወገደ',",
  '  },',
  '  landing: {',
];

for (const [key, val] of Object.entries(landing)) {
  if (typeof val !== 'string') continue;
  if (val.includes('\n')) {
    lines.push(`    ${key}:`);
    lines.push(`      ${tsString(val)},`);
  } else {
    lines.push(`    ${key}: ${tsString(val)},`);
  }
}

lines.push('  },');
lines.push('  modelPicker: { title: \'Models\' },');
lines.push('};');
lines.push('');

const outPath = path.join(__dirname, '../src/locales/dictionaries/ti.ts');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log('Wrote', outPath, Object.keys(landing).length, 'landing keys');
