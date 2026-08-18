import fs from 'fs/promises';
import '../polyfills/pdfjs-node.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export async function extractEmbeddedPdfText(filePath: string): Promise<{ text: string; numPages: number }> {
  const data = new Uint8Array(await fs.readFile(filePath));
  const doc = await getDocument({ data, useSystemFonts: true }).promise;

  const parts: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim();
    if (pageText) {
      parts.push(pageText);
    }
    page.cleanup();
  }

  await doc.destroy();
  return {
    text: parts.join('\n').trim(),
    numPages: Math.max(1, doc.numPages),
  };
}
