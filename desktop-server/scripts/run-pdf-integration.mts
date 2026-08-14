/**
 * Real pdf.js + optional PaddleOCR integration (outside Jest — pdfjs-dist is ESM-only).
 *
 *   npm run test:pdf:integration
 *   npm run test:pdf:live          # includes OCR when models are present
 */
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { extractEmbeddedPdfText } from '../src/search/pdf-embedded-text.ts';
import { readPdfText } from '../src/search/pdf-text-extract.ts';
import { PADDLE_FILES } from '../src/search/indexer/extractors/ocr-extractor.ts';
import {
  buildEmbeddedTextPdf,
  writeEmbeddedTextPdf,
  writeScannedStylePdf,
} from '../src/search/pdf-test-fixtures.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runLive = process.env.RUN_PDF_LIVE === '1';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function resolveDesktopModelsDir(): string {
  const fromEnv = process.env.AIGENIUS_MODELS_DIR?.trim();
  if (fromEnv) return fromEnv;
  return path.resolve(__dirname, '../../desktop/src/models');
}

async function ocrModelsReady(modelsDir: string): Promise<boolean> {
  try {
    await Promise.all([
      fs.access(path.join(modelsDir, PADDLE_FILES.detection)),
      fs.access(path.join(modelsDir, PADDLE_FILES.recognition)),
      fs.access(path.join(modelsDir, PADDLE_FILES.charactersDictionary)),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function testNoStaleEmbeddedText(tmpDir: string): Promise<void> {
  const a = path.join(tmpDir, 'a.pdf');
  const b = path.join(tmpDir, 'b.pdf');
  await fs.writeFile(a, await buildEmbeddedTextPdf('FIRST_UNIQUE_TEXT'));
  await fs.writeFile(b, await buildEmbeddedTextPdf('SECOND_UNIQUE_TEXT'));

  const ra = await extractEmbeddedPdfText(a);
  const rb = await extractEmbeddedPdfText(b);

  assert(ra.text.includes('FIRST_UNIQUE_TEXT'), 'first PDF text missing marker');
  assert(rb.text.includes('SECOND_UNIQUE_TEXT'), 'second PDF returned stale/wrong text');
  console.log('  ok: multi-PDF parse (no stale text)');
}

async function testReadPdfScenarios(tmpDir: string): Promise<void> {
  const taxPath = path.join(tmpDir, 'tax-form.pdf');
  await writeEmbeddedTextPdf(
    taxPath,
    'Form 1040 - Adjusted gross income: $84,200. Refund expected: $1,240.',
  );
  const tax = await readPdfText({ filePath: taxPath, modelsDir: '' });
  assert(tax.method === 'text', 'tax form should use text layer');
  assert(tax.content.includes('Adjusted gross income'), 'tax form text missing');

  const shortPath = path.join(tmpDir, 'short.pdf');
  await writeEmbeddedTextPdf(shortPath, 'ab');
  const short = await readPdfText({ filePath: shortPath, modelsDir: '' });
  assert(short.content === 'ab', `short PDF expected "ab", got "${short.content}"`);

  const spacedDir = path.join(tmpDir, 'My Documents');
  const letterPath = path.join(spacedDir, 'Cover Letter.pdf');
  await writeEmbeddedTextPdf(letterPath, 'Dear hiring manager, I am applying for the role.');
  const letter = await readPdfText({ filePath: letterPath, modelsDir: '' });
  assert(letter.content.includes('Dear hiring manager'), 'letter text missing');

  const scanPath = path.join(tmpDir, 'scan-fixture.pdf');
  await writeScannedStylePdf(scanPath, 'SCANNED_PHRASE_TEST');
  const scan = await readPdfText({ filePath: scanPath, modelsDir: '' });
  assert(scan.content.length < 40, 'scanned fixture should have sparse embedded text');

  const embedded = await buildEmbeddedTextPdf('VALID_EMBEDDED_MARKER');
  assert(embedded.subarray(0, 5).toString() === '%PDF-', 'fixture should be valid PDF');
  console.log('  ok: readPdfText scenarios (digital, short, spaced path, scan fixture)');
}

async function testLiveEmbedded(modelsDir: string, tmpDir: string): Promise<void> {
  const filePath = path.join(tmpDir, 'embedded-live.pdf');
  const marker = `LIVE_EMBEDDED_${Date.now()}`;
  await writeEmbeddedTextPdf(filePath, `Quarterly report summary. Marker: ${marker}.`);

  const result = await readPdfText({ filePath, modelsDir });
  assert(result.method === 'text', 'live embedded PDF should use text layer');
  assert(result.content.includes(marker), 'live embedded marker missing');
  assert(!result.tags.includes('ocr'), 'live embedded should not be tagged ocr');
  console.log('  ok: live embedded-text PDF');
}

async function testLiveOcr(modelsDir: string, tmpDir: string): Promise<void> {
  const ready = await ocrModelsReady(modelsDir);
  if (!ready) {
    console.warn(`  skip: OCR models missing under ${modelsDir} (run: cd client/desktop && npm run download-models)`);
    return;
  }

  const phrase = `OCR LIVE ${Date.now()}`;
  const filePath = path.join(tmpDir, 'scanned-live.pdf');
  await writeScannedStylePdf(filePath, phrase);

  const result = await readPdfText({ filePath, modelsDir, maxOcrPages: 1 });
  assert(result.method === 'ocr', `expected OCR method, got ${result.method}`);
  assert(result.tags.includes('ocr'), 'expected ocr tag');
  assert(result.ocrPages === 1, 'expected 1 OCR page');
  assert(/OCR/i.test(result.content), `OCR content too weak: "${result.content.slice(0, 80)}"`);
  console.log('  ok: live scanned PDF via PaddleOCR');
}

async function main(): Promise<void> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'pdf-integration-'));
  const modelsDir = resolveDesktopModelsDir();

  console.log('PDF integration (pdf.js)');
  try {
    await testNoStaleEmbeddedText(tmpDir);
    await testReadPdfScenarios(tmpDir);

    if (runLive) {
      console.log('PDF live (embedded + OCR)');
      await testLiveEmbedded(modelsDir, tmpDir);
      await testLiveOcr(modelsDir, tmpDir);
    } else {
      console.log('(set RUN_PDF_LIVE=1 for OCR live checks)');
    }

    console.log('\nAll PDF integration checks passed.');
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('\nPDF integration failed:', err);
  process.exit(1);
});
