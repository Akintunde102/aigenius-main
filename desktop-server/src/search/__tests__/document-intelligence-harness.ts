import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { routeExtraction } from '../indexer/extractors/router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const REAL_MODELS_DIR = path.join(__dirname, '..', '..', '..', '..', 'desktop', 'src', 'models');

async function runTests() {
  console.log('--- DOCUMENT INTELLIGENCE INTEGRATION TESTS ---');
  let passed = 0;
  let failed = 0;

  async function assert(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`❌ FAIL: ${name}`);
      console.error(`   Reason: ${err.message}`);
      failed++;
    }
  }

  await assert('Semantic text from real PDF', async () => {
    const pdfPath = path.join(FIXTURES_DIR, 'dummy.pdf');
    const { content, tags, error } = await routeExtraction(pdfPath, REAL_MODELS_DIR);
    if (error) throw new Error(error);
    if (!content.toLowerCase().includes('dummy')) throw new Error('Missing "dummy" text');
    if (!tags.includes('pdf')) throw new Error('Missing "pdf" tag');
  });

  await assert('Semantic text and styles from DOCX', async () => {
    const docxPath = path.join(FIXTURES_DIR, 'demo.docx');
    const { content, tags, error } = await routeExtraction(docxPath, REAL_MODELS_DIR);
    if (error) throw new Error(error);
    if (content.length < 100) throw new Error('Content too short');
    if (!tags.includes('word')) throw new Error('Missing "word" tag');
  });

  await assert('High-accuracy OCR on benchmark', async () => {
    const ocrPath = path.join(FIXTURES_DIR, 'ocr_bench.png');
    const { content, tags, error } = await routeExtraction(ocrPath, REAL_MODELS_DIR);
    if (error) throw new Error(error);
    if (!content.includes('Splendour')) throw new Error(`Missing "Splendour" (Got: ${content.substring(0, 50)}...)`);
    if (!tags.includes('image')) throw new Error('Missing "image" tag');
  });

  await assert('Objects in complex photo (YOLOX)', async () => {
    const yoloPath = path.join(FIXTURES_DIR, 'yolox_bench.jpg');
    const { tags, error } = await routeExtraction(yoloPath, REAL_MODELS_DIR);
    if (error) throw new Error(error);
    console.log(`   (YOLO Tags Found: ${tags.join(', ')})`);
    if (!tags.includes('bus')) throw new Error('Should detect "bus"');
    if (!tags.includes('person')) throw new Error('Should detect "person"');
  });

  await assert('Malformed file resilience', async () => {
    const brokenPath = path.join(FIXTURES_DIR, 'corrupted.pdf');
    fs.writeFileSync(brokenPath, 'NOT A PDF BINARY CONTENT');
    try {
      const { content, error } = await routeExtraction(brokenPath, REAL_MODELS_DIR);
      if (content !== '') throw new Error('Should return empty content for broken file');
      if (!error) throw new Error('Should return error object for broken file');
    } finally {
      fs.unlinkSync(brokenPath);
    }
  });

  console.log('\n-----------------------------------------------');
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  
  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal Test Harness Error:', err);
  process.exit(1);
});
