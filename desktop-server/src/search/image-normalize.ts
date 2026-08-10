import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { randomBytes } from 'crypto';
import sharp from 'sharp';
import {
  imageExtensionFromPath,
  needsImageDecode,
} from './image-extensions.js';

export type PreparedImage = {
  filePath: string;
  cleanup: () => Promise<void>;
};

/**
 * HEIC/HEIF must be decoded before PaddleOCR / ONNX pipelines (they expect raster bytes).
 * JFIF and other supported types are passed through unchanged.
 */
export async function prepareImageForAnalysis(filePath: string): Promise<PreparedImage> {
  const ext = imageExtensionFromPath(filePath);
  if (!needsImageDecode(ext)) {
    return { filePath, cleanup: async () => undefined };
  }

  const tmpPath = path.join(
    os.tmpdir(),
    `aigenius-decode-${randomBytes(8).toString('hex')}.png`,
  );

  try {
    await sharp(filePath).png().toFile(tmpPath);
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to decode ${ext} image for analysis (${detail}). Ensure libvips HEIF support is available in sharp.`,
    );
  }

  return {
    filePath: tmpPath,
    cleanup: async () => {
      await fs.unlink(tmpPath).catch(() => undefined);
    },
  };
}
