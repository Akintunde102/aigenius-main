/**
 * Merge locales/data/landing/<module>.json into dictionaries/<module>.ts landing section.
 * Usage: node scripts/patch-landing-from-json.mjs es de fr
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dictDir = path.join(__dirname, '../src/locales/dictionaries');
const dataDir = path.join(__dirname, '../src/locales/data/landing');

function tsString(s) {
  return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function buildLandingBlock(landing, jsonStyle) {
  const header = jsonStyle ? '  "landing": {' : '  landing: {';
  const lines = [header];
  for (const [key, val] of Object.entries(landing)) {
    if (typeof val !== 'string') continue;
    if (jsonStyle) {
      lines.push(`    "${key}": ${JSON.stringify(val)},`);
    } else if (val.includes('\n')) {
      lines.push(`    ${key}:`);
      lines.push(`      ${tsString(val)},`);
    } else {
      lines.push(`    ${key}: ${tsString(val)},`);
    }
  }
  lines.push('  },');
  return lines.join('\n');
}

function replaceLandingBlock(src, newBlock) {
  const re = /  (?:"landing"|landing):\s*\{/;
  const m = src.match(re);
  if (!m) return null;
  const openIdx = m.index + m[0].length - 1;
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        let end = i + 1;
        if (src[end] === ',') end++;
        return src.slice(0, m.index) + newBlock + src.slice(end);
      }
    }
  }
  return null;
}

function patchFile(moduleKey, landing) {
  const filePath = path.join(dictDir, `${moduleKey}.ts`);
  if (!fs.existsSync(filePath)) {
    console.warn('skip missing dict', moduleKey);
    return false;
  }
  const src = fs.readFileSync(filePath, 'utf8');
  const jsonStyle = src.includes('"landing": {');
  const newBlock = buildLandingBlock(landing, jsonStyle);
  const replaced = replaceLandingBlock(src, newBlock);
  if (!replaced) {
    console.warn('landing block not replaced', moduleKey);
    return false;
  }
  fs.writeFileSync(filePath, replaced, 'utf8');
  return true;
}

const args = process.argv.slice(2);
for (const mod of args) {
  const jsonPath = path.join(dataDir, `${mod}.json`);
  if (!fs.existsSync(jsonPath)) {
    console.warn('no json', jsonPath);
    continue;
  }
  const landing = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  if (patchFile(mod, landing)) console.log('patched', mod);
}
