import { BrowserWindow, shell } from 'electron';
import path from 'path';
import { normalizeLoopbackToShellOrigin } from './loopback-frontend-url';
import { resolveFrontendPort } from './frontend-port';
import { DEV_LOOPBACK_HOST, loopbackHttpUrl } from './loopback-host';
import { showExternalLinkApprovalDialog } from './external-link-approval-dialog';
import { isNoboxAuthBackendFlowUrl, isOauthSignInUrl } from './oauth-allowlist';

const FRONTEND_PORT = resolveFrontendPort();
const MINI_SERVER_PORT = process.env.AIGENIUS_MINI_SERVER_PORT ?? '8001';
const API_PORT = process.env.AIGENIUS_API_PORT ?? process.env.DEV_API_PORT ?? '8000';

function parseExtraOrigins(): Set<string> {
  const raw = process.env.AIGENIUS_DESKTOP_ALLOWED_ORIGINS ?? '';
  const set = new Set<string>();
  for (const part of raw.split(',')) {
    const s = part.trim();
    if (!s) {
      continue;
    }
    try {
      set.add(new URL(s).origin);
    } catch {
      /* ignore invalid */
    }
  }
  return set;
}

function buildLocalAppOrigins(): Set<string> {
  // `127.0.0.1` kept during deprecation so legacy OAuth redirects still match.
  const hosts = [DEV_LOOPBACK_HOST, '127.0.0.1', '[::1]'];
  const ports = [FRONTEND_PORT, MINI_SERVER_PORT, API_PORT];
  const set = new Set<string>();
  for (const host of hosts) {
    for (const port of ports) {
      set.add(`http://${host}:${port}`);
    }
  }
  return set;
}

let cachedAllowedOrigins: Set<string> | null = null;

function allowedOrigins(): Set<string> {
  if (cachedAllowedOrigins === null) {
    cachedAllowedOrigins = new Set([...buildLocalAppOrigins(), ...parseExtraOrigins()]);
  }
  return cachedAllowedOrigins;
}

/**
 * After OAuth, the callback may have already run in a modal/popup. Do not replay the same URL
 * on the main window (one-time ?code=). Send the user to the app shell instead.
 */
function postOAuthHandoffUrl(completedUrl: string): string {
  try {
    const u = new URL(completedUrl);
    if (!allowedOrigins().has(u.origin)) {
      return completedUrl;
    }
    const h = u.hostname.toLowerCase();
    const onLoopback =
      h === DEV_LOOPBACK_HOST || h === '127.0.0.1' || u.hostname === '::1' || u.hostname === '[::1]';
    const onFrontend =
      onLoopback && u.protocol === 'http:' && u.port === String(FRONTEND_PORT);
    if (onFrontend) {
      return completedUrl;
    }
    const q = u.searchParams;
    const path = u.pathname.toLowerCase();
    const looksOAuth =
      q.has('code') ||
      q.has('error') ||
      q.has('state') ||
      /callback|oauth|authorize|signin/i.test(path);
    if (looksOAuth) {
      return `${loopbackHttpUrl(FRONTEND_PORT, '/desktop-login')}?aigenius_shell=1`;
    }
    return completedUrl;
  } catch {
    return `${loopbackHttpUrl(FRONTEND_PORT, '/desktop-login')}?aigenius_shell=1`;
  }
}

/**
 * OAuth modal / popup: when Google redirects to 127.0.0.1 (callback or app), load it in the parent
 * main window and close this child so the user lands back in AIGenius.
 */
function registerLocalOriginHandoff(win: BrowserWindow): void {
  const { webContents } = win;
  let handedOff = false;

  const forwardToParent = (url: string, usePostOAuthSafeUrl: boolean): void => {
    if (handedOff) {
      return;
    }
    const parent = win.getParentWindow();
    if (!parent || parent.isDestroyed()) {
      return;
    }
    handedOff = true;
    const rawTarget = usePostOAuthSafeUrl ? postOAuthHandoffUrl(url) : url;
    const target = normalizeLoopbackToShellOrigin(rawTarget, String(FRONTEND_PORT));
    void parent.loadURL(target);
    queueMicrotask(() => {
      if (!win.isDestroyed()) {
        win.close();
      }
    });
  };

  webContents.on('will-navigate', (event, url) => {
    try {
      const u = new URL(url);
      if (allowedOrigins().has(u.origin) && win.getParentWindow()) {
        event.preventDefault();
        forwardToParent(url, false);
      }
    } catch {
      /* ignore */
    }
  });

  webContents.on('will-redirect', (event, url) => {
    try {
      const u = new URL(url);
      if (allowedOrigins().has(u.origin) && win.getParentWindow()) {
        event.preventDefault();
        forwardToParent(url, false);
      }
    } catch {
      /* ignore */
    }
  });

  webContents.on('did-navigate', (_event, url) => {
    if (handedOff) {
      return;
    }
    try {
      const u = new URL(url);
      if (allowedOrigins().has(u.origin) && win.getParentWindow()) {
        forwardToParent(url, true);
      }
    } catch {
      /* ignore */
    }
  });
}

function isHttpOrHttpsUrl(urlString: string): boolean {
  try {
    const u = new URL(urlString);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function openExternalInSystemBrowserAfterApproval(parent: BrowserWindow, url: string): void {
  if (!isHttpOrHttpsUrl(url)) {
    return;
  }
  void (async () => {
    const ok = await showExternalLinkApprovalDialog(parent, url);
    if (ok) {
      void shell.openExternal(url);
    }
  })();
}

function oauthChildWindowOptions(parent: BrowserWindow): Electron.BrowserWindowConstructorOptions {
  const bounds = parent.getBounds();
  return {
    parent,
    modal: false,
    width: Math.min(560, Math.max(480, bounds.width - 80)),
    height: Math.min(720, Math.max(600, bounds.height - 80)),
    show: false,
    autoHideMenuBar: true,
    title: 'Sign in',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  };
}

/**
 * Top-level window: never host IdP in the main shell — open a child so callbacks can hand off via registerLocalOriginHandoff.
 */
function openIdpChildWindow(parent: BrowserWindow, url: string): void {
  if (!isHttpOrHttpsUrl(url) || !isOauthSignInUrl(url)) {
    return;
  }
  const child = new BrowserWindow(oauthChildWindowOptions(parent));
  attachMainShellNavigationGuards(child);
  child.once('ready-to-show', () => {
    child.show();
  });
  void child.loadURL(url);
}

function isTopLevelShellWindow(win: BrowserWindow): boolean {
  return win.getParentWindow() == null;
}

export function isUrlAllowedInMainShell(urlString: string): boolean {
  if (urlString === 'about:blank' || urlString.startsWith('about:blank?')) {
    return true;
  }

  let u: URL;
  try {
    u = new URL(urlString);
  } catch {
    return false;
  }

  if (u.protocol === 'http:' || u.protocol === 'https:') {
    if (allowedOrigins().has(u.origin)) {
      return true;
    }
    if (isNoboxAuthBackendFlowUrl(urlString)) {
      return true;
    }
  }

  return false;
}

/**
 * Keeps the main AIGenius window on the embedded Next/API surface. OAuth / IdP URLs stay in a
 * sandboxed child window and return via localhost handoff; other external http(s) URLs open in the
 * system browser after approval.
 */
export function attachMainShellNavigationGuards(win: BrowserWindow): void {
  registerLocalOriginHandoff(win);
  const { webContents } = win;

  const blockAndEscalate = (url: string): void => {
    openExternalInSystemBrowserAfterApproval(win, url);
  };

  const handleDisallowedNavigation = (event: Electron.Event, url: string): void => {
    if (isUrlAllowedInMainShell(url)) {
      return;
    }
    if (isOauthSignInUrl(url)) {
      if (isTopLevelShellWindow(win)) {
        event.preventDefault();
        openIdpChildWindow(win, url);
      }
      return;
    }
    event.preventDefault();
    blockAndEscalate(url);
  };

  webContents.on('will-navigate', (event, url) => {
    handleDisallowedNavigation(event, url);
  });

  webContents.on('will-redirect', (event, url) => {
    handleDisallowedNavigation(event, url);
  });

  webContents.setWindowOpenHandler(({ url }) => {
    if (isUrlAllowedInMainShell(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          parent: win,
          autoHideMenuBar: true,
          webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
          },
        },
      };
    }

    if (isOauthSignInUrl(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: oauthChildWindowOptions(win),
      };
    }

    blockAndEscalate(url);
    return { action: 'deny' };
  });

  webContents.on('did-create-window', (childWindow) => {
    attachMainShellNavigationGuards(childWindow);
  });
}

/**
 * Handles renderer-driven opens: Nobox auth routes and IdP URLs stay in the shell; returns false
 * when the caller should fall back to external-browser approval.
 */
export function deliverOpenExternalOrAuthUrl(sender: Electron.WebContents, url: string): boolean {
  const win = BrowserWindow.fromWebContents(sender);
  if (!win || win.isDestroyed()) {
    return false;
  }
  if (!isHttpOrHttpsUrl(url)) {
    return false;
  }
  if (isNoboxAuthBackendFlowUrl(url)) {
    void win.loadURL(url);
    return true;
  }
  if (isOauthSignInUrl(url)) {
    if (isTopLevelShellWindow(win)) {
      openIdpChildWindow(win, url);
    } else {
      void win.loadURL(url);
    }
    return true;
  }
  return false;
}
