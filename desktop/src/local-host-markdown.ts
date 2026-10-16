import fs from 'fs/promises';
import path from 'path';
import { readGatewayAuth } from './local-publish-html';
import { resolveReadFilePath } from './utils/read-file/path-resolver';

const MAX_HOSTED_MARKDOWN_BYTES = 1_000_000;
const HOSTED_FILES_API_PATH = '/gateway/*/hosted-files';

const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);

function isMarkdownFileName(fileName: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  return MARKDOWN_EXTENSIONS.has(ext);
}

function looksLikeHtmlDocument(content: string): boolean {
  const head = content.trim().slice(0, 200).toLowerCase();
  return head.startsWith('<!doctype html') || head.startsWith('<html');
}

/**
 * Desktop execution for `host_markdown` when `filePath` is provided.
 * Reads a local Markdown file, validates extension and content, then calls the hosted-files API.
 */
export async function handleDesktopHostMarkdown(
  rawArgs: Record<string, unknown>,
): Promise<{ ok: true; result: string } | { ok: false; error: string }> {
  const filePathArg =
    typeof rawArgs.filePath === 'string' && rawArgs.filePath.trim()
      ? rawArgs.filePath.trim()
      : typeof rawArgs.path === 'string' && rawArgs.path.trim()
        ? rawArgs.path.trim()
        : '';

  if (!filePathArg) {
    return { ok: false, error: 'filePath is required for desktop host_markdown' };
  }

  const action = typeof rawArgs.action === 'string' ? rawArgs.action.trim() : '';
  if (!action || action === 'list') {
    return { ok: false, error: 'host_markdown with filePath requires action create_draft, update, or publish' };
  }

  const baseName = path.basename(filePathArg);
  if (!isMarkdownFileName(baseName)) {
    return { ok: false, error: 'filePath must point to a .md or .markdown file' };
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

  if (stat.size > MAX_HOSTED_MARKDOWN_BYTES) {
    return {
      ok: false,
      error: `File is larger than the ${MAX_HOSTED_MARKDOWN_BYTES} byte (1 MB) limit for hosted Markdown`,
    };
  }
  if (stat.size === 0) {
    return { ok: false, error: 'File is empty' };
  }

  const markdown = await fs.readFile(resolved.resolved, 'utf8');
  if (!markdown.trim()) {
    return { ok: false, error: 'Markdown file has no content' };
  }
  if (looksLikeHtmlDocument(markdown)) {
    return { ok: false, error: 'HTML documents cannot be hosted as Markdown pages' };
  }

  const pageId =
    typeof rawArgs.page_id === 'string' && rawArgs.page_id.trim()
      ? rawArgs.page_id.trim()
      : undefined;
  const title = typeof rawArgs.title === 'string' && rawArgs.title.trim() ? rawArgs.title.trim() : undefined;
  const description =
    typeof rawArgs.description === 'string' && rawArgs.description.trim()
      ? rawArgs.description.trim()
      : undefined;
  const slug = typeof rawArgs.slug === 'string' && rawArgs.slug.trim() ? rawArgs.slug.trim() : undefined;
  const visibility =
    rawArgs.visibility === 'public' || rawArgs.visibility === 'restricted' ? rawArgs.visibility : undefined;
  const allowedEmails = Array.isArray(rawArgs.allowed_emails)
    ? (rawArgs.allowed_emails as string[])
    : undefined;
  const codeProjectId =
    typeof rawArgs.code_project_id === 'string' && rawArgs.code_project_id.trim()
      ? rawArgs.code_project_id.trim()
      : rawArgs.code_project_id === null
        ? null
        : undefined;

  const publish =
    action === 'publish' ? true : action === 'create_draft' ? false : undefined;

  const body: Record<string, unknown> = {
    markdown,
    ...(title ? { title } : {}),
    ...(description ? { description } : {}),
    ...(slug ? { slug } : {}),
    ...(visibility ? { visibility } : {}),
    ...(allowedEmails ? { allowedEmails } : {}),
    ...(codeProjectId !== undefined ? { codeProjectId } : {}),
    ...(publish !== undefined ? { publish } : {}),
  };

  const apiBase = auth.apiRoot.replace(/\/+$/, '');
  const endpoint = pageId
    ? `${apiBase}${HOSTED_FILES_API_PATH}/${encodeURIComponent(pageId)}`
    : `${apiBase}${HOSTED_FILES_API_PATH}`;

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
      let errorMessage = text.trim() || `Hosted Markdown failed (HTTP ${response.status})`;
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
    return { ok: false, error: `Failed to reach hosted files service: ${msg}` };
  }
}
