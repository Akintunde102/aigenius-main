const DESKTOP_API_ROOT_SESSION_KEY = 'desktop_api_root';

/** Ignore legacy desktop default API roots that break Tilt dev OAuth. */
export function shouldPersistDesktopApiRoot(apiRoot: string): boolean {
  const trimmed = apiRoot.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return false;
  }
  return trimmed !== 'http://localhost:8000' && trimmed !== 'http://127.0.0.1:8000';
}

export function storeDesktopApiRoot(apiRoot: string): void {
  if (!shouldPersistDesktopApiRoot(apiRoot)) {
    return;
  }
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
