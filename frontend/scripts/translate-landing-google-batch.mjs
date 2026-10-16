/**
 * Translate landing.en.json via Google Translate (gtx) for locales without OpenRouter.
 * Usage: node scripts/translate-landing-google-batch.mjs --batch 6
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const batches = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'landing-translation-batches.json'), 'utf8'),
);

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
  'Llama',
  'Ollama',
  'api-gateway/',
  'local_shell',
];

const batchIdx = Number(process.argv.find((a, i) => process.argv[i - 1] === '--batch') ?? -1);
const onlyMods = process.argv.includes('--only')
  ? process.argv[process.argv.indexOf('--only') + 1]?.split(',').filter(Boolean)
  : null;
if (batchIdx < 0 || batchIdx >= batches.length) {
  throw new Error(`Provide --batch 0..${batches.length - 1}`);
}

const BATCH_SEP = '⟦⟦SEP⟧⟧';
const CHUNK_SIZE = 12;

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

const enPath = path.join(__dirname, '../src/locales/data/landing.en.json');
const enLanding = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const outDir = path.join(__dirname, '../src/locales/data/landing');
fs.mkdirSync(outDir, { recursive: true });

const codes = batches[batchIdx];
const modules = new Map();
for (const code of codes) {
  const mod = moduleKeyForCode(code);
  if (!mod) continue;
  if (!modules.has(mod)) modules.set(mod, code);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function protectString(s) {
  const tokens = [];
  let out = s;
  const patterns = [
    /\{[a-zA-Z0-9_]+\}/g,
    ...BRANDS.map((b) => new RegExp(b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')),
  ];
  for (const re of patterns) {
    out = out.replace(re, (m) => {
      const id = `⟦T${tokens.length}⟧`;
      tokens.push({ id, value: m });
      return id;
    });
  }
  return { out, tokens };
}

function restoreString(s, tokens) {
  let out = s;
  for (const { id, value } of tokens) {
    out = out.split(id).join(value);
  }
  return out;
}

function googleLangCode(code) {
  if (code === 'kok') return 'gom';
  return code;
}

async function translateGoogle(out, targetLang) {
  const url =
    'https://translate.google.com/translate_a/single?client=at&dt=t&sl=en&tl=' +
    encodeURIComponent(googleLangCode(targetLang)) +
    '&q=' +
    encodeURIComponent(out);
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (res.status === 429) {
      await sleep(4000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`google ${targetLang} ${res.status}`);
    const data = await res.json();
    return data[0].map((row) => row[0]).join('');
  }
  return null;
}

async function translateMyMemory(out, targetLang) {
  const pair = `en|${targetLang === 'kok' ? 'hi' : targetLang}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(out)}&langpair=${pair}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url);
    if (!res.ok) {
      await sleep(2000);
      continue;
    }
    const data = await res.json();
    if (data.responseStatus === 429) {
      await sleep(5000 * (attempt + 1));
      continue;
    }
    const t = data.responseData?.translatedText;
    if (t) return t;
    await sleep(1500);
  }
  return null;
}

async function translateText(text, targetLang) {
  if (!text.trim()) return text;
  const { out, tokens } = protectString(text);
  let translated = await translateMyMemory(out, targetLang);
  if (!translated) translated = await translateGoogle(out, targetLang);
  if (!translated) throw new Error(`translate failed ${targetLang}`);
  return restoreString(translated, tokens);
}

async function translateModule(mod, googleLang) {
  const outPath = path.join(outDir, `${mod}.json`);
  if (fs.existsSync(outPath)) {
    const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    if (Object.keys(existing).length === Object.keys(enLanding).length) {
      console.log('skip complete', mod);
      return;
    }
  }
  const result = {};
  const keys = Object.keys(enLanding);
  console.log('translating', mod, googleLang, keys.length, 'keys');
  for (let i = 0; i < keys.length; i += CHUNK_SIZE) {
    const chunkKeys = keys.slice(i, i + CHUNK_SIZE);
    const combined = chunkKeys.map((k) => enLanding[k]).join(BATCH_SEP);
    const translated = await translateText(combined, googleLang);
    const parts = translated.split(BATCH_SEP);
    if (parts.length !== chunkKeys.length) {
      for (const key of chunkKeys) {
        result[key] = await translateText(enLanding[key], googleLang);
        await sleep(800);
      }
    } else {
      chunkKeys.forEach((key, idx) => {
        result[key] = parts[idx];
      });
    }
    await sleep(400);
  }
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
  console.log('wrote', outPath);
}

for (const [mod, code] of modules) {
  if (onlyMods && !onlyMods.includes(mod)) continue;
  await translateModule(mod, code);
}

const mods = [...modules.keys()];
if (mods.length) {
  spawnSync(process.execPath, ['scripts/patch-landing-from-json.mjs', ...mods], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
}
