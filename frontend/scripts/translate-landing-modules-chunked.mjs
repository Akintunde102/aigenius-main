/**
 * Translate landing.en.json to specific modules in chunks (avoids truncated JSON).
 * Usage: node scripts/translate-landing-modules-chunked.mjs ti quz chr iu quc
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
if (!mods.length) throw new Error('Pass module keys');

function chunkObject(obj, parts) {
  const entries = Object.entries(obj);
  const size = Math.ceil(entries.length / parts);
  const chunks = [];
  for (let i = 0; i < entries.length; i += size) {
    chunks.push(Object.fromEntries(entries.slice(i, i + size)));
  }
  return chunks;
}

async function translateChunk(mod, nativeName, chunk, part, total) {
  const prompt = `You are a professional UI translator for AIGenius (AI chat product homepage).

Target locale module: ${mod} (${nativeName}). Part ${part}/${total}.
Translate EVERY string value from English to natural ${nativeName} for marketing/UI.
Rules:
- Keep placeholders exactly: {credits}, {platform}, {count}, {calls}, {shown}, {total}, {model}, {n}
- Keep brand names: AIGenius, Claude, GPT, Gemini, DeepSeek, OpenRouter, Windows, macOS, Linux, Gmail, Excel, PDF, SmartScreen, Microsoft, USD, NGN, INV-4021, Sam, Acme, SEO
- Keep technical tokens where appropriate (local_shell, api-gateway/)
- Return ONLY valid JSON with the same keys as input, no markdown, no truncation
- Escape quotes properly in JSON strings

Input JSON:
${JSON.stringify(chunk)}`;

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
    throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('empty model response');
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error(`JSON parse failed part ${part}: ${e.message}`);
  }
}

async function translateModule(mod) {
  const outPath = path.join(outDir, `${mod}.json`);
  const nativeName = catalogName(mod);
  const chunks = chunkObject(enLanding, 8);
  const merged = {};
  for (let i = 0; i < chunks.length; i++) {
    let part;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        part = await translateChunk(mod, nativeName, chunks[i], i + 1, chunks.length);
        break;
      } catch (err) {
        if (attempt === 2) throw err;
        console.warn(`${mod} chunk ${i + 1} retry`, err.message);
      }
    }
    Object.assign(merged, part);
  }
  if (Object.keys(merged).length !== Object.keys(enLanding).length) {
    throw new Error(`${mod}: key count ${Object.keys(merged).length} vs ${Object.keys(enLanding).length}`);
  }
  fs.writeFileSync(outPath, JSON.stringify(merged, null, 2), 'utf8');
  console.log('wrote', outPath, Object.keys(merged).length, 'keys');
}

for (const mod of mods) {
  await translateModule(mod);
}

spawnSync(process.execPath, ['scripts/patch-landing-from-json.mjs', ...mods], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
});
