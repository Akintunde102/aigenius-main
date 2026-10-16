import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dictDir = path.join(__dirname, '../src/locales/dictionaries');
const overridesDir = path.join(__dirname, 'batch2-overrides');

function extractLanding(src) {
  const m = src.match(/landing:\s*\{([\s\S]*?)\n  \},\s*\n  modelPicker:/);
  if (!m) return {};
  const landing = {};
  for (const line of m[1].split('\n')) {
    const single = line.match(/^\s+([a-zA-Z0-9_]+):\s*'((?:\\'|[^'])*)',?\s*$/);
    if (single) landing[single[1]] = single[2].replace(/\\'/g, "'");
  }
  return landing;
}

for (const mod of process.argv.slice(2)) {
  const p = path.join(overridesDir, `${mod}.json`);
  const landing = JSON.parse(fs.readFileSync(p, 'utf8'));
  const partial = extractLanding(fs.readFileSync(path.join(dictDir, `${mod}.ts`), 'utf8'));
  Object.assign(landing, partial);
  fs.writeFileSync(p, JSON.stringify(landing, null, 2), 'utf8');
  console.log('merged partial', mod, Object.keys(partial).length);
}
