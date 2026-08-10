/** Image extensions handled by OCR + object tagging (lowercase, no dot). */
export const IMAGE_EXTENSIONS = new Set([
  'jpg',
  'jpeg',
  'jfif',
  'png',
  'webp',
  'bmp',
  'tiff',
  'tif',
  'heic',
  'heif',
]);

/** Extensions that need decode to PNG/JPEG before OCR (raw bytes are not JPEG/PNG). */
export const IMAGE_DECODE_EXTENSIONS = new Set(['heic', 'heif']);

export function isImageExtension(ext: string): boolean {
  return IMAGE_EXTENSIONS.has(ext.toLowerCase().replace(/^\./, ''));
}

export function needsImageDecode(ext: string): boolean {
  return IMAGE_DECODE_EXTENSIONS.has(ext.toLowerCase().replace(/^\./, ''));
}

export function imageExtensionFromPath(filePath: string): string {
  const dot = filePath.lastIndexOf('.');
  if (dot < 0) return '';
  return filePath.slice(dot + 1).toLowerCase();
}

export function formatSupportedImageExtensions(): string {
  return [...IMAGE_EXTENSIONS].sort().join(', ');
}
