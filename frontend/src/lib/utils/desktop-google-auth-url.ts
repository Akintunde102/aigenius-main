import { shouldPersistDesktopApiRoot as shouldPersistAuthApiRoot } from '@/lib/utils/legacy-api-roots';

const DESKTOP_API_ROOT_SESSION_KEY = 'desktop_api_root';

/** Ignore legacy desktop default API roots that break Tilt dev OAuth. */
export function shouldPersistDesktopApiRoot(apiRoot: string): boolean {
  return shouldPersistAuthApiRoot(apiRoot);
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
    const trimmed = value?.trim();
    if (!trimmed || !shouldPersistDesktopApiRoot(trimmed)) {
      if (trimmed) {
        sessionStorage.removeItem(DESKTOP_API_ROOT_SESSION_KEY);
      }
      return null;
    }
    return trimmed;
  } catch {
    return null;
  }
}

/** Google OAuth on the hosted API with a loopback callback for the Electron shell. */
export function buildDesktopGoogleOAuthUrl(apiRoot: string, desktopCallback: string, pkceChallenge?: string | null): string {
  const root = apiRoot.trim().replace(/\/+$/, '');
  const params = new URLSearchParams({
    callback_url: desktopCallback,
    callback_client: 'desktop',
  });
  if (pkceChallenge) {
    params.append('pkce_challenge', pkceChallenge);
  }
  return `${root}/auth/_/google?${params.toString()}`;
}

export function resolveDesktopGoogleOAuthUrl(
  desktopCallback: string,
  fallbackApiRoot: string,
  pkceChallenge?: string | null,
): string {
  const stored = readStoredDesktopApiRoot();
  const apiRoot = stored || fallbackApiRoot;
  return buildDesktopGoogleOAuthUrl(apiRoot, desktopCallback, pkceChallenge);
}
