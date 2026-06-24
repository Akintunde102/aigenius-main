/**
 * Validates postMessage `event.origin` for integration OAuth popups.
 * Allows strict match and localhost ↔ 127.0.0.1 when the port matches (common dev mismatch vs FRONTEND_URL).
 */
export function isIntegrationCallbackOriginTrusted(eventOrigin: string, windowOrigin: string): boolean {
    if (eventOrigin === windowOrigin) return true;
    try {
        const a = new URL(eventOrigin);
        const b = new URL(windowOrigin);
        if (a.protocol !== b.protocol || a.port !== b.port) return false;
        if (a.hostname === b.hostname) return true;
        const loopbackPair =
            (a.hostname === 'localhost' && b.hostname === '127.0.0.1') ||
            (a.hostname === '127.0.0.1' && b.hostname === 'localhost');
        return loopbackPair;
    } catch {
        return false;
    }
}
