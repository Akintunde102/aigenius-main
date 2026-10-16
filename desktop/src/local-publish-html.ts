import fs from 'fs/promises';
import { resolveReadFilePath } from './utils/read-file/path-resolver';

const MAX_PAGES_HTML_BYTES = 2 * 1024 * 1024; // 2MB limit

/** Must match backend `PAGES_HTTP_ROUTE_PREFIX` (`pages.utils.ts`). */
const PAGES_HTTP_API_PATH = '/v1/*/pages';

export type GatewayPublishAuth = {
  apiRoot: string;
  accessToken: string;
};

export function readGatewayAuth(args: Record<string, unknown>): GatewayPublishAuth | { error: string } {
  const raw = args.__gatewayUpload;
  if (!raw || typeof raw !== 'object') {
    return { error: 'Publish auth is missing. Sign in and try again from the desktop app.' };
  }
  const auth = raw as Partial<GatewayPublishAuth>;
  if (typeof auth.apiRoot !== 'string' || !auth.apiRoot.trim()) {
    return { error: 'API root address is missing.' };
  }
  if (typeof auth.accessToken !== 'string' || !auth.accessToken.trim()) {
    return { error: 'Sign in before publishing an HTML page.' };
  }
  return {
    apiRoot: auth.apiRoot.trim(),
    accessToken: auth.accessToken.trim(),
  };
}

export function containsHtmlSignatures(content: string): boolean {
  const headSample = content.slice(0, 4096).toLowerCase().trim();
  return (
    headSample.includes('<!doctype html') ||
    headSample.includes('<html') ||
    headSample.includes('<head') ||
    headSample.includes('<body') ||
    headSample.includes('<script') ||
    headSample.includes('<div') ||
    headSample.includes('<style') ||
    headSample.includes('<title') ||
    headSample.includes('<meta')
  );
}

/**
 * Handles desktop execution of `publish_html` when `filePath` is provided.
 * Reads the HTML file locally, validates size and HTML markers, and POSTs/PUTs
 * directly to the platform pages API (v1 wildcard pages path) without bloating the LLM prompt.
 */
export async function handleDesktopPublishHtml(
  rawArgs: Record<string, unknown>,
): Promise<{ ok: true; result: string } | { ok: false; error: string }> {
  const filePathArg =
    typeof rawArgs.filePath === 'string' && rawArgs.filePath.trim()
      ? rawArgs.filePath.trim()
      : typeof rawArgs.path === 'string' && rawArgs.path.trim()
        ? rawArgs.path.trim()
        : '';

  if (!filePathArg) {
    return { ok: false, error: 'filePath is required for desktop publish_html' };
  }

  const auth = readGatewayAuth(rawArgs);
  if ('error' in auth) {
    return { ok: false, error: auth.error };
  }

  const resolved = await resolveReadFilePath(filePathArg);
  if (!resolved.ok) {
    return { ok: false, error: resolved.error };
  }

  let stat;
  try {
    stat = await fs.stat(resolved.resolved);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'File not found';
    return { ok: false, error: `Could not access file: ${msg}` };
  }

  if (stat.size > MAX_PAGES_HTML_BYTES) {
    return {
      ok: false,
      error: `File is larger than the ${MAX_PAGES_HTML_BYTES} byte (2MB) limit for hosted pages`,
    };
  }
  if (stat.size === 0) {
    return { ok: false, error: 'File is empty' };
  }

  const content = await fs.readFile(resolved.resolved, 'utf8');

  if (!containsHtmlSignatures(content)) {
    return {
      ok: false,
      error: 'The specified file does not appear to contain valid HTML content.',
    };
  }

  const title = typeof rawArgs.title === 'string' && rawArgs.title.trim() ? rawArgs.title.trim() : undefined;
  const slug = typeof rawArgs.slug === 'string' && rawArgs.slug.trim() ? rawArgs.slug.trim() : undefined;
  const pageId =
    typeof rawArgs.page_id === 'string' && rawArgs.page_id.trim()
      ? rawArgs.page_id.trim()
      : typeof rawArgs.id === 'string' && rawArgs.id.trim()
        ? rawArgs.id.trim()
        : undefined;
  const readme = typeof rawArgs.readme === 'string' && rawArgs.readme.trim() ? rawArgs.readme.trim() : undefined;
  const faviconDataUrl =
    typeof rawArgs.favicon_data_url === 'string'
      ? rawArgs.favicon_data_url
      : typeof rawArgs.faviconDataUrl === 'string'
        ? rawArgs.faviconDataUrl
        : undefined;
  const isDraft = rawArgs.is_draft === true || rawArgs.isDraft === true;
  const tags = rawArgs.tags !== undefined ? rawArgs.tags : undefined;
  const listOnHomepage =
    rawArgs.list_on_homepage === true || rawArgs.listOnHomepage === true
      ? true
      : rawArgs.list_on_homepage === false || rawArgs.listOnHomepage === false
        ? false
        : undefined;

  const body: Record<string, unknown> = {
    html: content,
    ...(title ? { title } : {}),
    ...(slug ? { slug } : {}),
    ...(pageId ? { id: pageId } : {}),
    ...(readme ? { readme } : {}),
    ...(faviconDataUrl !== undefined ? { faviconDataUrl } : {}),
    ...(isDraft ? { isDraft: true } : {}),
    ...(tags !== undefined ? { tags } : {}),
    ...(listOnHomepage !== undefined ? { listOnHomepage } : {}),
  };

  const endpoint = `${auth.apiRoot.replace(/\/+$/, '')}${PAGES_HTTP_API_PATH}${pageId ? `/${encodeURIComponent(pageId)}` : ''}`;

  try {
    const response = await fetch(endpoint, {
      method: pageId ? 'PUT' : 'POST',
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    if (!response.ok) {
      let errorMessage = text.trim() || `Publish failed (HTTP ${response.status})`;
      try {
        const parsed = JSON.parse(text);
        if (parsed && typeof parsed.message === 'string') {
          errorMessage = parsed.message;
        } else if (parsed && typeof parsed.error === 'string') {
          errorMessage = parsed.error;
        }
      } catch {
        // use raw text
      }
      return { ok: false, error: errorMessage };
    }

    return { ok: true, result: text || JSON.stringify({ success: true }) };
  } catch (netErr: unknown) {
    const msg = netErr instanceof Error ? netErr.message : 'Network error';
    return { ok: false, error: `Failed to reach pages service: ${msg}` };
  }
}
