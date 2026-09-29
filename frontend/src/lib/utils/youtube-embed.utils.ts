function isYoutubeHostname(hostname: string): boolean {
    const host = hostname.toLowerCase();
    return host === 'youtu.be' || host === 'youtube.com' || host === 'www.youtube.com' || host === 'm.youtube.com';
}

/** Extract an 11-char YouTube video id from common watch / short / embed URLs. */
export function extractYoutubeVideoId(url: string): string | null {
    if (!url?.trim()) {
        return null;
    }

    let parsed: URL;
    try {
        parsed = new URL(url.trim());
    } catch {
        return null;
    }

    const normalizedHost = parsed.hostname.toLowerCase();

    if (normalizedHost === 'youtu.be') {
        const id = parsed.pathname.replace(/^\//, '').split('/')[0];
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (!isYoutubeHostname(normalizedHost)) {
        return null;
    }

    if (parsed.pathname === '/watch' || parsed.pathname.startsWith('/watch/')) {
        const id = parsed.searchParams.get('v');
        return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    const pathMatch = parsed.pathname.match(/^\/(?:embed|shorts|live|v)\/([a-zA-Z0-9_-]{11})/);
    if (pathMatch?.[1]) {
        return pathMatch[1];
    }

    return null;
}

export function isYoutubeWatchUrl(url: string): boolean {
    return extractYoutubeVideoId(url) !== null;
}

/** Still frame for the inline preview. hqdefault exists for every public video. */
export function youtubePosterUrl(videoId: string): string {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function buildYoutubeEmbedUrl(
    videoId: string,
    options?: { autoplay?: boolean; origin?: string },
): string {
    const url = new URL(`https://www.youtube-nocookie.com/embed/${videoId}`);
    if (options?.autoplay) {
        url.searchParams.set('autoplay', '1');
    }
    if (options?.origin) {
        url.searchParams.set('origin', options.origin);
    }
    return url.toString();
}

function normalizeUrlForCompare(raw: string): string {
    try {
        const u = new URL(raw.trim());
        u.hash = '';
        return u.toString().replace(/\/$/, '');
    } catch {
        return raw.trim();
    }
}

const PREVIEW_LINK_LABEL_RE = /^(preview|watch(\s+video)?|video|▶|▶️)$/i;

/** True when a markdown link should render as an inline player (not a plain tab link). */
export function shouldEmbedYoutubeMarkdownLink(href: string, linkText: string): boolean {
    if (!isYoutubeWatchUrl(href)) {
        return false;
    }
    const text = linkText.trim();
    if (!text) {
        return true;
    }
    if (PREVIEW_LINK_LABEL_RE.test(text)) {
        return true;
    }
    if (normalizeUrlForCompare(text) === normalizeUrlForCompare(href)) {
        return true;
    }
    const hrefId = extractYoutubeVideoId(href);
    const textId = extractYoutubeVideoId(text);
    return Boolean(hrefId && textId && hrefId === textId);
}
