import { exchangeOAuthAccessTokenForSession } from '@/lib/utils/oauth-connection-token';

/**
 * After Google OAuth, the desktop shell receives a one-time code on loopback and exchanges it
 * in the Electron main process for access + refresh tokens (refresh stored in OS keychain).
 * This helper persists the short-lived access JWT and connection token in the renderer.
 */
export async function completeDesktopOAuthSession(oauthAccessToken: string): Promise<boolean> {
  return exchangeOAuthAccessTokenForSession(oauthAccessToken);
}
