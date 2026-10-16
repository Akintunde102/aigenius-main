/**
 * Translate landing keys in small batches (5 keys) for hard locales / JSON safety.
 * Usage: node scripts/translate-landing-micro.mjs ti chr iu quc
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const enLanding = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/locales/data/landing.en.json'), 'utf8'),
);
const catalogSrc = fs.readFileSync(path.join(__dirname, '../src/locales/catalog.ts'), 'utf8');
const outDir = path.join(__dirname, '../src/locales/data/landing');
fs.mkdirSync(outDir, { recursive: true });

const catalogName = (code) => {
  const m = catalogSrc.match(new RegExp(`"code": "${code}"[\\s\\S]*?"nativeName": "([^"]+)"`));
  return m ? m[1] : code;
};

const apiKey = process.env.OPENROUTER_API_KEY || process.env.PROVIDER_OPENROUTER_API_KEY;
if (!apiKey) throw new Error('Missing OPENROUTER_API_KEY');

const mods = process.argv.slice(2);
const BATCH = Number(process.env.LANDING_MICRO_BATCH || 1);
const model = process.env.LANDING_I18N_MODEL || 'openai/gpt-4o-mini';

async function translateBatch(mod, nativeName, chunk) {
  const prompt = `Translate these UI strings from English to ${nativeName} (${mod}).
Keep placeholders {credits},{platform},{count},{calls},{shown},{total},{model},{n} and brands AIGenius, Claude, GPT, Gemini, DeepSeek, OpenRouter, Windows, macOS, Linux, Gmail, Excel, PDF, SmartScreen, Microsoft, USD, NGN, INV-4021, Sam, Acme, SEO.
Return ONLY JSON object with identical keys.

${JSON.stringify(chunk)}`;

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://aigenius.noboxlabs.xyz',
      'X-Title': 'AIGenius landing i18n micro',
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  return JSON.parse(content);
}

async function translateModule(mod) {
  const outPath = path.join(outDir, `${mod}.json`);
  const nativeName = catalogName(mod);
  const entries = Object.entries(enLanding);
  const merged = fs.existsSync(outPath)
    ? JSON.parse(fs.readFileSync(outPath, 'utf8'))
    : {};
  for (let i = 0; i < entries.length; i += BATCH) {
    const chunkKeys = entries.slice(i, i + BATCH).map(([k]) => k);
    if (chunkKeys.every((k) => merged[k] !== undefined)) continue;
    const chunk = Object.fromEntries(entries.slice(i, i + BATCH));
    let parsed;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        parsed = await translateBatch(mod, nativeName, chunk);
        break;
      } catch (e) {
        if (attempt === 3) {
          console.warn(`${mod} fallback EN for`, chunkKeys.join(','));
          parsed = chunk;
        }
      }
    }
    Object.assign(merged, parsed);
    fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf8');
    if (Object.keys(merged).length % 10 === 0 || Object.keys(merged).length === entries.length) {
      console.log(mod, `${Object.keys(merged).length}/${entries.length}`);
    }
  }
  console.log('wrote', outPath, Object.keys(merged).length);
}

for (const mod of mods) {
  await translateModule(mod);
}

if (mods.length) {
  spawnSync(process.execPath, ['scripts/patch-landing-from-json.mjs', ...mods], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
  });
}
