/**
 * Cross-platform local path → in-app preview links for the AIGenius desktop shell.
 * Use `local-file://` in chat markdown (not `file://` or OS-specific shell commands).
 */

export function toLocalFileHref(absolutePath: string): string {
  return `local-file://${encodeURIComponent(absolutePath)}`;
}

export function formatLocalPathMarkdownLink(absolutePath: string, label?: string): string {
  const name = label || absolutePath.split(/[/\\]/).pop() || absolutePath;
  return `[${name}](${toLocalFileHref(absolutePath)})`;
}

export function isAbsoluteFilesystemPath(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  if (t.startsWith('/')) return true;
  if (/^[A-Za-z]:[\\/]/.test(t)) return true;
  if (t.startsWith('~')) return true;
  return false;
}

/** Decode `local-file://` or `file://` URIs into a filesystem path. */
export function normalizeFileUriToPath(uri: string): string | null {
  const t = uri.trim();
  if (t.startsWith('local-file://')) {
    try {
      return decodeURIComponent(t.slice('local-file://'.length));
    } catch {
      return null;
    }
  }
  if (!/^file:\/\//i.test(t)) return null;
  try {
    let path = decodeURIComponent(t.replace(/^file:\/\//i, ''));
    if (/^\/[A-Za-z]:\//.test(path)) {
      path = path.slice(1);
    }
    if (path.startsWith('localhost/')) {
      path = `/${path.slice('localhost/'.length)}`;
    }
    return path;
  } catch {
    return null;
  }
}

export function isLoopbackHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    const host = u.hostname.toLowerCase();
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  } catch {
    return false;
  }
}

export type ResolvedDesktopHref =
  | { kind: 'local-file'; path: string }
  | { kind: 'passthrough' };

/** Only `local-file://` preview links are honored — not `file://`, bare paths, or loopback URLs. */
export function resolveMarkdownHrefForDesktop(href: string): ResolvedDesktopHref {
  const trimmed = href.trim();
  if (!trimmed.startsWith('local-file://')) {
    return { kind: 'passthrough' };
  }
  const fromLocal = normalizeFileUriToPath(trimmed);
  if (fromLocal && isAbsoluteFilesystemPath(fromLocal)) {
    return { kind: 'local-file', path: fromLocal };
  }
  return { kind: 'passthrough' };
}

export function buildDesktopLocalLinksGuidance(platform: string, userHomeDir: string): string {
  const plat = platform.trim().toLowerCase() || 'unknown';
  const home = userHomeDir.trim() || 'unknown';
  const examplePath =
    plat === 'win32'
      ? `${home.replace(/\\/g, '/')}/Projects/site/index.html`
      : `${home}/Projects/site/index.html`;
  const exampleHref = toLocalFileHref(examplePath);

  return [
    '### Local paths and preview links (desktop)',
    `The user’s OS is **${plat}**; home directory: \`${home}\`.`,
    '- Use **absolute paths** with separators natural to this OS. Do **not** assume Windows (`C:\\`, `start`, `explorer`, `cmd`) unless platform is `win32`.',
    '- Do **not** use `file://` links in chat — they are not clickable in the app.',
    `- For in-app **preview/open**, use markdown: \`[label](local-file://ENCODED_PATH)\` where ENCODED_PATH is \`encodeURIComponent(absolutePath)\`. Example: [index.html](${exampleHref}).`,
    '- After creating files (e.g. a website), link the **project folder** and **index.html** (or main entry) with `local-file://` preview links.',
    '- For a **local dev server**, link `http://127.0.0.1:PORT/...` (opens in the system browser on desktop).',
    '- Prefer tool `local_open_in_os` with an absolute path over shell `start` / `open` / `xdg-open` in your reply text.',
  ].join('\n');
}
