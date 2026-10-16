/**
 * Reports homepage (landing.*) strings still identical to English per catalog language.
 * Run: node scripts/audit-landing-coverage.mjs
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.join(__dirname, '..');
const localesRoot = path.join(frontendRoot, 'src/locales');

// Dynamic import TS dictionaries via transpile is heavy; parse en.ts landing block keys from source.
function extractLandingKeysFromEn() {
  const enSrc = fs.readFileSync(path.join(localesRoot, 'dictionaries/en.ts'), 'utf8');
  const landingMatch = enSrc.match(/landing:\s*\{([\s\S]*?)\n  \},\s*\n  modelPicker:/);
  if (!landingMatch) throw new Error('Could not parse landing block from en.ts');
  const block = landingMatch[1];
  const keys = [];
  const re = /^\s+([a-zA-Z0-9_]+):/gm;
  let m;
  while ((m = re.exec(block))) keys.push(m[1]);
  return keys;
}

function extractLandingStringsFromFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const src = fs.readFileSync(filePath, 'utf8');
  const landingMatch = src.match(/(?:"landing"|landing):\s*\{([\s\S]*?)\n  \},/);
  if (!landingMatch) return {};
  const block = landingMatch[1];
  const out = {};
  const re =
    /^\s+(?:"([a-zA-Z0-9_]+)"|([a-zA-Z0-9_]+)):\s*(?:'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)"),?\s*$/gm;
  let m;
  while ((m = re.exec(block))) {
    const key = m[1] || m[2];
    const val = (m[3] ?? m[4] ?? '').replace(/\\'/g, "'").replace(/\\"/g, '"');
    out[key] = val;
  }
  const lines = block.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const km = lines[i].match(/^\s+(?:"([a-zA-Z0-9_]+)"|([a-zA-Z0-9_]+)):\s*$/);
    if (km && lines[i + 1]) {
      const nm = lines[i + 1].match(/^\s+'((?:\\'|[^'])*)',?\s*$/);
      if (nm) out[km[1] || km[2]] = nm[1].replace(/\\'/g, "'");
    }
  }
  return out;
}

function catalogCodes() {
  const cat = fs.readFileSync(path.join(localesRoot, 'catalog.ts'), 'utf8');
  return [...cat.matchAll(/"code": "([^"]+)"/g)].map((m) => m[1]);
}

function moduleFileForCode(code) {
  const loaders = fs.readFileSync(path.join(localesRoot, 'dictionary-module-loaders.ts'), 'utf8');
  const normalized = code.toLowerCase();
  const aliasMatch = loaders.match(new RegExp(`'${normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}': '([^']+)'`));
  if (aliasMatch) return aliasMatch[1] === 'en' ? null : aliasMatch[1];
  if (loaders.includes(`'${normalized}':`)) return normalized;
  const base = normalized.split('-')[0];
  if (loaders.includes(`'${base}':`)) return base;
  return null;
}

const landingKeys = extractLandingKeysFromEn();
const codes = catalogCodes();
const enPath = path.join(localesRoot, 'dictionaries/en.ts');
const enLanding = extractLandingStringsFromFile(enPath);

const summary = [];
for (const code of codes) {
  if (code === 'en' || code.startsWith('en-')) {
    summary.push({ code, module: 'en', untranslated: 0, missingFile: false });
    continue;
  }
  const mod = moduleFileForCode(code);
  if (!mod) {
    summary.push({ code, module: null, untranslated: landingKeys.length, missingFile: true });
    continue;
  }
  const dictPath = path.join(localesRoot, 'dictionaries', `${mod}.ts`);
  const landing = extractLandingStringsFromFile(dictPath) || {};
  let untranslated = 0;
  for (const key of landingKeys) {
    const enVal = enLanding[key];
    const locVal = landing[key];
    if (!locVal || locVal === enVal) untranslated++;
  }
  summary.push({ code, module: mod, untranslated, missingFile: false });
}

const needsWork = summary.filter((s) => s.untranslated > 0);
console.log(JSON.stringify({ landingKeyCount: landingKeys.length, catalogCount: codes.length, needsWorkCount: needsWork.length, needsWork }, null, 2));
