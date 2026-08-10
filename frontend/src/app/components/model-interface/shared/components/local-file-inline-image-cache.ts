type CachedImage = {
    objectUrl: string;
    refCount: number;
};

const cache = new Map<string, CachedImage>();

export function getCachedLocalFileImageUrl(path: string): string | null {
    return cache.get(path)?.objectUrl ?? null;
}

export function retainCachedLocalFileImageUrl(path: string, objectUrl: string): void {
    const existing = cache.get(path);
    if (existing) {
        if (existing.objectUrl !== objectUrl) {
            if (typeof URL.revokeObjectURL === 'function') {
                URL.revokeObjectURL(existing.objectUrl);
            }
            existing.objectUrl = objectUrl;
        }
        existing.refCount += 1;
        return;
    }
    cache.set(path, { objectUrl, refCount: 1 });
}

export function releaseCachedLocalFileImageUrl(path: string): void {
    const entry = cache.get(path);
    if (!entry) return;
    entry.refCount -= 1;
    if (entry.refCount <= 0) {
        if (typeof URL.revokeObjectURL === 'function') {
            URL.revokeObjectURL(entry.objectUrl);
        }
        cache.delete(path);
    }
}

/** @internal Test helper */
export function clearLocalFileImageCacheForTests(): void {
    if (typeof URL.revokeObjectURL === 'function') {
        for (const entry of Array.from(cache.values())) {
            URL.revokeObjectURL(entry.objectUrl);
        }
    }
    cache.clear();
}
