/**
 * Translate landing.en.json via Google Translate (gtx client) for a batch index.
 * Usage: node scripts/translate-landing-gtx-batch.mjs --batch 3
 * Merges existing landing strings from dictionary TS when present and not English.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const batches = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'landing-translation-batches.json'), 'utf8'),
);
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

const CYR_TO_LAT = {
  А: 'A', а: 'a', Б: 'B', б: 'b', В: 'V', в: 'v', Г: 'G', г: 'g', Д: 'D', д: 'd',
  Ђ: 'Đ', ђ: 'đ', Е: 'E', е: 'e', Ж: 'Ž', ж: 'ž', З: 'Z', з: 'z', И: 'I', и: 'i',
  Ј: 'J', ј: 'j', К: 'K', к: 'k', Л: 'L', л: 'l', Љ: 'Lj', љ: 'lj', М: 'M', м: 'm',
  Н: 'N', н: 'n', Њ: 'Nj', њ: 'nj', О: 'O', о: 'o', П: 'P', п: 'p', Р: 'R', р: 'r',
  С: 'S', с: 's', Т: 'T', т: 't', Ћ: 'Ć', ћ: 'ć', У: 'U', у: 'u', Ф: 'F', ф: 'f',
  Х: 'H', х: 'h', Ц: 'C', ц: 'c', Ч: 'Č', ч: 'č', Џ: 'Dž', џ: 'dž', Ш: 'Š', ш: 'š',
};

function serbianCyrlToLatn(text) {
  let out = '';
  for (const ch of text) {
    out += CYR_TO_LAT[ch] ?? ch;
  }
  return out;
}

const PROTECT = [
  'AIGenius', 'Claude', 'GPT', 'Gemini', 'DeepSeek', 'OpenRouter', 'Gmail', 'SmartScreen',
  'Microsoft', 'Windows', 'macOS', 'Linux', 'PDF', 'Excel', 'USD', 'NGN', 'INV-4021', 'Sam',
  'Acme', 'SEO', 'local_shell', 'api-gateway/', 'Nobox Labs Limited', 'Ollama', 'Llama',
];

function protectText(text) {
  const tokens = [];
  let s = text;
  const phRe = /\{[^}]+\}/g;
  s = s.replace(phRe, (m) => {
    const t = `⟦PH${tokens.length}⟧`;
    tokens.push({ t, v: m });
    return t;
  });
  for (const brand of PROTECT) {
    if (!s.includes(brand)) continue;
    const t = `⟦BR${tokens.length}⟧`;
    tokens.push({ t, v: brand });
    s = s.split(brand).join(t);
  }
  return { s, tokens };
}

function unprotectText(s, tokens) {
  let out = s;
  for (const { t, v } of tokens) {
    out = out.split(t).join(v);
  }
  return out;
}

const SPLIT = '\n⟦§⟧\n';

async function gtxTranslateOnce(text, tl) {
  const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=en&tl=${encodeURIComponent(tl)}&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = new Error(`gtx ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  if (Array.isArray(data) && typeof data[0] === 'string') {
    return data.join('');
  }
  if (Array.isArray(data?.[0])) {
    return data[0].map((p) => (Array.isArray(p) ? p[0] : p)).join('');
  }
  return text;
}

async function gtxTranslate(text, tl) {
  if (!text.trim()) return text;
  let delay = 2000;
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      return await gtxTranslateOnce(text, tl);
    } catch (e) {
      if (e.status === 429 && attempt < 7) {
        await sleep(delay);
        delay = Math.min(delay * 2, 60000);
        continue;
      }
      throw e;
    }
  }
  return text;
}

async function gtxTranslateMany(texts, tl, post) {
  if (!texts.length) return [];
  const packed = texts.map((t, i) => `[${i}]${t}`).join(SPLIT);
  const { s, tokens } = protectText(packed);
  let translated = await gtxTranslate(s, tl);
  translated = unprotectText(translated, tokens);
  if (post) translated = post(translated);
  const chunks = translated.split(SPLIT);
  if (chunks.length !== texts.length) {
    const out = [];
    for (const t of texts) {
      out.push(await translateValue(t, { gtx: tl, post }));
      await sleep(800);
    }
    return out;
  }
  return chunks.map((chunk, i) => chunk.replace(new RegExp(`^\\[${i}\\]`), ''));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractLandingFromDict(src) {
  const m = src.match(/(?:"landing"|landing):\s*\{([\s\S]*?)\n  \},/);
  if (!m) return {};
  const block = m[1];
  const landing = {};
  for (const line of block.split('\n')) {
    const qm = line.match(/^\s+"?([a-zA-Z0-9_]+)"?:\s*"((?:\\.|[^"\\])*)",?\s*$/);
    if (qm) {
      landing[qm[1]] = qm[2].replace(/\\"/g, '"').replace(/\\n/g, '\n');
      continue;
    }
    const sm = line.match(/^\s+([a-zA-Z0-9_]+):\s*'((?:\\'|[^'])*)',?\s*$/);
    if (sm) landing[sm[1]] = sm[2].replace(/\\'/g, "'");
  }
  return landing;
}

const batchIdx = Number(process.argv.find((a, i) => process.argv[i - 1] === '--batch') ?? -1);
if (batchIdx < 0 || batchIdx >= batches.length) {
  throw new Error(`Provide --batch 0..${batches.length - 1}`);
}

const enPath = path.join(__dirname, '../src/locales/data/landing.en.json');
const enLanding = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const enKeys = Object.keys(enLanding);
const dictDir = path.join(__dirname, '../src/locales/dictionaries');
const outDir = path.join(__dirname, '../src/locales/data/landing');
fs.mkdirSync(outDir, { recursive: true });

/** @type {Record<string, { gtx: string, post?: (s: string) => string }>} */
const TARGET = {
  sk: { gtx: 'sk' },
  sl: { gtx: 'sl' },
  bg: { gtx: 'bg' },
  hr: { gtx: 'hr' },
  'sr-latn': { gtx: 'sr', post: serbianCyrlToLatn },
  'sr-cyrl': { gtx: 'sr' },
  bs: { gtx: 'bs' },
  mk: { gtx: 'mk' },
  be: { gtx: 'be' },
  lt: { gtx: 'lt' },
  lv: { gtx: 'lv' },
};

const codes = batches[batchIdx];
const modules = new Map();
for (const code of codes) {
  const mod = moduleKeyForCode(code);
  if (!mod || !TARGET[mod]) continue;
  if (!modules.has(mod)) modules.set(mod, TARGET[mod]);
}

async function translateValue(text, meta) {
  const { s, tokens } = protectText(text);
  let translated = await gtxTranslate(s, meta.gtx);
  translated = unprotectText(translated, tokens);
  if (meta.post) translated = meta.post(translated);
  return translated;
}

const BATCH = 8;

for (const [mod, meta] of modules) {
  const outPath = path.join(outDir, `${mod}.json`);
  const dictPath = path.join(dictDir, `${mod}.ts`);
  const existing = fs.existsSync(dictPath) ? extractLandingFromDict(fs.readFileSync(dictPath, 'utf8')) : {};
  const out = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : {};
  const pending = [];
  for (const key of enKeys) {
    const enVal = enLanding[key];
    const cur = out[key] ?? existing[key];
    if (cur && cur !== enVal) {
      out[key] = cur;
      continue;
    }
    pending.push(key);
  }
  console.log(mod, 'pending', pending.length);
  for (let i = 0; i < pending.length; i += BATCH) {
    const slice = pending.slice(i, i + BATCH);
    const texts = slice.map((k) => enLanding[k]);
    const translated = await gtxTranslateMany(texts, meta.gtx, meta.post);
    slice.forEach((key, j) => {
      out[key] = translated[j] ?? enLanding[key];
    });
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
    process.stdout.write(`${mod} ${Math.min(i + BATCH, pending.length)}/${pending.length}\n`);
    await sleep(400);
  }
  console.log('wrote', outPath, Object.keys(out).length, 'keys');
}

const mods = [...modules.keys()];
if (mods.length) {
  spawnSync(process.execPath, ['scripts/patch-landing-from-json.mjs', ...mods], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
}
