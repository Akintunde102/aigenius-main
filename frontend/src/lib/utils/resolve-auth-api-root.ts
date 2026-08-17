import { LINKS } from '@/lib/links';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';
import { readStoredDesktopApiRoot } from '@/lib/utils/desktop-google-auth-url';
import { isLegacyOrSidecarApiRoot, normalizeApiRootUrl } from '@/lib/utils/legacy-api-roots';

function pickAuthApiRoot(candidates: Array<string | null | undefined>): string {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (!trimmed || isLegacyOrSidecarApiRoot(trimmed)) {
      continue;
    }
    return normalizeApiRootUrl(trimmed);
  }

  const fallback = LINKS.noboxAPIRootUrl?.trim();
  return fallback ? normalizeApiRootUrl(fallback) : '';
}

/**
 * Nest API base URL for OAuth and other `/auth/_/*` routes.
 * Never use the desktop sidecar mini-server port (legacy 8001 / Tilt 28001).
 */
export function resolveAuthApiRootUrl(): string {
  const upstream = process.env.NEXT_PUBLIC_DESKTOP_UPSTREAM_API_URL?.trim();
  const envRoot = process.env.NEXT_PUBLIC_NOBOX_API_ROOT_URL?.trim();
  const stored = readStoredDesktopApiRoot();

  return pickAuthApiRoot([upstream, stored, envRoot, LINKS.noboxAPIRootUrl]);
}

export async function resolveAuthApiRootUrlAsync(): Promise<string> {
  if (typeof window !== 'undefined' && isAigeniusDesktopRuntime()) {
    try {
      const fromDesktop = (await window.aigeniusDesktop?.getUpstreamApiUrl?.())?.trim();
      const resolved = pickAuthApiRoot([
        fromDesktop,
        process.env.NEXT_PUBLIC_DESKTOP_UPSTREAM_API_URL,
        readStoredDesktopApiRoot(),
        process.env.NEXT_PUBLIC_NOBOX_API_ROOT_URL,
        LINKS.noboxAPIRootUrl,
      ]);
      if (resolved) {
        return resolved;
      }
    } catch {
      /* fall through */
    }
  }

  return resolveAuthApiRootUrl();
}

export function buildGoogleAuthUrl(apiRoot: string): string {
  const root = normalizeApiRootUrl(apiRoot);
  return root ? `${root}/auth/_/google` : '';
}

export function buildDevLoginUrl(apiRoot: string): string {
  const root = normalizeApiRootUrl(apiRoot);
  return root ? `${root}/auth/_/dev-login` : '';
}
