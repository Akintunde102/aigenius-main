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
  const joiner = callback.includes('?') ? '&' : '?';
  return `${callback}${joiner}token=${encodeURIComponent(token)}`;
}
