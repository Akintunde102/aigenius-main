/**
 * Translate landing.en.json → batch 5 modules (vi, id, th, bn, ms, fil, ta, te, mr, gu, kn).
 * Preserves placeholders and brand tokens. Merges existing non-English strings from dictionaries.
 * Usage: node scripts/generate-landing-batch5.mjs [--module vi] [--dry-run]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const enPath = path.join(__dirname, '../src/locales/data/landing.en.json');
const dictDir = path.join(__dirname, '../src/locales/dictionaries');
const outDir = path.join(__dirname, '../src/locales/data/landing');

const MODULE_TO_GOOGLE = {
  vi: 'vi',
  id: 'id',
  th: 'th',
  bn: 'bn',
  ms: 'ms',
  fil: 'tl',
  ta: 'ta',
  te: 'te',
  mr: 'mr',
  gu: 'gu',
  kn: 'kn',
};

const BATCH5 = Object.keys(MODULE_TO_GOOGLE);

const BRANDS = [
  'AIGenius',
  'Claude',
  'GPT',
  'Gemini',
  'DeepSeek',
  'OpenRouter',
  'Windows',
  'macOS',
  'Linux',
  'Gmail',
  'Excel',
  'PDF',
  'SmartScreen',
  'Microsoft',
  'USD',
  'NGN',
  'INV-4021',
  'Sam',
  'Acme',
  'SEO',
  'Nobox Labs Limited',
  'local_shell',
  'api-gateway/',
];

const PLACEHOLDER_RE = /\{[a-zA-Z0-9_]+\}/g;
const CHUNK_SEP = '\u241E'; // symbolic record separator
const CHUNK_SIZE = 8;

function extractLandingFromDict(moduleKey) {
  const filePath = path.join(dictDir, `${moduleKey}.ts`);
  if (!fs.existsSync(filePath)) return {};
  const src = fs.readFileSync(filePath, 'utf8');
  const m = src.match(/(?:"landing"|landing):\s*\{([\s\S]*?)\n  \},/);
  if (!m) return {};
  const block = m[1];
  const out = {};
  const re = /^\s+(?:"([a-zA-Z0-9_]+)"|([a-zA-Z0-9_]+)):\s*(?:'((?:\\'|[^'])*)'|"((?:\\"|[^"])*)"),?\s*$/gm;
  let match;
  while ((match = re.exec(block))) {
    const key = match[1] || match[2];
    const val = (match[3] ?? match[4] ?? '').replace(/\\'/g, "'").replace(/\\"/g, '"');
    out[key] = val;
  }
  // multiline single-quoted
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

function protectString(s) {
  const tokens = [];
  let text = s;
  const ph = [...text.matchAll(PLACEHOLDER_RE)];
  for (const m of ph) {
    const tok = `⟦PH${tokens.length}⟧`;
    tokens.push({ tok, val: m[0] });
    text = text.split(m[0]).join(tok);
  }
  for (const brand of BRANDS) {
    if (!text.includes(brand)) continue;
    const tok = `⟦BR${tokens.length}⟧`;
    tokens.push({ tok, val: brand });
    text = text.split(brand).join(tok);
  }
  return { text, tokens };
}

function restoreString(text, tokens) {
  let out = text;
  for (const { tok, val } of tokens) {
    out = out.split(tok).join(val);
  }
  return out;
}

async function googleTranslate(text, target, attempt = 0) {
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=' +
    encodeURIComponent(target) +
    '&dt=t&q=' +
    encodeURIComponent(text);
  const res = await fetch(url);
  if (res.status === 429 && attempt < 8) {
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    return googleTranslate(text, target, attempt + 1);
  }
  if (!res.ok) throw new Error(`translate HTTP ${res.status}`);
  const raw = await res.text();
  const parsed = JSON.parse(raw);
  const parts = parsed[0] || [];
  return parts.map((p) => p[0]).join('');
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function mapPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function myMemoryTranslate(text, target) {
  const pair = `en|${target}`;
  const url =
    'https://api.mymemory.translated.net/get?q=' +
    encodeURIComponent(text.slice(0, 450)) +
    '&langpair=' +
    encodeURIComponent(pair);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`mymemory HTTP ${res.status}`);
  const data = await res.json();
  const out = data?.responseData?.translatedText;
  if (!out) throw new Error('mymemory empty');
  return out;
}

async function translateProtected(text, googleLang) {
  if (myMemoryOnly) return await myMemoryTranslate(text, googleLang);
  try {
    return await googleTranslate(text, googleLang);
  } catch {
    return await myMemoryTranslate(text, googleLang);
  }
}

async function translateValue(enVal, googleLang) {
  const { text, tokens } = protectString(enVal);
  if (!text.trim()) return enVal;
  let translated = await translateProtected(text, googleLang);
  translated = restoreString(translated, tokens);
  return translated.trim();
}

async function translateChunk(pairs, googleLang) {
  const protectedList = pairs.map((p) => protectString(p.enVal));
  const joined = protectedList.map((p) => p.text).join(CHUNK_SEP);
  let raw;
  try {
    raw = await translateProtected(joined, googleLang);
  } catch (e) {
    console.warn('chunk failed, falling back per-key:', e.message);
    raw = null;
  }
  let parts = raw ? raw.split(CHUNK_SEP) : [];
  if (parts.length !== pairs.length) {
    const out = [];
    for (let i = 0; i < pairs.length; i++) {
      out.push(await translateValue(pairs[i].enVal, googleLang));
      await sleep(400);
    }
    return out;
  }
  return parts.map((part, i) => restoreString(part.trim(), protectedList[i].tokens).trim());
}

const dryRun = process.argv.includes('--dry-run');
const retryOnly = process.argv.includes('--retry-missing');
const myMemoryOnly = process.argv.includes('--mymemory-only');
const onlyMod = process.argv.find((a, i) => process.argv[i - 1] === '--module');
const concurrency = Number(
  process.argv.find((a, i) => process.argv[i - 1] === '--concurrency') ?? 3,
);

const enLanding = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const keys = Object.keys(enLanding);
fs.mkdirSync(outDir, { recursive: true });

const modules = onlyMod ? [onlyMod] : BATCH5;

for (const mod of modules) {
  const googleLang = MODULE_TO_GOOGLE[mod];
  if (!googleLang) throw new Error(`unknown module ${mod}`);
  const outPath = path.join(outDir, `${mod}.json`);
  const existing =
    retryOnly && fs.existsSync(outPath)
      ? JSON.parse(fs.readFileSync(outPath, 'utf8'))
      : {};

  const out = { ...existing };
  if (dryRun) {
    for (const key of keys) out[key] = enLanding[key];
  } else {
    const pairs = keys
      .map((key) => ({ key, enVal: enLanding[key] }))
      .filter(({ key, enVal }) => {
        if (!retryOnly) return true;
        const cur = out[key];
        return cur === undefined || cur === enVal;
      });
    console.log(`${mod}: translating ${pairs.length}/${keys.length} keys`);
    if (retryOnly && myMemoryOnly) {
      for (let i = 0; i < pairs.length; i++) {
        const { key, enVal } = pairs[i];
        try {
          out[key] = await translateValue(enVal, googleLang);
        } catch (e) {
          console.error(`${mod}.${key} failed:`, e.message);
        }
        if (i % 10 === 9) process.stdout.write(`  ${mod}: ${i + 1}/${pairs.length}\n`);
        await sleep(1500);
      }
    } else if (retryOnly) {
      for (let i = 0; i < pairs.length; i += CHUNK_SIZE) {
        const slice = pairs.slice(i, i + CHUNK_SIZE);
        const values = await translateChunk(slice, googleLang);
        for (let j = 0; j < slice.length; j++) out[slice[j].key] = values[j];
        process.stdout.write(`  ${mod}: ${Math.min(i + CHUNK_SIZE, pairs.length)}/${pairs.length}\n`);
        await sleep(900);
      }
    } else {
      const values = await mapPool(pairs, concurrency, async ({ key, enVal }) => {
        await sleep(80);
        try {
          return await translateValue(enVal, googleLang);
        } catch (e) {
          console.error(`${mod}.${key} failed:`, e.message);
          return out[key] ?? enVal;
        }
      });
      for (let i = 0; i < pairs.length; i++) out[pairs[i].key] = values[i];
    }
    for (const key of keys) {
      if (out[key] === undefined) out[key] = enLanding[key];
    }
  }
  const translated = dryRun ? 0 : keys.length;

  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
  console.log(`wrote ${outPath} (${keys.length} keys, translated ${translated})`);
}

if (!dryRun) {
  spawnSync(process.execPath, ['scripts/patch-landing-from-json.mjs', ...modules], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
}
