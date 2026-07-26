import { formatPreviewError } from '../FilePreviewUnavailable';

describe('formatPreviewError', () => {
    it('returns a calm binary-file message for unsupported types', () => {
        const result = formatPreviewError(
            'Failed to read file: Error: unsupported file type – C:\\Downloads\\ChromeSetup.exe (binary)',
            'ChromeSetup.exe',
        );

        expect(result.title).toBe("Can't preview this file type");
        expect(result.detail).toContain('ChromeSetup.exe');
        expect(result.hint).toContain('default app');
    });

    it('strips noisy prefixes from read failures', () => {
        const result = formatPreviewError('Failed to read file: Error: permission denied');

        expect(result.title).toBe("Couldn't load this file");
        expect(result.detail).toBe('permission denied');
    });

    it('falls back to the raw error for unknown failures', () => {
        const result = formatPreviewError('Something unexpected happened');

        expect(result.title).toBe('Preview unavailable');
        expect(result.detail).toBe('Something unexpected happened');
    });
});
