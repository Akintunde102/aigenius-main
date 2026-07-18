import path from 'path';

const DEFAULT_TTL_MS = 30 * 60 * 1000;
/** Sweep expired entries every N registrations to avoid unbounded stale keys. */
const PRUNE_EVERY_N_REGISTRATIONS = 32;

const registered = new Map<string, number>();
let registrationsSinceLastPrune = 0;

function normalizePreviewPath(filePath: string): string {
    const trimmed = filePath.trim();
    if (!trimmed) return '';
    const resolved = path.resolve(trimmed);
    return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

function pruneExpiredPreviewPaths(now = Date.now()): void {
    for (const [key, expiresAt] of registered) {
        if (now > expiresAt) {
            registered.delete(key);
        }
    }
}

function maybePruneExpiredPreviewPaths(): void {
    registrationsSinceLastPrune += 1;
    if (registrationsSinceLastPrune < PRUNE_EVERY_N_REGISTRATIONS) {
        return;
    }
    registrationsSinceLastPrune = 0;
    pruneExpiredPreviewPaths();
}

/** Registers a filesystem path the main process may preview (tool output, not renderer-supplied). */
export function registerPreviewPath(filePath: string, ttlMs = DEFAULT_TTL_MS): void {
    const trimmed = filePath.trim();
    if (!trimmed || !path.isAbsolute(trimmed)) return;
    const key = normalizePreviewPath(trimmed);
    if (!key) return;
    registered.set(key, Date.now() + ttlMs);
    maybePruneExpiredPreviewPaths();
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
    registrationsSinceLastPrune = 0;
}
