import { createWorker, type Worker as TesseractWorker } from 'tesseract.js';
import path from 'path';
import fs from 'fs';

let _worker: TesseractWorker | null = null;
let _modelsDir = '';

/** Must be called before first extraction; idempotent. */
export async function initOcr(modelsDir: string): Promise<void> {
  if (_worker) return;
  _modelsDir = modelsDir;

  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  const worker = await createWorker('eng', 1, {
    cachePath: modelsDir,
    logger: () => undefined, // suppress progress logs
  });
  _worker = worker;
}

/** Runs Tesseract OCR on an image file; returns extracted text. */
export async function extractOcr(
  filePath: string,
  modelsDir: string,
): Promise<{ content: string; tags: string[] }> {
  await initOcr(modelsDir);
  const worker = _worker!;
  const { data } = await worker.recognize(filePath);
  return { content: data.text.trim(), tags: ['image', 'ocr'] };
}

/** Terminate the worker thread when the app quits. */
export async function terminateOcr(): Promise<void> {
  if (_worker) {
    await _worker.terminate();
    _worker = null;
  }
}

export { _modelsDir };
