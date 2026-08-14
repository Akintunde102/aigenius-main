export type DesktopAuthTokenPair = {
  token: string;
  refreshToken: string;
};

const DESKTOP_NATIVE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'x-aigenius-desktop': '1',
} as const;

export async function exchangeDesktopOAuthCode(
  apiRoot: string,
  code: string,
): Promise<DesktopAuthTokenPair | null> {
  const trimmedCode = code.trim();
  if (!trimmedCode) {
    return null;
  }

  const response = await fetch(`${apiRoot.replace(/\/+$/, '')}/auth/_/desktop/exchange`, {
    method: 'POST',
    headers: DESKTOP_NATIVE_HEADERS,
    body: JSON.stringify({ code: trimmedCode }),
  });

  if (!response.ok) {
    console.warn('[aigenius-desktop] OAuth code exchange failed', response.status);
    return null;
  }

  const data = (await response.json()) as { token?: unknown; refreshToken?: unknown };
  if (typeof data.token !== 'string' || typeof data.refreshToken !== 'string') {
    console.warn('[aigenius-desktop] OAuth code exchange response missing tokens');
    return null;
  }

  return {
    token: data.token,
    refreshToken: data.refreshToken,
  };
}
