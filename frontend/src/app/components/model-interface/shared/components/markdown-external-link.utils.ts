export type ExternalLinkPreview = {
    host: string;
    url: string;
};

/** http(s) destinations that should leave the app. Returns null for in-app and unsafe URLs. */
export function externalLinkPreview(href: string): ExternalLinkPreview | null {
    const trimmed = href.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
        return null;
    }
    let parsed: URL;
    try {
        parsed = new URL(trimmed);
    } catch {
        return null;
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return null;
    }
    if (!parsed.hostname) {
        return null;
    }
    return {
        host: parsed.hostname,
        url: trimmed,
    };
}

/** Opens a model-generated http(s) link in the OS browser, or a new tab on the web. */
export function openModelGeneratedLink(href: string): void {
    if (typeof window === 'undefined') {
        return;
    }
    const desktop = window.aigeniusDesktop;
    if (desktop?.isDesktop) {
        const openInBrowser =
            desktop.openClickedHttpUrl ?? desktop.openExternalUrl ?? desktop.openExternal;
        if (typeof openInBrowser === 'function') {
            void openInBrowser(href);
            return;
        }
    }
    window.open(href, '_blank', 'noopener,noreferrer');
}
