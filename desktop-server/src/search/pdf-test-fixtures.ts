import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { PDFDocument, StandardFonts } from 'pdf-lib';

/** @deprecated Use writeEmbeddedTextPdf — kept for quick buffer checks. */
export async function buildEmbeddedTextPdf(text: string): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([612, 792]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText(text, { x: 50, y: 720, size: 14, font });
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

export async function buildSparseMultiPagePdf(pageTexts: string[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const text of pageTexts) {
    const page = doc.addPage([612, 792]);
    page.drawText(text, { x: 50, y: 720, size: 10, font });
  }
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

export async function buildImageOnlyPdf(jpeg: Buffer, width: number, height: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([width, height]);
  const image = await doc.embedJpg(jpeg);
  page.drawImage(image, { x: 0, y: 0, width, height });
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

/** Renders readable text into a JPEG suitable for OCR fixtures. */
export async function buildOcrTestJpeg(text: string, width = 900, height = 160): Promise<Buffer> {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="white"/>
      <text x="24" y="96" font-family="Arial, sans-serif" font-size="42" fill="black">${text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>
    </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 92 }).toBuffer();
}

export async function writeEmbeddedTextPdf(filePath: string, text: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, await buildEmbeddedTextPdf(text));
}

export async function writeScannedStylePdf(filePath: string, ocrPhrase: string): Promise<void> {
  const jpeg = await buildOcrTestJpeg(ocrPhrase);
  const meta = await sharp(jpeg).metadata();
  const width = meta.width ?? 900;
  const height = meta.height ?? 160;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, await buildImageOnlyPdf(jpeg, width, height));
}

export async function writeSparseMultiPagePdf(filePath: string, pageTexts: string[]): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, await buildSparseMultiPagePdf(pageTexts));
}
