export type WebFetchParsedResult = {
  success?: boolean;
  type?: string;
  url?: string;
  finalUrl?: string;
  title?: string | null;
  description?: string | null;
  preview?: string;
  content?: string;
  result?: string;
  warnings?: string[];
  cacheHit?: boolean;
  durationMs?: number;
  bytes?: number;
  code?: number;
  error?: string;
  codeText?: string;
};

export type WebFetchLink = {
  text: string;
  href: string;
};

export function parseWebFetchResult(result?: string): WebFetchParsedResult | null {
  if (!result) return null;
  try {
    return JSON.parse(result) as WebFetchParsedResult;
  } catch {
    return null;
  }
}

export function hostnameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function faviconUrlForHost(hostname: string): string {
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=32`;
}

export function webFetchLoadingPhase(loading: boolean, hasResult: boolean): string {
  if (!loading) return 'done';
  return hasResult ? 'extracting' : 'fetching';
}

export function webFetchLoadingLabel(args?: Record<string, unknown>, phase?: string): string {
  const url = typeof args?.url === 'string' ? args.url.trim() : '';
  const host = url ? hostnameFromUrl(url) : null;
  if (phase === 'fetching') return host ? `Fetching ${host}…` : 'Fetching page…';
  if (phase === 'extracting') return host ? `Extracting ${host}…` : 'Extracting content…';
  return host ? `Fetched ${host}` : 'Fetched page';
}

export function formatWebFetchDuration(ms?: number): string | null {
  if (typeof ms !== 'number' || !Number.isFinite(ms)) return null;
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatWebFetchBytes(bytes?: number): string | null {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function webFetchWarningLabel(code: string): string {
  switch (code) {
    case 'js_required':
      return 'JavaScript may be required';
    case 'low_content':
      return 'Little text extracted';
    case 'paywall_detected':
      return 'Possible paywall';
    case 'content_truncated':
      return 'Content truncated';
    case 'cache_miss':
      return 'Cache miss';
    default:
      return code.replace(/_/g, ' ');
  }
}

export function webFetchContentToRender(parsed: WebFetchParsedResult | null): string | null {
  if (!parsed) return null;
  if (parsed.error) return null;
  const raw =
    (typeof parsed.result === 'string' && parsed.result) ||
    (typeof parsed.content === 'string' && parsed.content) ||
    (typeof parsed.preview === 'string' && parsed.preview) ||
    '';
  return raw.replace(/\\n/g, '\n').replace(/\\r/g, '').trim() || null;
}

export function webFetchLinks(parsed: WebFetchParsedResult | null): WebFetchLink[] {
  if (!parsed || !Array.isArray((parsed as { links?: unknown }).links)) return [];
  const links = (parsed as { links: unknown[] }).links;
  return links
    .filter((l): l is WebFetchLink => {
      if (!l || typeof l !== 'object') return false;
      const o = l as Record<string, unknown>;
      return typeof o.href === 'string' && typeof o.text === 'string';
    })
    .slice(0, 8);
}

export function webFetchDisplayUrl(args?: Record<string, unknown>, parsed?: WebFetchParsedResult | null): string {
  const fromResult =
    (typeof parsed?.finalUrl === 'string' && parsed.finalUrl) ||
    (typeof parsed?.url === 'string' && parsed.url) ||
    '';
  const fromArgs = typeof args?.url === 'string' ? args.url.trim() : '';
  return fromResult || fromArgs;
}
