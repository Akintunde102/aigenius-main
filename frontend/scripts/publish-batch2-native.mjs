import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nativeDir = path.join(__dirname, 'batch2-native');
const outDir = path.join(__dirname, '../src/locales/data/landing');

const mods = process.argv.slice(2);
for (const mod of mods) {
  const src = path.join(nativeDir, `${mod}.json`);
  const dst = path.join(outDir, `${mod}.json`);
  fs.copyFileSync(src, dst);
  console.log('published', mod);
}
