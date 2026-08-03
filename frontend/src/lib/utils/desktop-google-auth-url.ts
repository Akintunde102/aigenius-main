const DESKTOP_API_ROOT_SESSION_KEY = 'desktop_api_root';

export function storeDesktopApiRoot(apiRoot: string): void {
  const trimmed = apiRoot.trim().replace(/\/+$/, '');
  if (trimmed) {
    sessionStorage.setItem(DESKTOP_API_ROOT_SESSION_KEY, trimmed);
  }
}

export function readStoredDesktopApiRoot(): string | null {
  try {
    const value = sessionStorage.getItem(DESKTOP_API_ROOT_SESSION_KEY);
    return value?.trim() ? value.trim() : null;
  } catch {
    return null;
  }
}

/** Google OAuth on the hosted API with a loopback callback for the Electron shell. */
export function buildDesktopGoogleOAuthUrl(apiRoot: string, desktopCallback: string): string {
  const root = apiRoot.trim().replace(/\/+$/, '');
  const params = new URLSearchParams({
    callback_url: desktopCallback,
    callback_client: 'desktop',
  });
  return `${root}/auth/_/google?${params.toString()}`;
}

export function resolveDesktopGoogleOAuthUrl(
  desktopCallback: string,
  fallbackApiRoot: string,
): string {
  const apiRoot = readStoredDesktopApiRoot() || fallbackApiRoot;
  return buildDesktopGoogleOAuthUrl(apiRoot, desktopCallback);
}
