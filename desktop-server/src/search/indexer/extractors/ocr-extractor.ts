import fs from 'fs';
import path from 'path';
import { PaddleOcrService, V6_SMALL_MODEL, type ModelPathOptions } from 'ppu-paddle-ocr';

let _service: PaddleOcrService | null = null;
let _modelsDir = '';

const PADDLE_FILES = {
  detection: 'PP-OCRv6_small_det.ort',
  recognition: 'PP-OCRv6_small_rec.ort',
  charactersDictionary: 'ppocrv6_dict.txt',
} as const;

function resolvePaddleModelPaths(modelsDir: string): ModelPathOptions {
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

  return V6_SMALL_MODEL;
}

/** Must be called before first extraction; idempotent. */
export async function initOcr(modelsDir: string): Promise<void> {
  if (_service?.isInitialized()) return;
  _modelsDir = modelsDir;

  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  _service = new PaddleOcrService({ model: resolvePaddleModelPaths(modelsDir) });
  await _service.initialize();
}

/** Runs PP-OCRv6 on an image file; returns extracted text. */
export async function extractOcr(
  filePath: string,
  modelsDir: string,
): Promise<{ content: string; tags: string[] }> {
  await initOcr(modelsDir);
  const buf = fs.readFileSync(filePath);
  const imageBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  const result = await _service!.recognize(imageBuffer);
  return { content: result.text.trim(), tags: ['image', 'ocr'] };
}

/** Release ONNX sessions when the app quits. */
export async function terminateOcr(): Promise<void> {
  if (_service) {
    await _service.destroy();
    _service = null;
  }
}

export { _modelsDir, PADDLE_FILES };
