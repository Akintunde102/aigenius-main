/**
 * Translate landing.en.json via Google Translate (unofficial gtx client).
 * Preserves {placeholders} and brand tokens. Usage:
 *   node scripts/translate-landing-google-free.mjs tr sv uk ...
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const enPath = path.join(__dirname, '../src/locales/data/landing.en.json');
const outDir = path.join(__dirname, '../src/locales/data/landing');

const GOOGLE_TL = {
  tr: 'tr',
  sv: 'sv',
  uk: 'uk',
  el: 'el',
  cs: 'cs',
  da: 'da',
  fi: 'fi',
  no: 'no',
  ro: 'ro',
  hu: 'hu',
  et: 'et',
  is: 'is',
  ca: 'ca',
  eu: 'eu',
  gl: 'gl',
  ga: 'ga',
  cy: 'cy',
  lb: 'lb',
  mt: 'mt',
  gd: 'gd',
  sq: 'sq',
};

const PRESERVE = [
  '{credits}',
  '{platform}',
  '{count}',
  '{calls}',
  '{shown}',
  '{total}',
  '{model}',
  '{n}',
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
  'local_shell',
  'api-gateway/',
  'Nobox Labs Limited',
];

function shield(text) {
  const tokens = [];
  let out = text;
  for (const tok of PRESERVE) {
    const re = new RegExp(tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    out = out.replace(re, () => {
      const id = `⟦${tokens.length}⟧`;
      tokens.push(tok);
      return id;
    });
  }
  return { out, tokens };
}

function unshield(text, tokens) {
  let out = text;
  for (let i = 0; i < tokens.length; i++) {
    out = out.replace(new RegExp(`⟦${i}⟧`, 'g'), tokens[i]);
    out = out.replace(new RegExp(`\\[\\[${i}\\]\\]`, 'g'), tokens[i]);
  }
  return out;
}

const DELAY_MS = Number(process.env.LANDING_I18N_DELAY_MS || 220);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateViaMyMemory(text, tl) {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${tl}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`mymemory ${res.status}`);
  const data = await res.json();
  if (data.responseStatus !== 200 || !data.responseData?.translatedText) {
    throw new Error(`mymemory bad response ${data.responseStatus}`);
  }
  return data.responseData.translatedText;
}

async function translateViaGoogle(text, tl) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
  let lastErr;
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      return data[0].map((row) => row[0]).join('');
    }
    lastErr = new Error(`translate ${res.status}`);
    if (res.status === 429 || res.status >= 500) {
      await sleep(Math.min(30_000, 1500 * 2 ** attempt));
      continue;
    }
    throw lastErr;
  }
  throw lastErr;
}

async function translateChunk(text, tl) {
  if (!text.trim()) return text;
  const { out, tokens } = shield(text);
  const provider = process.env.LANDING_I18N_PROVIDER || 'mymemory';
  let translated;
  if (provider === 'google') {
    translated = await translateViaGoogle(out, tl);
  } else {
    try {
      translated = await translateViaMyMemory(out, tl);
    } catch (e) {
      console.warn('  mymemory fallback google', e.message);
      translated = await translateViaGoogle(out, tl);
    }
  }
  return unshield(translated, tokens);
}

async function translateObject(enLanding, tl, existing = {}) {
  const out = { ...existing };
  const keys = Object.keys(enLanding);
  let done = Object.keys(existing).length;
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (out[key] !== undefined) continue;
    out[key] = await translateChunk(enLanding[key], tl);
    done++;
    if (done % 25 === 0) console.log(`  ${tl}: ${done}/${keys.length}`);
    await sleep(DELAY_MS);
  }
  return out;
}

const mods = process.argv.slice(2);
if (!mods.length) {
  console.error('Pass module keys: tr sv uk ...');
  process.exit(1);
}

const enLanding = JSON.parse(fs.readFileSync(enPath, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });

const force = process.argv.includes('--force');

for (const mod of mods) {
  const tl = GOOGLE_TL[mod] ?? mod;
  const outPath = path.join(outDir, `${mod}.json`);
  let existing = {};
  if (!force && fs.existsSync(outPath)) {
    existing = JSON.parse(fs.readFileSync(outPath, 'utf8'));
    if (Object.keys(existing).length >= Object.keys(enLanding).length) {
      console.log('skip complete', mod);
      continue;
    }
    console.log('resume', mod, Object.keys(existing).length);
  } else {
    console.log('translating', mod, '->', tl);
  }
  const keys = Object.keys(enLanding);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (existing[key] !== undefined) continue;
    existing[key] = await translateChunk(enLanding[key], tl);
    if ((i + 1) % 25 === 0) console.log(`  ${tl}: ${i + 1}/${keys.length}`);
    fs.writeFileSync(outPath, JSON.stringify(existing, null, 2), 'utf8');
    await sleep(DELAY_MS);
  }
  console.log('wrote', outPath, Object.keys(existing).length);
}
