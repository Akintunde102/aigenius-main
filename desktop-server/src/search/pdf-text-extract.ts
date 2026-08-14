import { extractOcrFromBuffer } from './indexer/extractors/ocr-extractor.js';
import { extractEmbeddedPdfText } from './pdf-embedded-text.js';
import { pdfTextLooksInsufficient } from './pdf-text-insufficient.js';

export type PdfTextExtractMethod = 'text' | 'ocr';

export type PdfTextExtractResult = {
  content: string;
  tags: string[];
  method: PdfTextExtractMethod;
  numPages: number;
  ocrPages?: number;
};

export type ReadPdfTextOptions = {
  filePath: string;
  modelsDir: string;
  maxOcrPages?: number;
};

const DEFAULT_MAX_OCR_PAGES = 25;

async function parsePdfText(filePath: string): Promise<{ text: string; numPages: number }> {
  return extractEmbeddedPdfText(filePath);
}

async function ocrPdfPages(
  filePath: string,
  modelsDir: string,
  maxOcrPages: number,
): Promise<{ text: string; pagesOcrd: number }> {
  const { renderPdfPagesToPngBuffers } = await import('./pdf-page-renderer.js');
  const pageBuffers = await renderPdfPagesToPngBuffers(filePath, { maxPages: maxOcrPages });
  const parts: string[] = [];

  for (let i = 0; i < pageBuffers.length; i++) {
    const pageNum = i + 1;
    const { content } = await extractOcrFromBuffer(pageBuffers[i]!, modelsDir);
    const trimmed = content.trim();
    if (trimmed) {
      parts.push(pageBuffers.length > 1 ? `--- Page ${pageNum} ---\n${trimmed}` : trimmed);
    }
  }

  return { text: parts.join('\n\n').trim(), pagesOcrd: pageBuffers.length };
}

/**
 * Extract PDF text with pdf.js; fall back to PaddleOCR when embedded text is missing or sparse.
 */
export async function readPdfText(options: ReadPdfTextOptions): Promise<PdfTextExtractResult> {
  const { filePath, modelsDir, maxOcrPages = DEFAULT_MAX_OCR_PAGES } = options;
  const { text, numPages } = await parsePdfText(filePath);

  if (!pdfTextLooksInsufficient(text, numPages)) {
    return { content: text, tags: ['pdf'], method: 'text', numPages };
  }

  if (!modelsDir.trim()) {
    return {
      content: text,
      tags: ['pdf'],
      method: 'text',
      numPages,
    };
  }

  try {
    const { text: ocrText, pagesOcrd } = await ocrPdfPages(filePath, modelsDir, maxOcrPages);
    if (ocrText.length > text.length) {
      return {
        content: ocrText,
        tags: ['pdf', 'ocr'],
        method: 'ocr',
        numPages,
        ocrPages: pagesOcrd,
      };
    }
  } catch {
    // Keep embedded-text output when OCR is unavailable (missing models, render failure, etc.).
  }

  return { content: text, tags: ['pdf'], method: 'text', numPages };
}
