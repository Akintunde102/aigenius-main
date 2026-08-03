import { exchangeOAuthAccessTokenForSession } from '@/lib/utils/oauth-connection-token';

/**
 * After Google OAuth, the backend redirects with a short-lived JWT (`?token=`).
 * The desktop shell must exchange it for a connection token (API key), same as
 * `AuthenticatedChatPage` does for browser `?token=` URLs.
 */
export async function completeDesktopOAuthSession(oauthAccessToken: string): Promise<boolean> {
  return exchangeOAuthAccessTokenForSession(oauthAccessToken);
}
