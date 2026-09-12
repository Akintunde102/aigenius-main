import { shouldPersistDesktopApiRoot as shouldPersistAuthApiRoot } from '@/lib/utils/legacy-api-roots';

const DESKTOP_API_ROOT_SESSION_KEY = 'desktop_api_root';
export const DESKTOP_CALLBACK_SESSION_KEY = 'desktop_callback';
export const DESKTOP_PKCE_CHALLENGE_SESSION_KEY = 'desktop_pkce_challenge';

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

export function storeDesktopHandoffSession(args: {
  callback: string;
  pkceChallenge?: string | null;
}): void {
  const callback = args.callback.trim();
  if (!callback) {
    return;
  }
  sessionStorage.setItem(DESKTOP_CALLBACK_SESSION_KEY, callback);
  const challenge = args.pkceChallenge?.trim();
  if (challenge) {
    sessionStorage.setItem(DESKTOP_PKCE_CHALLENGE_SESSION_KEY, challenge);
  } else {
    sessionStorage.removeItem(DESKTOP_PKCE_CHALLENGE_SESSION_KEY);
  }
}

export function readStoredDesktopCallback(): string | null {
  try {
    const value = sessionStorage.getItem(DESKTOP_CALLBACK_SESSION_KEY);
    const trimmed = value?.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

export function readStoredDesktopPkceChallenge(): string | null {
  try {
    const value = sessionStorage.getItem(DESKTOP_PKCE_CHALLENGE_SESSION_KEY);
    const trimmed = value?.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

export function clearDesktopHandoffSession(): void {
  try {
    sessionStorage.removeItem(DESKTOP_CALLBACK_SESSION_KEY);
    sessionStorage.removeItem(DESKTOP_PKCE_CHALLENGE_SESSION_KEY);
  } catch {
    /* ignore */
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
