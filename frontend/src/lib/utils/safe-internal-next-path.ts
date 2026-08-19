/**
 * Returns a safe in-app path from `?next=` (middleware sets this on auth redirects).
 * Rejects protocol-relative URLs and other values that are not same-origin paths.
 */
export function readSafeInternalNextPath(search: string): string {
  const next = new URLSearchParams(search).get("next");
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return "/";
  }
  if (next.includes("\\") || /[\s\r\n]/.test(next)) {
    return "/";
  }
  return next;
}

/** Paths that only host sign-in / shell UX — never use as a post-auth `?next=` destination. */
const DESKTOP_AUTH_SHELL_PATHS = new Set([
  "/desktop-login",
  "/desktop-welcome",
  "/login",
  "/signup",
]);

/**
 * After a session exists on desktop shell pages, `?next=` must not send the user back to the same
 * route or between auth surfaces (infinite `router.replace` loops).
 */
export function resolveAuthenticatedDesktopShellRedirect(
  currentPathname: string,
  search: string,
): string {
  const next = readSafeInternalNextPath(search);
  if (next === currentPathname) {
    return "/";
  }
  if (DESKTOP_AUTH_SHELL_PATHS.has(next)) {
    return "/";
  }
  return next;
}

const CHAT_CONVERSATION_PATH = /^\/chat\/([^/?#]+)$/;

function isSafeInternalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") && !/[\s\r\n]/.test(path);
}

/**
 * Returns a safe in-app `/chat/{conversationId}` path when `href` points at a saved conversation.
 * Rejects draft/new segments and unsafe values.
 */
export function normalizeChatConversationOpenPath(
  href: string,
  pageOrigin?: string,
): string | null {
  const trimmed = href.trim();
  if (!trimmed) {
    return null;
  }

  let path = trimmed;
  if (!path.startsWith("/")) {
    if (!pageOrigin) {
      return null;
    }
    try {
      const url = new URL(trimmed);
      if (url.origin !== pageOrigin) {
        return null;
      }
      path = `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  }

  if (!isSafeInternalPath(path)) {
    return null;
  }

  const pathname = path.split(/[?#]/)[0] ?? path;
  const match = CHAT_CONVERSATION_PATH.exec(pathname);
  if (!match) {
    return null;
  }

  const conversationId = match[1]?.trim();
  if (!conversationId || conversationId === "__draft__" || conversationId === "new") {
    return null;
  }

  return `/chat/${conversationId}`;
}
