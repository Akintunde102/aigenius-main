import fs from 'fs';
import path from 'path';
import { ensureModelsDownloaded } from '../../models-downloader.js';
import type { ModelPathOptions, PaddleOcrService } from 'ppu-paddle-ocr';

let _service: PaddleOcrService | null = null;
let _modelsDir = '';
let _paddleModule: typeof import('ppu-paddle-ocr') | null | undefined;

const PADDLE_FILES = {
  detection: 'PP-OCRv6_small_det.ort',
  recognition: 'PP-OCRv6_small_rec.ort',
  charactersDictionary: 'ppocrv6_dict.txt',
} as const;

async function loadPaddleModule(): Promise<typeof import('ppu-paddle-ocr') | null> {
  if (_paddleModule !== undefined) {
    return _paddleModule;
  }
  try {
    _paddleModule = await import('ppu-paddle-ocr');
    return _paddleModule;
  } catch (err) {
    console.warn(
      '[ocr-extractor] ppu-paddle-ocr unavailable; OCR disabled.',
      err instanceof Error ? err.message : err,
    );
    _paddleModule = null;
    return null;
  }
}

function resolvePaddleModelPaths(
  modelsDir: string,
  fallbackModel: ModelPathOptions,
): ModelPathOptions {
  const detection = path.join(modelsDir, PADDLE_FILES.detection);
  const recognition = path.join(modelsDir, PADDLE_FILES.recognition);
  const charactersDictionary = path.join(modelsDir, PADDLE_FILES.charactersDictionary);

  if (
    fs.existsSync(detection)
    && fs.existsSync(recognition)
    && fs.existsSync(charactersDictionary)
  ) {
    return { detection, recognition, charactersDictionary };
  }

  return fallbackModel;
}

/** Must be called before first extraction; idempotent. */
export async function initOcr(modelsDir: string): Promise<void> {
  if (_service?.isInitialized()) return;

  const paddle = await loadPaddleModule();
  if (!paddle) return;

  _modelsDir = modelsDir;

  await ensureModelsDownloaded(modelsDir);

  _service = new paddle.PaddleOcrService({
    model: resolvePaddleModelPaths(modelsDir, paddle.V6_SMALL_MODEL),
  });
  await _service.initialize();
}

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/** Runs PP-OCRv6 on an in-memory image buffer. */
export async function extractOcrFromBuffer(
  imageBuffer: Buffer,
  modelsDir: string,
): Promise<{ content: string; tags: string[] }> {
  await initOcr(modelsDir);
  if (!_service) {
    return { content: '', tags: ['image'] };
  }

  const result = await _service.recognize(toArrayBuffer(imageBuffer));
  return { content: result.text.trim(), tags: ['image', 'ocr'] };
}

/** Runs PP-OCRv6 on an image file; returns extracted text. */
export async function extractOcr(
  filePath: string,
  modelsDir: string,
): Promise<{ content: string; tags: string[] }> {
  const buf = fs.readFileSync(filePath);
  return extractOcrFromBuffer(buf, modelsDir);
}

/** Release ONNX sessions when the app quits. */
export async function terminateOcr(): Promise<void> {
  if (_service) {
    await _service.destroy();
    _service = null;
  }
}

export { _modelsDir, PADDLE_FILES };
