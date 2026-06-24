/**
 * Next.js dynamic-route chunks are stored with encoded brackets (`%5Bid%5D`), but some
 * runtimes (notably Windows dev / Electron) request them double-encoded (`%255Bid%255D`).
 * Rewrite to the canonical single-encoded form so ChunkLoadError does not break navigation.
 */
export function normalizeNextStaticChunkPath(pathname: string): string | null {
    if (!pathname.startsWith('/_next/static/')) {
        return null;
    }

    let normalized = pathname;

    if (/%25(?:5B|5D|28|29)/i.test(normalized)) {
        normalized = normalized
            .replace(/%255B/gi, '%5B')
            .replace(/%255D/gi, '%5D')
            .replace(/%2528/gi, '%28')
            .replace(/%2529/gi, '%29');
    }

    if (/%5[bd]/i.test(normalized)) {
        normalized = normalized.replace(/%5b/g, '%5B').replace(/%5d/g, '%5D');
    }

    // Some runtimes decode dynamic segment brackets to literals before the static handler runs.
    if (/[[\]]/.test(normalized)) {
        normalized = normalized.replace(/\[/g, '%5B').replace(/\]/g, '%5D');
    }

    return normalized === pathname ? null : normalized;
}
