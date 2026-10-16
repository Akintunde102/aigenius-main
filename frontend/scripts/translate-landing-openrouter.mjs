/**
 * Translate landing.en.json to target languages via OpenRouter (one JSON object per module).
 * Usage: node scripts/translate-landing-openrouter.mjs --batch 0
 * Env: OPENROUTER_API_KEY or PROVIDER_OPENROUTER_API_KEY
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const batches = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'landing-translation-batches.json'), 'utf8'),
);
const catalogSrc = fs.readFileSync(path.join(__dirname, '../src/locales/catalog.ts'), 'utf8');
const catalogName = (code) => {
  const m = catalogSrc.match(new RegExp(`"code": "${code}"[\\s\\S]*?"nativeName": "([^"]+)"`));
  return m ? m[1] : code;
};

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
if (!fs.existsSync(enPath)) {
  throw new Error('Run node scripts/extract-landing-en.mjs first');
}
const enLanding = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const batchIdx = Number(process.argv.find((a, i) => process.argv[i - 1] === '--batch') ?? process.argv[2] ?? -1);
if (batchIdx < 0 || batchIdx >= batches.length) {
  throw new Error(`Provide --batch 0..${batches.length - 1}`);
}

const apiKey = process.env.OPENROUTER_API_KEY || process.env.PROVIDER_OPENROUTER_API_KEY;
if (!apiKey) {
  throw new Error('Missing OPENROUTER_API_KEY');
}

const outDir = path.join(__dirname, '../src/locales/data/landing');
fs.mkdirSync(outDir, { recursive: true });

const codes = batches[batchIdx];
const modules = new Map();
for (const code of codes) {
  const mod = moduleKeyForCode(code);
  if (!mod) continue;
  if (!modules.has(mod)) modules.set(mod, { code, nativeName: catalogName(code) });
}

async function translateModule(mod, meta) {
  const outPath = path.join(outDir, `${mod}.json`);
  if (fs.existsSync(outPath)) {
    console.log('skip existing', mod);
    return;
  }

  const prompt = `You are a professional UI translator for AIGenius (AI chat product homepage + interactive app preview demos).

Target locale: ${meta.code} (${meta.nativeName}).
Translate EVERY string value in the JSON below from English to natural ${meta.nativeName} for marketing/UI.
Rules:
- Keep placeholders exactly: {credits}, {platform}, {count}, {calls}, {shown}, {total}, {model}, {n}
- Keep brand names: AIGenius, Claude, GPT, Gemini, DeepSeek, OpenRouter, Windows, macOS, Linux, Gmail, Excel, PDF, SmartScreen, Microsoft, USD, NGN, INV-4021, Sam, Acme, SEO
- Keep technical tokens in demo tool labels where appropriate (local_shell, api-gateway/)
- Return ONLY valid JSON with the same keys as input, no markdown
- For RTL languages use correct script; UI layout stays LTR

Input JSON:
${JSON.stringify(enLanding)}`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://aigenius.noboxlabs.xyz',
      'X-Title': 'AIGenius landing i18n',
    },
    body: JSON.stringify({
      model: process.env.LANDING_I18N_MODEL || 'google/gemini-2.5-flash',
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${t.slice(0, 500)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('empty model response');
  const parsed = JSON.parse(content);
  fs.writeFileSync(outPath, JSON.stringify(parsed, null, 2), 'utf8');
  console.log('wrote', outPath, Object.keys(parsed).length, 'keys');
}

for (const [mod, meta] of modules) {
  await translateModule(mod, meta);
}

const mods = [...modules.keys()];
if (mods.length) {
  const { spawnSync } = await import('child_process');
  spawnSync(process.execPath, ['scripts/patch-landing-from-json.mjs', ...mods], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
}
