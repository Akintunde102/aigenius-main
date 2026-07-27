/**
 * Time full-graph indexing for individual files (production path: indexFileIntelligence).
 */
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { fileURLToPath } from 'url';
import { indexFileIntelligence } from '../src/search/indexer/intelligence-router.js';
import { indexTypeScript, resetTsMorphProjects } from '../src/search/indexer/ts-morph-indexer.js';
import { routeExtraction } from '../src/search/indexer/extractors/router.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..', '..', '..');

const FILES = [
  'client/desktop-server/src/search/indexer/exemptions.ts',
  'client/frontend/src/app/components/AIGeniusLogo.tsx',
  'client/frontend/src/app/(views)/workflows/page.tsx',
  'client/frontend/src/app/(views)/desktop-search-index/page.tsx',
  'client/frontend/src/app/components/ChatBoxInput/ChatBoxInput.tsx',
];

async function timeFile(rel: string, warm: boolean): Promise<void> {
  const filePath = path.join(REPO, rel);
  const { content } = await routeExtraction(filePath, '', true);
  const ext = path.extname(filePath).replace(/^\./, '');

  const t0 = performance.now();
  const intel = await indexFileIntelligence(filePath, content, ext);
  const ms = performance.now() - t0;

  console.log(
    `${warm ? 'warm ' : 'cold'}  ${ms.toFixed(0).padStart(6)} ms  ` +
      `${intel.symbols.length} sym  ${intel.edges.length} edges  ${rel}`,
  );
}

async function main(): Promise<void> {
  console.log('Full graph = indexFileIntelligence (ts-morph all edge collectors)\n');

  resetTsMorphProjects();
  console.log('--- Cold (first file, empty ts-morph cache) ---');
  await timeFile(FILES[0]!, false);

  resetTsMorphProjects();
  console.log('\n--- Cold per file (cache cleared each time) ---');
  for (const f of FILES) {
    resetTsMorphProjects();
    await timeFile(f, false);
  }

  resetTsMorphProjects();
  console.log('\n--- Warm (same project, sequential, cache retained) ---');
  for (const f of FILES) {
    await timeFile(f, true);
  }

  console.log('\n--- Re-index same file (warm, simulates file save) ---');
  const f = FILES[3]!;
  await timeFile(f, true);
  await timeFile(f, true);
}

main().catch((e) => { console.error(e); process.exit(1); });
