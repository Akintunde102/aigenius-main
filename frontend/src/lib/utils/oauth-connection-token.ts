import axios from 'axios';
import { LINKS } from '@/lib/links';
import { clearUserDetailsCache } from '@/lib/calls/get-logged-user-details';
import { clearModelsCache } from '@/app/components/model-interface/features/models/hooks/useModelData';
import { setAuthSessionTokens, syncAuthSessionCookiesFromStorage } from '@/lib/utils/auth-session';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';

/** Parse `GET /auth/_/connection_token` bodies (flat or nested `data.token`). */
export function parseConnectionTokenFromResponse(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const record = data as Record<string, unknown>;
  const direct = record.token;
  if (typeof direct === 'string' && direct.trim().length > 0) {
    return direct.trim();
  }

  const nested = record.data;
  if (nested && typeof nested === 'object') {
    const nestedToken = (nested as Record<string, unknown>).token;
    if (typeof nestedToken === 'string' && nestedToken.trim().length > 0) {
      return nestedToken.trim();
    }
  }

  return null;
}

async function resolveConnectionTokenApiBases(): Promise<string[]> {
  const local = LINKS.noboxAPIRootUrl.replace(/\/+$/, '');
  const bases = new Set<string>([local]);

  if (typeof window !== 'undefined' && isAigeniusDesktopRuntime()) {
    try {
      const upstream = (await window.aigeniusDesktop?.getUpstreamApiUrl?.())?.trim();
      if (upstream) {
        bases.add(upstream.replace(/\/+$/, ''));
      }
    } catch {
      /* ignore */
    }
  }

  // Prefer Railway/upstream first on desktop — JWT was minted there; mini-server proxy can lag on cold start.
  return Array.from(bases).sort((a, b) => {
    const aLocal = a.includes('127.0.0.1') || a.includes('localhost');
    const bLocal = b.includes('127.0.0.1') || b.includes('localhost');
    if (aLocal === bLocal) {
      return 0;
    }
    return aLocal ? 1 : -1;
  });
}

async function requestConnectionToken(
  apiBase: string,
  oauthAccessToken: string,
): Promise<string | null> {
  const response = await axios.get(`${apiBase}/auth/_/connection_token`, {
    headers: {
      Authorization: `Bearer ${oauthAccessToken}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    withCredentials: true,
    timeout: 20_000,
  });

  return parseConnectionTokenFromResponse(response.data);
}

/**
 * Exchange the short-lived OAuth JWT (`?token=` / desktop loopback) for a connection token,
 * persist both tokens, and mirror them into cookies for Next middleware.
 */
export async function exchangeOAuthAccessTokenForSession(
  oauthAccessToken: string,
): Promise<boolean> {
  const trimmed = oauthAccessToken.trim();
  if (!trimmed) {
    return false;
  }

  const apiBases = await resolveConnectionTokenApiBases();
  let lastError: unknown;

  for (const apiBase of apiBases) {
    try {
      const clientToken = await requestConnectionToken(apiBase, trimmed);
      if (!clientToken) {
        console.error('[oauth] connection_token response missing token field', { apiBase });
        continue;
      }

      setAuthSessionTokens({
        authToken: trimmed,
        clientToken,
      });
      clearModelsCache();
      clearUserDetailsCache();
      syncAuthSessionCookiesFromStorage();
      return true;
    } catch (error) {
      lastError = error;
      console.warn('[oauth] connection_token failed via', apiBase, error);
    }
  }

  console.error('[oauth] Failed to exchange OAuth token for connection token', lastError);
  return false;
}
