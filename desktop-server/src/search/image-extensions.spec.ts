import {
  isImageExtension,
  needsImageDecode,
  formatSupportedImageExtensions,
} from './image-extensions.js';

describe('image-extensions', () => {
  it('accepts heic, heif, and jfif', () => {
    expect(isImageExtension('heic')).toBe(true);
    expect(isImageExtension('HEIF')).toBe(true);
    expect(isImageExtension('jfif')).toBe(true);
  });

  it('marks only heic/heif for decode', () => {
    expect(needsImageDecode('heic')).toBe(true);
    expect(needsImageDecode('heif')).toBe(true);
    expect(needsImageDecode('jfif')).toBe(false);
    expect(needsImageDecode('jpg')).toBe(false);
  });

  it('formats supported extension list for errors', () => {
    expect(formatSupportedImageExtensions()).toContain('heic');
    expect(formatSupportedImageExtensions()).toContain('jfif');
  });
});
