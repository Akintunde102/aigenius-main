import pdfParse from 'pdf-parse';

/** Extracts plain text from a PDF buffer using pdf-parse. */
export async function extractPdf(
  filePath: string,
): Promise<{ content: string; tags: string[] }> {
  const { promises: fs } = await import('fs');
  const buf = await fs.readFile(filePath);
  const { text } = await pdfParse(buf);
  return { content: text.trim(), tags: ['pdf'] };
}
