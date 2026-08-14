import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import pdfParse from 'pdf-parse';
import { writeEmbeddedTextPdf } from '../dist/search/pdf-test-fixtures.js';

async function main() {
  const d = await fs.mkdtemp(path.join(os.tmpdir(), 'pdfdbg-'));
  const a = path.join(d, 'a.pdf');
  const b = path.join(d, 'b.pdf');
  await writeEmbeddedTextPdf(a, 'FIRST_UNIQUE_TEXT');
  await writeEmbeddedTextPdf(b, 'SECOND_UNIQUE_TEXT');
  const ra = await pdfParse(await fs.readFile(a));
  const rb = await pdfParse(await fs.readFile(b));
  console.log('A:', JSON.stringify(ra.text));
  console.log('B:', JSON.stringify(rb.text));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
