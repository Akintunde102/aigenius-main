/** App surfaces where a marketing cookie notice feels out of place. */
const HIDDEN_PATH_PREFIXES = [
  '/chat',
  '/workflows',
  '/workflow',
  '/schedules',
  '/notifications',
  '/config',
];

/** Desktop onboarding routes where consent is still collected. */
const DESKTOP_PUBLIC_EXACT_PATHS = new Set([
  '/desktop-login',
  '/desktop-welcome',
  '/desktop-success',
]);

function normalizePathname(pathname: string | null | undefined): string {
  if (!pathname) {
    return '/';
  }

  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }

  return pathname;
}

function pathMatchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export type AnalyticsConsentBannerPathOptions = {
  isAuthenticated?: boolean;
  isDesktop?: boolean;
};

/**
 * Returns true when the cookie banner should be hidden for the current route.
 * Public/marketing pages show the banner until the user accepts or declines.
 */
export function isAnalyticsConsentBannerHiddenPath(
  pathname: string | null | undefined,
  options: AnalyticsConsentBannerPathOptions = {},
): boolean {
  const normalized = normalizePathname(pathname);
  const { isAuthenticated = false, isDesktop = false } = options;

  if (isDesktop) {
    return !DESKTOP_PUBLIC_EXACT_PATHS.has(normalized);
  }

  if (HIDDEN_PATH_PREFIXES.some((prefix) => pathMatchesPrefix(normalized, prefix))) {
    return true;
  }

  // `/` is the marketing homepage when logged out and chat when logged in.
  if (normalized === '/' && isAuthenticated) {
    return true;
  }

  return false;
}

export function shouldShowAnalyticsConsentBanner(
  pathname: string | null | undefined,
  options: AnalyticsConsentBannerPathOptions = {},
): boolean {
  return !isAnalyticsConsentBannerHiddenPath(pathname, options);
}
