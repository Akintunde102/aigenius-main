/** Image extensions handled by local_read_image (lowercase, no dot). Keep in sync with desktop-server. */
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

export function isImageExtension(ext: string): boolean {
  return IMAGE_EXTENSIONS.has(ext.toLowerCase().replace(/^\./, ''));
}

export function formatSupportedImageExtensions(): string {
  return [...IMAGE_EXTENSIONS].sort().join(', ');
}
