
/**
 * Thin wrappers around window.location so tests can mock navigation
 * without fighting jsdom's non-configurable Location object.
 */

/** Navigate to a URL (equivalent to setting window.location.href). */
export const navigateTo = (url: string): void => {
    window.location.assign(url);
};

/** Reload the current page. */
export const reloadPage = (): void => {
    if (typeof window !== 'undefined' && typeof window.location?.reload === 'function') {
        window.location.reload();
        return;
    }
    window.location.assign(window.location.href);
};
