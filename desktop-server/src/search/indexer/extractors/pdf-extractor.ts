import { readPdfText } from '../../pdf-text-extract.js';

/** Extracts plain text from a PDF (embedded text + OCR fallback when sparse). */
export async function extractPdf(
  filePath: string,
  modelsDir: string,
): Promise<{ content: string; tags: string[] }> {
  const result = await readPdfText({ filePath, modelsDir });
  return { content: result.content, tags: result.tags };
}
