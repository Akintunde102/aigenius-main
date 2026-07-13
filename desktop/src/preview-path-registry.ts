import path from 'path';

const DEFAULT_TTL_MS = 30 * 60 * 1000;

const registered = new Map<string, number>();

function normalizePreviewPath(filePath: string): string {
    const trimmed = filePath.trim();
    if (!trimmed) return '';
    const resolved = path.resolve(trimmed);
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

/** Registers a filesystem path the main process may preview (tool output, not renderer-supplied). */
export function registerPreviewPath(filePath: string, ttlMs = DEFAULT_TTL_MS): void {
    const key = normalizePreviewPath(filePath);
    if (!key) return;
    registered.set(key, Date.now() + ttlMs);
}

export function registerPreviewPaths(paths: Iterable<string>, ttlMs = DEFAULT_TTL_MS): void {
    for (const p of paths) {
        registerPreviewPath(p, ttlMs);
    }
}

export function isPreviewPathRegistered(filePath: string): boolean {
    const key = normalizePreviewPath(filePath);
    if (!key) return false;
    const expiresAt = registered.get(key);
    if (!expiresAt) return false;
    if (Date.now() > expiresAt) {
        registered.delete(key);
        return false;
    }
    return true;
}

/** Test-only */
export function clearPreviewPathRegistryForTests(): void {
    registered.clear();
}
