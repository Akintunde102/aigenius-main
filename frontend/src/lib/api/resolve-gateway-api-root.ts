import { LINKS } from '@/lib/links';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';

let cachedUpstream: string | null = null;
let inflightUpstream: Promise<string | null> | null = null;

export function getLocalMiniServerApiRootUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_NOBOX_API_ROOT_URL?.trim();
  const base = fromEnv || LINKS.noboxAPIRootUrl || '';
  return base.replace(/\/+$/, '');
}

function readBakedDesktopUpstreamUrl(): string | null {
  const baked = process.env.NEXT_PUBLIC_DESKTOP_UPSTREAM_API_URL?.trim();
  return baked ? baked.replace(/\/+$/, '') : null;
}

/**
 * Resolves the hosted API base URL for the desktop shell (Railway / production).
 * Order: IPC from Electron main → build-time `NEXT_PUBLIC_DESKTOP_UPSTREAM_API_URL`.
 */
export async function resolveDesktopUpstreamApiRootUrl(): Promise<string | null> {
  if (cachedUpstream) {
    return cachedUpstream;
  }

  if (inflightUpstream) {
    return inflightUpstream;
  }

  inflightUpstream = (async () => {
    if (typeof window !== 'undefined' && isAigeniusDesktopRuntime()) {
      try {
        const upstream = (await window.aigeniusDesktop?.getUpstreamApiUrl?.())?.trim();
        if (upstream && upstream !== 'http://localhost:8000') {
          cachedUpstream = upstream.replace(/\/+$/, '');
          return cachedUpstream;
        }
      } catch {
        /* fall through to baked URL */
      }
    }

    const baked = readBakedDesktopUpstreamUrl();
    if (baked && baked !== 'http://localhost:8000') {
      cachedUpstream = baked;
      return cachedUpstream;
    }

    return null;
  })().finally(() => {
    inflightUpstream = null;
  });

  return inflightUpstream;
}

/** Warm the upstream cache before the first gateway call (desktop shell). */
export function primeDesktopGatewayApiRoot(): Promise<string | null> {
  if (!isAigeniusDesktopRuntime()) {
    return Promise.resolve(null);
  }
  return resolveDesktopUpstreamApiRootUrl();
}

export function resolveGatewayApiRootUrlSync(): string {
  return cachedUpstream || getLocalMiniServerApiRootUrl();
}

/** Preferred API root for browser `fetch` / SSE on desktop (upstream first). */
export async function resolveGatewayApiRootUrl(): Promise<string> {
  const candidates = await resolveGatewayApiBaseCandidates();
  return candidates[0] ?? getLocalMiniServerApiRootUrl();
}

/**
 * API bases to try for gateway traffic. On desktop, prefer the hosted upstream
 * so requests work even when the local mini-server proxy is misconfigured.
 */
export async function resolveGatewayApiBaseCandidates(): Promise<string[]> {
  const local = getLocalMiniServerApiRootUrl();

  if (!isAigeniusDesktopRuntime()) {
    return local ? [local] : [];
  }

  const upstream = await resolveDesktopUpstreamApiRootUrl();
  if (upstream && upstream !== local) {
    return [upstream, local];
  }

  return local ? [local] : [];
}

export function isDesktopProxyFailure(error: unknown): boolean {
  if (typeof error === 'string' && error === 'Desktop proxy failed') {
    return true;
  }

  const response = (error as { response?: { status?: number; data?: { error?: string } } })?.response;
  return response?.status === 502 && response?.data?.error === 'Desktop proxy failed';
}
