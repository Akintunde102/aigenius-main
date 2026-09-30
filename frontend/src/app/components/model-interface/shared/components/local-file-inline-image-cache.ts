type CachedImage = {
    objectUrl: string;
    refCount: number;
    fingerprint: string;
};

const cache = new Map<string, CachedImage>();

/** Cheap fingerprint so cache entries invalidate when file bytes change. */
export function fingerprintLocalFileImageBase64(base64: string): string {
    if (!base64) return '0';
    const len = base64.length;
    if (len <= 128) return `${len}:${base64}`;
    return `${len}:${base64.slice(0, 64)}:${base64.slice(-64)}`;
}

export function getCachedLocalFileImageUrl(path: string, fingerprint?: string): string | null {
    const entry = cache.get(path);
    if (!entry) return null;
    if (fingerprint && entry.fingerprint !== fingerprint) return null;
    return entry.objectUrl;
}

export function retainCachedLocalFileImageUrl(
    path: string,
    objectUrl: string,
    fingerprint: string,
): void {
    const existing = cache.get(path);
    if (existing) {
        if (existing.objectUrl !== objectUrl) {
            if (typeof URL.revokeObjectURL === 'function') {
                URL.revokeObjectURL(existing.objectUrl);
            }
            existing.objectUrl = objectUrl;
            existing.fingerprint = fingerprint;
        }
        existing.refCount += 1;
        return;
    }
    cache.set(path, { objectUrl, refCount: 1, fingerprint });
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
