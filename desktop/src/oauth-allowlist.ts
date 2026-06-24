/**
 * Hostnames and origins that may load inside the Electron shell for OAuth / SSO only.
 * Other https URLs still go to the system browser after approval.
 *
 * Also recognizes Nobox backend auth entry/callback paths on any host so
 * `window.location.href = API_ROOT/auth/_/google` stays in Electron when API_ROOT is remote.
 */

const DEFAULT_OAUTH_HOST_SUFFIXES =
  'accounts.google.com,google.com,googleusercontent.com,gstatic.com,googleapis.com,youtube.com,' +
  'login.microsoftonline.com,login.live.com,microsoftonline.com,github.com,gitlab.com,bitbucket.org,' +
  'appleid.apple.com,discord.com,facebook.com,linkedin.com,okta.com,auth0.com,amazoncognito.com';

function parseCommaParts(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function hostnameMatchesOauthSuffix(hostname: string, suffix: string): boolean {
  const h = hostname.toLowerCase();
  const s = suffix.toLowerCase().replace(/^\./, '');
  if (!s) {
    return false;
  }
  return h === s || h.endsWith(`.${s}`);
}

export function urlMatchesOauthAllowlist(
  urlString: string,
  extraOrigins: ReadonlySet<string>,
  hostSuffixes: readonly string[],
): boolean {
  if (urlString === 'about:blank' || urlString.startsWith('about:blank?')) {
    return false;
  }

  let u: URL;
  try {
    u = new URL(urlString);
  } catch {
    return false;
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return false;
  }

  if (extraOrigins.has(u.origin)) {
    return true;
  }

  if (u.protocol !== 'https:') {
    return false;
  }

  const host = u.hostname.toLowerCase();
  for (const suf of hostSuffixes) {
    if (hostnameMatchesOauthSuffix(host, suf)) {
      return true;
    }
  }
  return false;
}

function parseOauthOriginsFromEnv(): Set<string> {
  const set = new Set<string>();
  const raw = process.env.AIGENIUS_DESKTOP_OAUTH_ORIGINS ?? '';
  for (const part of parseCommaParts(raw)) {
    try {
      set.add(new URL(part).origin);
    } catch {
      /* ignore invalid */
    }
  }
  return set;
}

function parseOauthHostSuffixesFromEnv(): string[] {
  const raw = process.env.AIGENIUS_DESKTOP_OAUTH_HOST_SUFFIXES;
  const source = raw !== undefined && raw.trim() !== '' ? raw : DEFAULT_OAUTH_HOST_SUFFIXES;
  return parseCommaParts(source).map((s) => s.replace(/^\./, '').toLowerCase());
}

let cachedExtraOrigins: Set<string> | null = null;
let cachedHostSuffixes: string[] | null = null;

function oauthExtraOrigins(): Set<string> {
  if (cachedExtraOrigins === null) {
    cachedExtraOrigins = parseOauthOriginsFromEnv();
  }
  return cachedExtraOrigins;
}

function oauthHostSuffixes(): string[] {
  if (cachedHostSuffixes === null) {
    cachedHostSuffixes = parseOauthHostSuffixesFromEnv();
  }
  return cachedHostSuffixes;
}

/** True when this URL may load inside the desktop shell for sign-in / IdP flows (child window or in-place in a popup). */
export function isOauthSignInUrl(urlString: string): boolean {
  return urlMatchesOauthAllowlist(urlString, oauthExtraOrigins(), oauthHostSuffixes());
}

const NOBOX_AUTH_UNDERSCORE_PATHS = [
  '/auth/_/google',
  '/auth/_/google/callback',
  '/auth/_/github',
  '/auth/_/github/callback',
  '/auth/_/dev-login',
] as const;

/** Client-scoped Google routes: `GET /:projectId/auth/google` and callback (Nobox client controller). */
const CLIENT_SCOPED_GOOGLE_AUTH_PATH = /^\/[a-zA-Z0-9_-]+\/auth\/google(\/callback)?$/;

function normalizeUrlPathname(pathname: string): string {
  if (pathname.length <= 1) {
    return pathname;
  }
  return pathname.replace(/\/+$/, '');
}

/**
 * True for Nobox core auth URLs on any http(s) host — backend redirect to Google/Microsoft/GitHub
 * should run inside the shell, not the system browser.
 */
export function isNoboxAuthBackendFlowUrl(urlString: string): boolean {
  let u: URL;
  try {
    u = new URL(urlString);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return false;
  }
  const p = normalizeUrlPathname(u.pathname);
  if ((NOBOX_AUTH_UNDERSCORE_PATHS as readonly string[]).includes(p)) {
    return true;
  }
  return CLIENT_SCOPED_GOOGLE_AUTH_PATH.test(p);
}
