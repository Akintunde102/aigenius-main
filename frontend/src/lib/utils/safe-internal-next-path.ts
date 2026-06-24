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
