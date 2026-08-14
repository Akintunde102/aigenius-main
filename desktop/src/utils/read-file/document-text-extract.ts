import fs from 'fs/promises';
import path from 'path';
import { readPdfDocumentText } from '../../local-read-pdf';

export type DocumentExtractKind = 'doc' | 'docx' | 'pdf';
export type DocumentExtractVia = 'text' | 'ocr';

type CacheEntry = {
  mtimeMs: number;
  lines: string[];
  via?: DocumentExtractVia;
};

const extractCache = new Map<string, CacheEntry>();

/** @deprecated Use documentExtractKind */
export type WordDocumentKind = 'doc' | 'docx';

export function documentExtractKind(filePath: string): DocumentExtractKind | null {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  if (ext === 'doc') return 'doc';
  if (ext === 'docx') return 'docx';
  if (ext === 'pdf') return 'pdf';
  return null;
}

/** @deprecated Use documentExtractKind */
export function wordDocumentKind(filePath: string): WordDocumentKind | null {
  const kind = documentExtractKind(filePath);
  if (kind === 'doc' || kind === 'docx') return kind;
  return null;
}

function splitDocumentLines(text: string): string[] {
  if (!text) return [];
  return text.split(/\r?\n/);
}

async function extractDocxText(filePath: string): Promise<string> {
  const mammoth = await import('mammoth');
  const { value } = await mammoth.extractRawText({ path: filePath });
  return value.trim();
}

async function extractLegacyDocText(filePath: string): Promise<string> {
  const WordExtractor = (await import('word-extractor')).default;
  const extractor = new WordExtractor();
  const doc = await extractor.extract(filePath);
  return doc.getBody().trim();
}

async function extractPdfText(filePath: string): Promise<{ text: string; via: DocumentExtractVia }> {
  const { text, method } = await readPdfDocumentText(filePath);
  return { text: text.trim(), via: method };
}

async function extractRawText(
  filePath: string,
  kind: DocumentExtractKind,
): Promise<{ text: string; via?: DocumentExtractVia }> {
  switch (kind) {
    case 'docx':
      return { text: await extractDocxText(filePath) };
    case 'doc':
      return { text: await extractLegacyDocText(filePath) };
    case 'pdf':
      return extractPdfText(filePath);
    default:
      return { text: '' };
  }
}

export type DocumentTextLinesResult =
  | { ok: true; lines: string[]; kind: DocumentExtractKind; via?: DocumentExtractVia }
  | { ok: false; error: string };

/** @deprecated Use getDocumentTextLines */
export type WordDocumentLinesResult = DocumentTextLinesResult;

function extractionErrorHint(kind: DocumentExtractKind): string {
  switch (kind) {
    case 'doc':
      return 'Try saving as .docx or exporting to PDF.';
    case 'docx':
      return 'The file may be corrupt or password-protected.';
    case 'pdf':
      return 'The PDF may be scanned (image-only), encrypted, or corrupt — try OCR on exported images.';
    default:
      return '';
  }
}

function extractionErrorLabel(kind: DocumentExtractKind): string {
  switch (kind) {
    case 'pdf':
      return 'PDF document';
    case 'doc':
      return 'legacy Word document (.doc)';
    case 'docx':
      return 'Word document (.docx)';
    default:
      return 'document';
  }
}

/** Extract document text with mtime-aware cache (lazy-loaded parsers). */
export async function getDocumentTextLines(
  filePath: string,
  kind: DocumentExtractKind,
): Promise<DocumentTextLinesResult> {
  try {
    const stat = await fs.stat(filePath);
    const cached = extractCache.get(filePath);
    if (cached && cached.mtimeMs === stat.mtimeMs) {
      return { ok: true, lines: cached.lines, kind, via: cached.via };
    }

    const extracted = await extractRawText(filePath, kind);
    const lines = splitDocumentLines(extracted.text);
    extractCache.set(filePath, { mtimeMs: stat.mtimeMs, lines, via: extracted.via });
    return { ok: true, lines, kind, via: extracted.via };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: `Error: could not extract text from ${extractionErrorLabel(kind)} — ${path.basename(filePath)} (${message}). ${extractionErrorHint(kind)}`,
    };
  }
}

/** @deprecated Use getDocumentTextLines */
export async function getWordDocumentLines(
  filePath: string,
  kind: WordDocumentKind,
): Promise<DocumentTextLinesResult> {
  return getDocumentTextLines(filePath, kind);
}

/** Clears extraction cache (tests). */
export function clearDocumentTextExtractCacheForTests(): void {
  extractCache.clear();
}

/** @deprecated Use clearDocumentTextExtractCacheForTests */
export function clearWordDocumentExtractCacheForTests(): void {
  clearDocumentTextExtractCacheForTests();
}
