/**
 * Normalizes axios response bodies from the Nest API / desktop mini-server proxy.
 * Handles JSON strings and single-key `{ data: T }` envelopes (e.g. model catalog).
 */
export function normalizeServerResponseBody(body: unknown): unknown {
    if (body == null) {
        return body;
    }

    if (typeof body === 'string') {
        const trimmed = body.trim();
        if (!trimmed) {
            return body;
        }
        try {
            return normalizeServerResponseBody(JSON.parse(trimmed));
        } catch {
            return body;
        }
    }

    if (typeof body === 'object' && !Array.isArray(body)) {
        const keys = Object.keys(body as object);
        if (keys.length === 1 && keys[0] === 'data') {
            return (body as { data: unknown }).data;
        }
    }

    return body;
}

export function isSuccessfulServerResponseBody(body: unknown): boolean {
    const normalized = normalizeServerResponseBody(body);
    if (normalized === undefined || normalized === null || normalized === '') {
        return false;
    }
    if (typeof normalized === 'string') {
        const trimmed = normalized.trim();
        if (!trimmed || trimmed.startsWith('<')) {
            return false;
        }
        try {
            JSON.parse(trimmed);
            return true;
        } catch {
            return false;
        }
    }
    return true;
}
