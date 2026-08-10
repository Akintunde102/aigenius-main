import {
    clearLocalFileImageCacheForTests,
    getCachedLocalFileImageUrl,
    releaseCachedLocalFileImageUrl,
    retainCachedLocalFileImageUrl,
} from '../local-file-inline-image-cache';

describe('local-file-inline-image-cache', () => {
    afterEach(() => {
        clearLocalFileImageCacheForTests();
    });

    it('retains and releases cached blob URLs by path', () => {
        retainCachedLocalFileImageUrl('/tmp/a.png', 'blob:one');
        expect(getCachedLocalFileImageUrl('/tmp/a.png')).toBe('blob:one');

        retainCachedLocalFileImageUrl('/tmp/a.png', 'blob:one');
        releaseCachedLocalFileImageUrl('/tmp/a.png');
        expect(getCachedLocalFileImageUrl('/tmp/a.png')).toBe('blob:one');

        releaseCachedLocalFileImageUrl('/tmp/a.png');
        expect(getCachedLocalFileImageUrl('/tmp/a.png')).toBeNull();
    });
});
