/**
 * One (or few) Google gtx requests per locale for landing.en.json → data/landing/*.json
 * Usage: node scripts/translate-landing-bulk-once.mjs ml pa ne ...
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const enLanding = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/locales/data/landing.en.json'), 'utf8'),
);
const outDir = path.join(__dirname, '../src/locales/data/landing');
fs.mkdirSync(outDir, { recursive: true });

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
  'api-gateway/',
  'local_shell',
];

const perKey = process.argv.includes('--per-key');
const mods = process.argv.slice(2).filter((a) => a !== '--per-key');
if (!mods.length) throw new Error('Pass module keys: ml pa ne ...');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function googleLang(code) {
  if (code === 'kok') return 'gom';
  return code;
}

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

function packEntries(entries) {
  const tokenMaps = [];
  const packed = entries
    .map(([key, val], i) => {
      const { out, tokens } = protectString(val);
      tokenMaps.push(tokens);
      return `⟦K${i}⟧${out}`;
    })
    .join('\n');
  return { packed, tokenMaps };
}

function unpackEntries(text, entries, tokenMaps) {
  const out = {};
  const parts = text.split(/⟦K(\d+)⟧/);
  for (let i = 1; i < parts.length; i += 2) {
    const idx = Number(parts[i]);
    const chunk = (parts[i + 1] ?? '').trim();
    const [key] = entries[idx];
    out[key] = restoreString(chunk, tokenMaps[idx] ?? []);
  }
  return out;
}

async function translateOne(text, targetLang) {
  const { out, tokens } = protectString(text);
  const url =
    'https://translate.google.com/translate_a/single?client=gtx&dt=t&sl=en&tl=' +
    encodeURIComponent(googleLang(targetLang)) +
    '&q=' +
    encodeURIComponent(out);
  for (let attempt = 0; attempt < 15; attempt++) {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (res.status === 429) {
      await sleep(10000 * (attempt + 1));
      continue;
    }
    const raw = await res.text();
    if (raw.startsWith('<')) {
      await sleep(10000 * (attempt + 1));
      continue;
    }
    const data = JSON.parse(raw);
    const t = data[0].map((row) => row[0]).join('');
    return restoreString(t, tokens);
  }
  throw new Error(`${targetLang} rate limited`);
}

async function translateBulk(text, targetLang) {
  const url =
    'https://translate.google.com/translate_a/single?client=gtx&dt=t&sl=en&tl=' +
    encodeURIComponent(googleLang(targetLang)) +
    '&q=' +
    encodeURIComponent(text);
  for (let attempt = 0; attempt < 15; attempt++) {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (res.status === 429) {
      await sleep(10000 * (attempt + 1));
      continue;
    }
    if (!res.ok) throw new Error(`${targetLang} HTTP ${res.status}`);
    const text = await res.text();
    if (text.startsWith('<')) {
      await sleep(10000 * (attempt + 1));
      continue;
    }
    const data = JSON.parse(text);
    return data[0].map((row) => row[0]).join('');
  }
  throw new Error(`${targetLang} rate limited`);
}

async function translateMod(mod) {
  const outPath = path.join(outDir, `${mod}.json`);
  if (fs.existsSync(outPath)) {
    const existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    if (Object.keys(existing).length === Object.keys(enLanding).length) {
      console.log('skip', mod);
      return;
    }
  }
  const entries = Object.entries(enLanding);
  if (perKey) {
    const merged = {};
    for (let i = 0; i < entries.length; i++) {
      const [key, val] = entries[i];
      merged[key] = await translateOne(val, mod);
      if (i % 20 === 19) console.log(mod, i + 1, '/', entries.length);
      await sleep(500);
    }
    fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf8');
    console.log('wrote', mod, outPath);
    return;
  }
  const parts = 4;
  const chunkSize = Math.ceil(entries.length / parts);
  const chunks = [];
  for (let i = 0; i < entries.length; i += chunkSize) {
    chunks.push(entries.slice(i, i + chunkSize));
  }
  const merged = {};
  for (let c = 0; c < chunks.length; c++) {
    const { packed, tokenMaps } = packEntries(chunks[c]);
    console.log('translate chunk', mod, c + 1, '/', chunks.length, packed.length, 'chars');
    const translated = await translateBulk(packed, mod);
    Object.assign(merged, unpackEntries(translated, chunks[c], tokenMaps));
    await sleep(6000);
  }
  if (Object.keys(merged).length !== entries.length) {
    console.warn(`${mod}: bulk unpack got ${Object.keys(merged).length}/${entries.length}, filling gaps`);
    for (const [key, val] of entries) {
      if (merged[key]) continue;
      merged[key] = await translateOne(val, mod);
      await sleep(500);
    }
  }
  fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf8');
  console.log('wrote', mod, outPath);
}

for (const mod of mods) {
  await translateMod(mod);
}

spawnSync(process.execPath, ['scripts/patch-landing-from-json.mjs', ...mods], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
});
