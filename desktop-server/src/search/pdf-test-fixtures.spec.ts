import pdfParse from 'pdf-parse';
import { buildEmbeddedTextPdf, buildImageOnlyPdf, buildOcrTestJpeg } from './pdf-test-fixtures.js';

describe('pdf-test-fixtures', () => {
  it('builds valid embedded and scanned-style PDF fixtures', async () => {
    const marker = `HELLO_${Date.now()}`;
    const embedded = await buildEmbeddedTextPdf(marker);
    expect(embedded.subarray(0, 5).toString()).toBe('%PDF-');

    const parsed = await pdfParse(embedded);
    expect(parsed.text).toContain(marker);

    const jpeg = await buildOcrTestJpeg('IMAGE ONLY');
    const scanned = await buildImageOnlyPdf(jpeg, 900, 160);
    expect(scanned.subarray(0, 5).toString()).toBe('%PDF-');
    const scannedParsed = await pdfParse(scanned);
    expect((scannedParsed.text ?? '').trim().length).toBeLessThan(20);
  });
});
