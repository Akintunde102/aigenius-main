import fs from 'fs/promises';
import path from 'path';
import type Database from 'better-sqlite3';
import { getFileIndexRow } from './db/queries.js';
import { routeExtraction } from './indexer/extractors/router.js';
import { fetchImageToTempFile } from './fetch-image-url.js';
import { imageExtensionFromPath, isImageExtension, formatSupportedImageExtensions } from './image-extensions.js';

const META_TAGS = new Set(['image', 'ocr']);

export type ReadImageSource = 'index' | 'live' | 'url';

export type ReadImageResult = {
  path: string;
  name: string;
  extension: string;
  url?: string;
  source: ReadImageSource;
  indexed: boolean;
  ocr_text: string;
  tags: string[];
  objects: string[];
  errors: string[];
  content_truncated?: boolean;
};

export type ReadImageInput = {
  filePath?: string;
  url?: string;
  modelsDir: string;
  db?: Database.Database;
  preferIndex?: boolean;
  forceLive?: boolean;
};

function splitTags(tags: string): string[] {
  return tags.trim().split(/\s+/).filter(Boolean);
}

function objectsFromTags(tags: string[]): string[] {
  return [...new Set(tags.filter((t) => !META_TAGS.has(t.toLowerCase())))];
}

function buildResult(params: {
  filePath: string;
  name: string;
  extension: string;
  url?: string;
  source: ReadImageSource;
  indexed: boolean;
  ocrText: string;
  tags: string[];
  errors: string[];
  contentTruncated?: boolean;
}): ReadImageResult {
  const tags = [...new Set(['image', ...params.tags.filter((t) => t !== 'image')])];
  return {
    path: params.filePath,
    name: params.name,
    extension: params.extension,
    ...(params.url ? { url: params.url } : {}),
    source: params.source,
    indexed: params.indexed,
    ocr_text: params.ocrText,
    tags,
    objects: objectsFromTags(tags),
    errors: params.errors,
    ...(params.contentTruncated ? { content_truncated: true } : {}),
  };
}

async function assertLocalImageFile(filePath: string): Promise<{ name: string; extension: string; mtime: number }> {
  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    throw new Error(`File not found: ${filePath}`);
  }
  if (!stat.isFile()) {
    throw new Error(`Not a file: ${filePath}`);
  }
  const extension = imageExtensionFromPath(filePath);
  if (!isImageExtension(extension)) {
    throw new Error(
      `Not an image file (${extension || 'no extension'}). Supported: ${formatSupportedImageExtensions()}.`,
    );
  }
  return { name: path.basename(filePath), extension, mtime: Math.floor(stat.mtimeMs) };
}

async function tryIndexedResult(
  db: Database.Database,
  filePath: string,
  meta: { name: string; extension: string; mtime: number },
): Promise<ReadImageResult | null> {
  const row = getFileIndexRow(db, filePath);
  if (!row || row.mtime !== meta.mtime) return null;

  const tags = splitTags(row.tags ?? '');
  const hasSignal = row.content.trim().length > 0 || tags.some((t) => !META_TAGS.has(t.toLowerCase()));
  if (!hasSignal) return null;

  return buildResult({
    filePath,
    name: row.name || meta.name,
    extension: row.extension || meta.extension,
    source: 'index',
    indexed: true,
    ocrText: row.content ?? '',
    tags,
    errors: [],
    contentTruncated: row.contentTruncated,
  });
}

async function liveExtraction(
  filePath: string,
  modelsDir: string,
  meta: { name: string; extension: string },
  source: ReadImageSource,
  url?: string,
): Promise<ReadImageResult> {
  const extracted = await routeExtraction(filePath, modelsDir, false);
  const errors: string[] = [];
  if (extracted.error) errors.push(extracted.error);

  const ocrText = extracted.content ?? '';
  const tags = extracted.tags ?? [];
  const hasOcr = ocrText.trim().length > 0;
  const hasObjects = objectsFromTags(tags).length > 0;
  if (!hasOcr && !hasObjects) {
    if (errors.length === 0) {
      errors.push('No text or objects detected (OCR and object detection returned empty results).');
    }
  }

  return buildResult({
    filePath,
    name: meta.name,
    extension: meta.extension,
    url,
    source,
    indexed: false,
    ocrText,
    tags,
    errors,
  });
}

export async function readImageAnalysis(input: ReadImageInput): Promise<ReadImageResult> {
  const preferIndex = input.preferIndex !== false;
  const forceLive = input.forceLive === true;
  const hasPath = typeof input.filePath === 'string' && input.filePath.trim().length > 0;
  const hasUrl = typeof input.url === 'string' && input.url.trim().length > 0;

  if (hasPath && hasUrl) {
    throw new Error('Provide either path or url, not both');
  }
  if (!hasPath && !hasUrl) {
    throw new Error('path or url is required');
  }

  if (hasUrl) {
    const fetched = await fetchImageToTempFile(input.url!.trim());
    try {
      return await liveExtraction(
        fetched.filePath,
        input.modelsDir,
        { name: path.basename(fetched.filePath), extension: fetched.extension },
        'url',
        fetched.url,
      );
    } finally {
      await fetched.cleanup();
    }
  }

  const filePath = path.resolve(input.filePath!.trim());
  const meta = await assertLocalImageFile(filePath);

  if (preferIndex && !forceLive && input.db) {
    const cached = await tryIndexedResult(input.db, filePath, meta);
    if (cached) return cached;
  }

  return liveExtraction(filePath, input.modelsDir, meta, 'live');
}
