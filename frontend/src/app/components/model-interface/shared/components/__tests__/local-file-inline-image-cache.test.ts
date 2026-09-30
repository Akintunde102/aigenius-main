import {
    clearLocalFileImageCacheForTests,
    fingerprintLocalFileImageBase64,
    getCachedLocalFileImageUrl,
    releaseCachedLocalFileImageUrl,
    retainCachedLocalFileImageUrl,
} from '../local-file-inline-image-cache';

describe('local-file-inline-image-cache', () => {
    afterEach(() => {
        clearLocalFileImageCacheForTests();
    });

    it('retains and releases cached blob URLs by path', () => {
        const fp = fingerprintLocalFileImageBase64('abc');
        retainCachedLocalFileImageUrl('/tmp/a.png', 'blob:one', fp);
        expect(getCachedLocalFileImageUrl('/tmp/a.png', fp)).toBe('blob:one');

        retainCachedLocalFileImageUrl('/tmp/a.png', 'blob:one', fp);
        releaseCachedLocalFileImageUrl('/tmp/a.png');
        expect(getCachedLocalFileImageUrl('/tmp/a.png', fp)).toBe('blob:one');

        releaseCachedLocalFileImageUrl('/tmp/a.png');
        expect(getCachedLocalFileImageUrl('/tmp/a.png', fp)).toBeNull();
    });

    it('treats cache as stale when file fingerprint changes', () => {
        const fpOld = fingerprintLocalFileImageBase64('old');
        retainCachedLocalFileImageUrl('/tmp/a.png', 'blob:old', fpOld);
        expect(getCachedLocalFileImageUrl('/tmp/a.png', fpOld)).toBe('blob:old');

        const fpNew = fingerprintLocalFileImageBase64('new');
        expect(getCachedLocalFileImageUrl('/tmp/a.png', fpNew)).toBeNull();
    });
});
