/**
 * Fill missing keys in locales/data/landing/<mod>.json from English via OpenRouter.
 * Usage: node scripts/fill-missing-landing-keys.mjs tg
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mod = process.argv[2];
if (!mod) throw new Error('module required');

const en = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/locales/data/landing.en.json'), 'utf8'),
);
const jsonPath = path.join(__dirname, `../src/locales/data/landing/${mod}.json`);
const loc = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const missing = Object.keys(en).filter((k) => !(k in loc));
if (!missing.length) {
  console.log(mod, 'complete', Object.keys(loc).length);
  process.exit(0);
}

const subset = {};
for (const k of missing) subset[k] = en[k];

const apiKey = process.env.OPENROUTER_API_KEY || process.env.PROVIDER_OPENROUTER_API_KEY;
if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');

const catalogSrc = fs.readFileSync(path.join(__dirname, '../src/locales/catalog.ts'), 'utf8');
const code = mod;
const nativeMatch = catalogSrc.match(new RegExp(`"code": "${code}"[\\s\\S]*?"nativeName": "([^"]+)"`));
const nativeName = nativeMatch ? nativeMatch[1] : code;

const prompt = `Translate these landing UI strings to ${nativeName} (${code}). Return JSON with same keys only.
Keep placeholders {credits}, {platform}, {count}, {calls}, {shown}, {total}, {model}, {n} and brands AIGenius, Claude, GPT, Gemini, DeepSeek, OpenRouter, Gmail, PDF, Excel, USD, NGN, INV-4021, Sam, Acme, local_shell, api-gateway.
Input:
${JSON.stringify(subset)}`;

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

if (!res.ok) throw new Error(await res.text());
const data = await res.json();
const parsed = JSON.parse(data.choices[0].message.content);
Object.assign(loc, parsed);
const ordered = {};
for (const k of Object.keys(en)) ordered[k] = loc[k] ?? en[k];
fs.writeFileSync(jsonPath, JSON.stringify(ordered, null, 2), 'utf8');
console.log('filled', mod, missing.length, 'keys; total', Object.keys(ordered).length);

spawnSync(process.execPath, ['scripts/patch-landing-from-json.mjs', mod], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
});
