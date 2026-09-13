export type DesktopHandoffQuery = {
  callback: string;
  pkceChallenge: string | null;
  apiRoot: string | null;
  autoGoogle: boolean;
};

export type ParsedLoginDesktopHandoff =
  | { kind: 'plain_web' }
  | { kind: 'desktop'; handoff: DesktopHandoffQuery };

/** Parse desktop shell query params on `/login` opened from the Electron browser handoff. */
export function parseLoginDesktopHandoffSearch(search: string): ParsedLoginDesktopHandoff {
  const params = new URLSearchParams(search);
  const callback = params.get('desktop_callback')?.trim();
  if (!callback) {
    return { kind: 'plain_web' };
  }

  const pkceChallenge = params.get('pkce_challenge')?.trim() || null;
  const apiRoot = params.get('api_root')?.trim() || null;

  return {
    kind: 'desktop',
    handoff: {
      callback,
      pkceChallenge,
      apiRoot,
      autoGoogle: params.get('auto') === 'google',
    },
  };
}

/** Loopback HTTP only — same allowlist as the API desktop OAuth callback. */
export function isDesktopLoopbackCallbackUrl(callbackUrl: string): boolean {
  try {
    const parsed = new URL(callbackUrl);
    if (parsed.protocol !== 'http:') {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    return host === '127.0.0.1' || host === 'localhost' || host === '[::1]' || host === '::1';
  } catch {
    return false;
  }
}

/**
 * Authenticated users are normally bounced off `/login`. Keep the page when the desktop app
 * opened the system browser with a loopback callback so we can send them to Google instead of
 * dumping them into the already-signed-in web app.
 */
export function shouldKeepAuthenticatedAuthPageForDesktopHandoff(
  pathname: string,
  search: string,
): boolean {
  if (pathname !== '/login' && pathname !== '/signup') {
    return false;
  }
  const parsed = parseLoginDesktopHandoffSearch(search);
  if (parsed.kind !== 'desktop') {
    return false;
  }
  return isDesktopLoopbackCallbackUrl(parsed.handoff.callback);
}

/** Desktop `/login` handoff should skip the auth form and open Google immediately. */
export function shouldAutoStartDesktopGoogleOAuth(search: string): boolean {
  const parsed = parseLoginDesktopHandoffSearch(search);
  return parsed.kind === 'desktop' && isDesktopLoopbackCallbackUrl(parsed.handoff.callback);
}

/**
 * When the API redirects a web OAuth success with `?token=`, only forward to the desktop loopback
 * when the redirect is explicitly marked for the shell. Prevents stale session keys from hijacking
 * normal web sign-in.
 */
export function resolveOAuthTokenDesktopHandoffRedirect(args: {
  token: string | null;
  callbackClient: string | null;
  desktopCallback: string | null;
}): string | null {
  const { token, callbackClient, desktopCallback } = args;
  if (!token || callbackClient !== 'desktop' || !desktopCallback?.trim()) {
    return null;
  }

  const callback = desktopCallback.trim();
  if (!isDesktopLoopbackCallbackUrl(callback)) {
    return null;
  }
  const joiner = callback.includes('?') ? '&' : '?';
  return `${callback}${joiner}token=${encodeURIComponent(token)}`;
}
