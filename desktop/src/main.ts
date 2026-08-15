// .env loading is dev-only; packaged apps don't ship dotenv (devDependency).
if (!__filename.includes('app.asar')) {
  require('dotenv/config');
}

import { attachStdioEpipeHandlers, safeStdioWrite } from './stdio-safe';
import {
  installDesktopPerfInstrumentation,
  isDesktopPerfBenchmarkEnabled,
  isDesktopPerfEnabled,
  maybeRunPerfBenchmark,
  startupMark,
  startupMarkSummary,
} from './perf';

attachStdioEpipeHandlers();
installDesktopPerfInstrumentation();

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

/** Desktop shell defaults — override via env when packaging or in dev. */
if (process.env.AIGENIUS_ENABLE_STT === undefined) {
  process.env.AIGENIUS_ENABLE_STT = '0';
}
if (process.env.AIGENIUS_HOMEDIR_INDEX === undefined) {
  process.env.AIGENIUS_HOMEDIR_INDEX = '0';
}

import {
  app,
  BrowserWindow,
  desktopCapturer,
  dialog,
  globalShortcut,
  Menu,
  ipcMain,
  nativeImage,
  screen,
  shell,
  session,
} from 'electron';
import { runLocalDesktopTool } from './local-tool-executor';
import { getChatRuntimeContextForIpc, USER_HOME_DIR_AT_STARTUP } from './chat-runtime-context';
import { fetchLocalSearchIndexState } from './local-search-index-state';
import {
  loadToolPermissionPreferences,
  applySyncedToolPermissionPreferences,
} from './tool-permission-preferences';
import { initLocalRetrievalMemory } from './local-retrieval-memory';
import { attachMainShellNavigationGuards, deliverOpenExternalOrAuthUrl } from './navigation-guards';
import { mainShellBrowserWindowOptions } from './shell-chrome';
import { registerIpcHandlers } from './search';
import { registerAudioRecorderHandlers } from './audio-recorder-handler';
import { setupCrashHandlers } from './crash-handler';
import { checkInotifyLimit } from './utils/sys-limits';
import fs from 'fs';
import path from 'path';
import http from 'http';
import os from 'os';
import crypto from 'crypto';
import { resolveFrontendPort } from './frontend-port';
import { DEV_LOOPBACK_HOST, loopbackHttpUrl } from './loopback-host';
import { resolveUpstreamApiUrl as resolveDesktopUpstreamApiUrl } from './resolve-upstream-api-url';
import { setActiveCodeProjectIndex } from './active-code-project';
import { refreshProjectArchitectureMemory } from './project-architecture-memory';
import { setMainActiveEditor } from './active-editor-main';
import { startIndexerUtilityProcess, stopIndexerUtilityProcess } from './indexer-utility-process';
import {
  killManagedDesktopChild,
  spawnDesktopChild,
  type ManagedDesktopChild,
} from './desktop-child-process';
import { exchangeDesktopOAuthCode } from './desktop-auth-exchange';
import {
  clearDesktopRefreshToken,
  readDesktopRefreshToken,
  storeDesktopRefreshToken,
} from './desktop-auth-store';
import { saveLastCodeProject, loadLastCodeProject } from './last-code-project';
import { MINI_SERVER_PORT } from './mini-server-port';
import net from 'net';
import {
  attachChatCompletionWindowFocusHandlers,
  configureDesktopNotificationBranding,
  notifyChatCompletionIfBackground,
  setChatCompletionNotificationIcon,
  type ChatCompletionNotifyPayload,
} from './chat-completion-notifications';

function normalizeRendererFilesystemPath(filePath: string): string {
  let normalizedPath = filePath;
  if (process.platform === 'win32') {
    normalizedPath = filePath.replace(/\//g, '\\');
    if (normalizedPath.startsWith('\\') && /^[a-zA-Z]:/.test(normalizedPath.slice(1))) {
      normalizedPath = normalizedPath.slice(1);
    }
  }
  return normalizedPath;
}

const INDEXER_IPC_PORT = process.env.AIGENIUS_INDEXER_IPC_PORT ?? '18012';
const FRONTEND_PORT = resolveFrontendPort();
/** Secure token for local sidecar communication (respect pre-set env for external sidecar / Tilt). */
const SECRET_TOKEN =
  (typeof process.env.AIGENIUS_SECRET_TOKEN === 'string' &&
    process.env.AIGENIUS_SECRET_TOKEN.trim().length > 0 &&
    process.env.AIGENIUS_SECRET_TOKEN) ||
  crypto.randomBytes(32).toString('hex');
process.env.AIGENIUS_SECRET_TOKEN = SECRET_TOKEN;

if (!SECRET_TOKEN) {
  console.error('[aigenius-desktop] CRITICAL: Failed to generate SECRET_TOKEN. Local tools will be unavailable.');
}
/** Must match frontend `DESKTOP_SHELL_ENTRY_QUERY_PARAM` (longer preload poll on this route). */
const FRONTEND_URL = `${loopbackHttpUrl(FRONTEND_PORT, '/desktop-login')}?aigenius_shell=1`;
const WEBSITE_LOGIN_URL = loopbackHttpUrl(FRONTEND_PORT, '/login');

type DesktopBrowserSignInOptions = {
  /** Skip the login page and start Google OAuth in the system browser. */
  autoProvider?: 'google';
};

function buildUpstreamGoogleAuthUrl(upstream: string, desktopCallback: string): string {
  const params = new URLSearchParams({
    callback_url: desktopCallback,
    callback_client: 'desktop',
  });
  return `${upstream.replace(/\/+$/, '')}/auth/_/google?${params.toString()}`;
}

/**
 * OAuth in an embedded Electron window is blocked by Google (blank popup). Use the system browser
 * and a loopback callback so the shell receives the issued token.
 */
function runDesktopBrowserSignIn(
  event: Electron.IpcMainInvokeEvent,
  options: DesktopBrowserSignInOptions = {},
): Promise<{ token: string } | null> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      void (async () => {
        const u = new URL(req.url || '', `http://${req.headers.host}`);
        const oauthCode = u.searchParams.get('code');
        const legacyToken = u.searchParams.get('token');

        const finishSuccess = (accessToken: string) => {
          const websiteBase = WEBSITE_LOGIN_URL.replace('/login', '');
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <head>
                <title>Sign-in Successful</title>
                <meta http-equiv="refresh" content="2;url=${websiteBase}/desktop-success">
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    background: #0c0d0f;
                    color: white;
                    text-align: center;
                  }
                  .container {
                    max-width: 400px;
                    padding: 2rem;
                  }
                  .icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    color: #10b981;
                  }
                  h1 {
                    font-size: 1.5rem;
                    margin-bottom: 0.5rem;
                  }
                  p {
                    color: #9ca3af;
                    line-height: 1.5;
                  }
                  .spinner {
                    margin-top: 2rem;
                    display: inline-block;
                    width: 1.5rem;
                    height: 1.5rem;
                    border: 3px solid rgba(255,255,255,.1);
                    border-radius: 50%;
                    border-top-color: #10b981;
                    animation: spin 1s ease-in-out infinite;
                  }
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="icon">✓</div>
                  <h1>Sign-in Successful</h1>
                  <p>AIGenius Desktop has been authenticated. You can close this tab and return to the app.</p>
                  <div class="spinner"></div>
                </div>
                <script>setTimeout(() => { try { window.close(); } catch (_) {} }, 1500);</script>
              </body>
            </html>
          `);
          server.close();

          const win = BrowserWindow.fromWebContents(event.sender);
          if (win) {
            if (win.isMinimized()) win.restore();
            win.show();
            win.focus();
          }

          resolve({ token: accessToken });
        };

        if (oauthCode) {
          const exchanged = await exchangeDesktopOAuthCode(resolveUpstreamApiUrl(), oauthCode);
          if (!exchanged) {
            res.writeHead(400);
            res.end('OAuth code exchange failed');
            server.close();
            resolve(null);
            return;
          }
          storeDesktopRefreshToken(exchanged.refreshToken);
          finishSuccess(exchanged.token);
          return;
        }

        if (legacyToken) {
          finishSuccess(legacyToken);
          return;
        }

        res.writeHead(400);
        res.end('Missing OAuth code');
        server.close();
        resolve(null);
      })().catch((error) => {
        console.error('[aigenius-desktop] OAuth loopback handler failed', error);
        res.writeHead(500);
        res.end('Sign-in failed');
        server.close();
        resolve(null);
      });
    });

    server.listen(0, DEV_LOOPBACK_HOST, () => {
      const addr = server.address() as net.AddressInfo;
      const callbackUrl = loopbackHttpUrl(addr.port, '/');
      const upstream = resolveUpstreamApiUrl();

      if (options.autoProvider === 'google') {
        void shell.openExternal(buildUpstreamGoogleAuthUrl(upstream, callbackUrl));
        return;
      }

      const params = new URLSearchParams({
        desktop_callback: callbackUrl,
        api_root: upstream,
      });
      const authUrl = `${WEBSITE_LOGIN_URL}?${params.toString()}`;
      void shell.openExternal(authUrl);
    });

    server.on('error', (err) => {
      console.error('[aigenius-desktop] Web sign-in server error:', err);
      resolve(null);
    });

    setTimeout(() => {
      if (server.listening) {
        server.close();
        resolve(null);
      }
    }, 5 * 60 * 1000);
  });
}

const DESKTOP_BRIDGE_DEBUG = process.env.AIGENIUS_DESKTOP_BRIDGE_DEBUG === '1';

/**
 * IPC to renderer: `{ batch: [...] }` PNGs from `desktopCapturer` (full desktop / all displays).
 * See preload `onQueueChatScreenshot`.
 */
const DESKTOP_QUEUE_CHAT_SCREENSHOT_CHAN = 'aigenius-desktop-queue-chat-screenshot';

/**
 * Works while other apps are focused (unlike menu accelerators). Keep in sync with any docs/tooltips.
 * If registration fails (OS reserved / conflict), use View → Attach Window Screenshot to Chat.
 */
const CHAT_SCREENSHOT_GLOBAL_ACCELERATOR = 'CommandOrControl+Alt+S';

/** Last main shell window the user focused; used when a global shortcut fires while another app is active. */
let lastFocusedMainShellWindow: BrowserWindow | null = null;

function isDesktopDevToolsEnabled(): boolean {
  const raw = process.env.AIGENIUS_DESKTOP_DEVTOOLS;
  if (raw === undefined) {
    return false;
  }
  const t = raw.trim().toLowerCase();
  return t === '1' || t === 'true' || t === 'yes';
}

/**
 * Logs preload path, preload errors, and a renderer snapshot after load (set
 * `AIGENIUS_DESKTOP_BRIDGE_DEBUG=1` when running Electron).
 */
function attachDesktopBridgeDebugLogging(win: BrowserWindow, preloadPath: string): void {
  if (!DESKTOP_BRIDGE_DEBUG) {
    return;
  }
  const { webContents } = win;
  console.info(
    '[aigenius-desktop][bridge-debug] preload path:',
    preloadPath,
    'exists:',
    fs.existsSync(preloadPath),
  );
  webContents.on('preload-error', (_event, failedPath, error) => {
    console.error('[aigenius-desktop][bridge-debug] preload-error', {
      failedPath,
      message: error instanceof Error ? error.message : String(error),
    });
  });
  webContents.on('did-finish-load', () => {
    void webContents
      .executeJavaScript(
        `(() => { const b = window.aigeniusDesktop; return JSON.stringify({
          hasBridge: !!b,
          isDesktop: !!(b && b.isDesktop),
          hasRunLocal: typeof b?.runLocalDesktopTool === 'function',
          ua: typeof navigator !== 'undefined' ? navigator.userAgent : '',
          desktopShellAttr: document.documentElement.getAttribute('data-aigenius-desktop-shell')
        }); })()`,
      )
      .then((json: string) => {
        console.info('[aigenius-desktop][bridge-debug] renderer snapshot:', json);
      })
      .catch((err: unknown) => {
        console.error('[aigenius-desktop][bridge-debug] snapshot failed:', err);
      });
  });
}

const children: ManagedDesktopChild[] = [];

function repoRootFromDesktopDist(): string {
  return path.join(__dirname, '..', '..');
}

function desktopServerDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'desktop-server');
  }
  return path.join(repoRootFromDesktopDist(), 'desktop-server');
}

function desktopServerEntry(): string {
  if (app.isPackaged) {
    return path.join(desktopServerDir(), 'index.js');
  }
  return path.join(desktopServerDir(), 'dist', 'index.js');
}

function resolveUpstreamApiUrl(): string {
  return resolveDesktopUpstreamApiUrl({
    desktopRoot: path.join(__dirname, '..'),
    packagedResourcesPath: app.isPackaged ? process.resourcesPath : undefined,
  });
}

type DesktopUiMode = 'vite' | 'next';

function desktopUiMode(): DesktopUiMode {
  const raw = process.env.AIGENIUS_DESKTOP_UI?.trim().toLowerCase();
  if (raw === 'next') {
    return 'next';
  }
  return 'vite';
}

function nextStandaloneDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'next-standalone');
  }
  return path.join(repoRootFromDesktopDist(), 'frontend', '.next', 'standalone');
}

function desktopUiStaticDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'desktop-ui');
  }
  return path.join(repoRootFromDesktopDist(), 'desktop-renderer', 'dist');
}

function resolveDesktopUiServerLaunch(): { scriptPath: string; cwd: string } {
  if (app.isPackaged) {
    const cwd = path.join(process.resourcesPath, 'desktop-ui-server');
    return {
      scriptPath: path.join(cwd, 'serve-desktop-ui.cjs'),
      cwd,
    };
  }
  const cwd = path.join(__dirname, '..', 'scripts');
  return {
    scriptPath: path.join(cwd, 'serve-desktop-ui.cjs'),
    cwd,
  };
}

/** Monorepo Next standalone output nests `server.js` under `frontend/`. */
function resolveNextStandaloneLaunch(): { scriptPath: string; cwd: string } {
  const root = nextStandaloneDir();
  const nestedDir = path.join(root, 'frontend');
  const nestedScript = path.join(nestedDir, 'server.js');
  if (fs.existsSync(nestedScript)) {
    return { scriptPath: nestedScript, cwd: nestedDir };
  }
  return { scriptPath: path.join(root, 'server.js'), cwd: root };
}

function waitForHttpUntil(
  url: string,
  timeoutMs: number,
  intervalMs: number,
  statusOk: (statusCode: number | undefined) => boolean,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = (): void => {
      const req = http.get(url, (res) => {
        res.resume();
        if (statusOk(res.statusCode)) {
          resolve();
          return;
        }
        retry();
      });
      req.on('error', () => retry());
      req.setTimeout(intervalMs, () => {
        req.destroy();
        retry();
      });
    };
    const retry = (): void => {
      if (Date.now() > deadline) {
        reject(new Error(`Timeout waiting for ${url}`));
        return;
      }
      setTimeout(tryOnce, intervalMs);
    };
    tryOnce();
  });
}

/** Mini-server / generic probe: accept any response that is not a server error. */
function waitForHttpOk(url: string, timeoutMs: number, intervalMs: number): Promise<void> {
  return waitForHttpUntil(
    url,
    timeoutMs,
    intervalMs,
    (code) => code !== undefined && code < 500,
  );
}

/** Next page: require a real document response (avoid treating 404 as “ready” → blank window). */
function waitForFrontendPageReady(url: string, timeoutMs: number, intervalMs: number): Promise<void> {
  return waitForHttpUntil(
    url,
    timeoutMs,
    intervalMs,
    (code) => code !== undefined && code >= 200 && code < 400,
  );
}

function killChildren(): void {
  for (const c of children) {
    killManagedDesktopChild(c);
  }
  children.length = 0;
  stopIndexerUtilityProcess();
}

let appShutdownStarted = false;

async function shutdownDesktopApp(): Promise<void> {
  try {
    await fetch(loopbackHttpUrl(MINI_SERVER_PORT, '/search/shutdown'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${SECRET_TOKEN}`, 'Content-Length': '0' },
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    /* sidecar may already be gone or not started — always proceed */
  }
  killChildren();
}

function defaultScreenshotBasename(): string {
  const stamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+/, '');
  return `aigenius-screenshot-${stamp}.png`;
}

async function captureBrowserWindowPngBase64(
  win: BrowserWindow,
): Promise<{ base64: string } | { error: string }> {
  try {
    const image = await win.webContents.capturePage();
    const png = image.toPNG();
    if (!png || png.length === 0) {
      return { error: 'Empty capture' };
    }
    return { base64: png.toString('base64') };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message || 'capturePage failed' };
  }
}

function resolveShellWindowForScreenshot(hint?: BrowserWindow | null): BrowserWindow | null {
  if (hint && !hint.isDestroyed()) {
    return hint;
  }
  if (lastFocusedMainShellWindow && !lastFocusedMainShellWindow.isDestroyed()) {
    return lastFocusedMainShellWindow;
  }
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) {
    return focused;
  }
  return BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) ?? null;
}

type ChatScreenshotPart = { base64: string; mimeType: string; basename: string };

function sortDisplaysLeftTopFirst(displays: Electron.Display[]): Electron.Display[] {
  return displays.slice().sort((a, b) => {
    if (a.bounds.x !== b.bounds.x) {
      return a.bounds.x - b.bounds.x;
    }
    return a.bounds.y - b.bounds.y;
  });
}

/**
 * Full-monitor PNGs via `desktopCapturer` (not the AIGenius window).
 * Multiple monitors → multiple images (except OS setups that expose one combined screen source).
 */
async function captureAllDisplaysAsPngPayloads(): Promise<ChatScreenshotPart[]> {
  const displays = sortDisplaysLeftTopFirst(screen.getAllDisplays());
  if (displays.length === 0) {
    return [];
  }

  const maxW = Math.max(
    1,
    ...displays.map((d) => Math.round(d.size.width * d.scaleFactor)),
  );
  const maxH = Math.max(
    1,
    ...displays.map((d) => Math.round(d.size.height * d.scaleFactor)),
  );

  let sources: Electron.DesktopCapturerSource[];
  try {
    sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: maxW, height: maxH },
    });
  } catch (err) {
    console.error('[aigenius-desktop] desktopCapturer.getSources failed', err);
    return [];
  }

  if (sources.length === 0) {
    return [];
  }

  const stampSegment = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+/, '');
  const out: ChatScreenshotPart[] = [];

  if (sources.length === 1) {
    const png = sources[0]!.thumbnail.toPNG();
    if (png.length > 0) {
      out.push({
        base64: png.toString('base64'),
        mimeType: 'image/png',
        basename: `desktop-full-${stampSegment}.png`,
      });
    }
    return out;
  }

  for (let i = 0; i < displays.length; i++) {
    const display = displays[i]!;
    const match =
      sources.find((s) => String(s.display_id) === String(display.id)) ??
      (sources.length === displays.length ? sources[i] : undefined);

    if (!match) {
      console.warn('[aigenius-desktop] No desktopCapturer source for display', display.id);
      continue;
    }
    const png = match.thumbnail.toPNG();
    if (png.length === 0) {
      continue;
    }
    out.push({
      base64: png.toString('base64'),
      mimeType: 'image/png',
      basename: `desktop-${display.id}-${i}-${stampSegment}.png`,
    });
  }

  return out;
}

async function attachFullDesktopScreenshotsToChat(webContents: Electron.WebContents): Promise<void> {
  const batch = await captureAllDisplaysAsPngPayloads();
  if (batch.length === 0) {
    if (DESKTOP_BRIDGE_DEBUG) {
      console.warn('[aigenius-desktop] full-desktop capture produced no images');
    }
    return;
  }
  webContents.send(DESKTOP_QUEUE_CHAT_SCREENSHOT_CHAN, { batch });
}

async function attachFullDesktopToChatShell(hint?: BrowserWindow | null): Promise<void> {
  const target = resolveShellWindowForScreenshot(hint ?? undefined);
  if (!target || target.isDestroyed()) {
    return;
  }
  await attachFullDesktopScreenshotsToChat(target.webContents);
}

function createMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            const w = createWindow();
            w.focus();
          },
        },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    {
      role: 'editMenu',
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { type: 'separator' },
        {
          /** No accelerator: use global shortcut (works when another app is focused). */
          label: 'Capture Full Desktop to Chat',
          click: () => {
            void attachFullDesktopToChatShell(BrowserWindow.getFocusedWindow() ?? undefined);
          },
        },
        { type: 'separator' },
        {
          label: 'Local Search Index',
          click: () => {
            const w =
              BrowserWindow.getFocusedWindow() ??
              BrowserWindow.getAllWindows().find((x) => !x.isDestroyed());
            if (!w || w.isDestroyed()) {
              return;
            }
            try {
              void w.loadURL(
                loopbackHttpUrl(FRONTEND_PORT, '/desktop-search-index'),
              );
            } catch (err) {
              console.error('[aigenius-desktop] Open Local Search Index failed:', err);
            }
          },
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'AIGenius',
      submenu: [
        {
          label: 'About',
          click: () => {
            void shell.openExternal('https://aigenius.chat');
          },
        },
        { type: 'separator' },
        {
          label: 'Settings',
          enabled: false,
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function desktopIndexerEntry(): string {
  if (app.isPackaged) {
    return path.join(desktopServerDir(), 'indexer-main.js');
  }
  return path.join(desktopServerDir(), 'dist', 'indexer-main.js');
}

async function waitForIndexerIpc(port: string, timeoutMs = 60_000): Promise<void> {
  const host = '127.0.0.1';
  const portNum = Number.parseInt(port, 10);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host, port: portNum }, () => {
        const payload = JSON.stringify({ id: 'ping', op: 'ping' });
        socket.write(`${payload}\n`);
      });
      let buffer = '';
      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        if (buffer.includes('\n')) {
          socket.end();
          resolve(true);
        }
      });
      socket.on('error', () => resolve(false));
      setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 2_000);
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Indexer IPC not ready on ${host}:${port} after ${timeoutMs}ms`);
}

async function startIndexerProcess(userDataPath: string, modelsDir: string, token: string, logsDir: string): Promise<void> {
  if (process.env.AIGENIUS_EXTERNAL_INDEXER === '0') {
    return;
  }
  const entry = desktopIndexerEntry();
  if (!fs.existsSync(entry)) {
    console.warn('[aigenius-desktop] Indexer entry missing; skipping utility process:', entry);
    return;
  }
  startIndexerUtilityProcess({
    desktopServerDir: desktopServerDir(),
    userDataPath,
    modelsDir,
    secretToken: token,
    ipcPort: INDEXER_IPC_PORT,
    logsDir,
  });
  await waitForIndexerIpc(INDEXER_IPC_PORT, 90_000);
}

type DeferredIndexerContext = {
  userDataPath: string;
  modelsDir: string;
  token: string;
  logsDir: string;
};

let deferredIndexerContext: DeferredIndexerContext | null = null;
let indexerStartScheduled = false;

/** Start the indexer utility process after the shell window has finished loading (non-blocking). */
function scheduleIndexerStartAfterShellReady(): void {
  if (indexerStartScheduled) {
    return;
  }
  indexerStartScheduled = true;
  if (process.env.AIGENIUS_EXTERNAL_INDEXER === '0' || !deferredIndexerContext) {
    return;
  }
  const ctx = deferredIndexerContext;
  console.info('[aigenius-desktop] Shell ready — starting indexer utility process in background.');
  void startIndexerProcess(ctx.userDataPath, ctx.modelsDir, ctx.token, ctx.logsDir).catch((err) => {
    console.error('[aigenius-desktop] Deferred indexer start failed:', err);
  });
}

function miniServerChildEnv(
  base: NodeJS.ProcessEnv,
  opts: {
    miniPort: string;
    userDataPath: string;
    dbPath: string;
    modelsDir: string;
    token: string;
  },
): NodeJS.ProcessEnv {
  return {
    ...base,
    PORT: opts.miniPort,
    HOST: DEV_LOOPBACK_HOST,
    AIGENIUS_FRONTEND_PORT: FRONTEND_PORT,
    DEV_WEB_PORT: FRONTEND_PORT,
    AIGENIUS_USER_DATA_PATH: opts.userDataPath,
    ...(process.env.AIGENIUS_SKIP_SEARCH === '1' ? {} : { AIGENIUS_DB_PATH: opts.dbPath }),
    AIGENIUS_MODELS_DIR: opts.modelsDir,
    AIGENIUS_TREE_SITTER: '1',
    AIGENIUS_EXTERNAL_INDEXER: process.env.AIGENIUS_EXTERNAL_INDEXER === '0' ? '0' : '1',
    AIGENIUS_INDEXER_IPC_PORT: INDEXER_IPC_PORT,
    AIGENIUS_SECRET_TOKEN: opts.token,
    AIGENIUS_UPSTREAM_API_URL: resolveUpstreamApiUrl(),
    /** Off by default in the desktop shell — set AIGENIUS_ENABLE_STT=1 to restore local Whisper. */
    AIGENIUS_ENABLE_STT: process.env.AIGENIUS_ENABLE_STT ?? '0',
    /** Active code project only unless explicitly re-enabled. */
    AIGENIUS_HOMEDIR_INDEX: process.env.AIGENIUS_HOMEDIR_INDEX ?? '0',
  };
}

async function startBackendProcesses(): Promise<void> {
  const miniPort = MINI_SERVER_PORT;
  const serverEntry = desktopServerEntry();
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'search-index.sqlite');
  const modelsDir = path.join(__dirname, 'models');

  const logsDir = app.getPath('logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const useExternalServer = process.env.AIGENIUS_EXTERNAL_MINI_SERVER === '1';
  const token = process.env.AIGENIUS_SECRET_TOKEN || SECRET_TOKEN;

  if (!useExternalServer) {
    children.push(
      spawnDesktopChild(serverEntry, {
        cwd: desktopServerDir(),
        serviceName: 'aigenius-mini-server',
        env: miniServerChildEnv(process.env, {
          miniPort,
          userDataPath,
          dbPath,
          modelsDir,
          token,
        }),
        logPath: path.join(logsDir, 'mini-server.log'),
      }),
    );
  } else {
    console.info('[aigenius-desktop] Using external mini-server (Docker). Skipping local spawn.');
  }

  if (app.isPackaged) {
    if (desktopUiMode() === 'next') {
      const { scriptPath: serverJs, cwd: nextCwd } = resolveNextStandaloneLaunch();
      children.push(
        spawnDesktopChild(serverJs, {
          cwd: nextCwd,
          serviceName: 'aigenius-next',
          env: {
            ...process.env,
            PORT: FRONTEND_PORT,
            HOSTNAME: DEV_LOOPBACK_HOST,
            NODE_ENV: 'production',
          },
          logPath: path.join(logsDir, 'frontend.log'),
        }),
      );
    } else {
      const { scriptPath: uiServer, cwd: uiCwd } = resolveDesktopUiServerLaunch();
      children.push(
        spawnDesktopChild(uiServer, {
          cwd: uiCwd,
          serviceName: 'aigenius-desktop-ui',
          env: {
            ...process.env,
            PORT: FRONTEND_PORT,
            HOSTNAME: DEV_LOOPBACK_HOST,
            AIGENIUS_DESKTOP_UI_ROOT: desktopUiStaticDir(),
            NODE_ENV: 'production',
          },
          logPath: path.join(logsDir, 'frontend.log'),
        }),
      );
    }
  }

  // Dev: Next must already be running (Tilt `web` resource). Indexer starts after the shell loads.
  const frontendWaitMs = app.isPackaged ? 120_000 : 180_000;
  await Promise.all([
    waitForHttpOk(loopbackHttpUrl(miniPort, '/health'), 60_000, 1000),
    waitForFrontendPageReady(FRONTEND_URL, frontendWaitMs, 400),
  ]);

  deferredIndexerContext = { userDataPath, modelsDir, token, logsDir };
}

/**
 * Dev: prefer `desktop/build/aigenius_icon_final.png` (what `sync-brand-icon` writes and what
 * electron-builder packages). Fall back to repo-root `aigenius_icon_final.png` if missing.
 * Packaged: PNG next to `dist/` via `package.json` build.files, then other bundle locations.
 */
function resolveWindowIconPath(): string | undefined {
  const candidates: string[] = [];
  const repoRoot = repoRootFromDesktopDist();

  if (app.isPackaged) {
    candidates.push(path.join(__dirname, '..', 'build', 'aigenius_icon_final.png'));
    candidates.push(path.join(process.resourcesPath, 'aigenius_icon_final.png'));
    candidates.push(path.join(path.dirname(app.getPath('exe')), 'aigenius_icon_final.png'));
  } else {
    // Dev Candidates
    candidates.push(path.join(__dirname, '..', 'build', 'aigenius_icon_final.png')); // desktop/build/
    candidates.push(path.join(repoRoot, 'aigenius_icon_final.png')); // repo root
    candidates.push(path.join(repoRoot, 'frontend', 'public', 'logo.png'));
    candidates.push(path.join(repoRoot, 'frontend', 'src', 'assets', 'Logomark.png'));
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.info('[aigenius-desktop] Icon found at:', p);
      return p;
    }
  }

  console.warn('[aigenius-desktop] No icon found among candidates:', candidates);
  return undefined;
}

function createNativeIcon(iconPath: string): Electron.NativeImage | undefined {
  try {
    let img = nativeImage.createFromPath(iconPath);
    if (img.isEmpty()) {
      img = nativeImage.createFromBuffer(fs.readFileSync(iconPath));
    }
    return img.isEmpty() ? undefined : img;
  } catch {
    return undefined;
  }
}

let cachedWindowIcon: Electron.NativeImage | undefined;

function getWindowIcon(): Electron.NativeImage | undefined {
  if (cachedWindowIcon !== undefined && !cachedWindowIcon.isEmpty()) {
    return cachedWindowIcon;
  }
  const iconPath = resolveWindowIconPath();
  if (iconPath === undefined) {
    return undefined;
  }
  cachedWindowIcon = createNativeIcon(iconPath);
  return cachedWindowIcon;
}

function createWindow(relativePath?: string): BrowserWindow {
  const icon = getWindowIcon();
  const preloadPath = path.join(__dirname, 'preload.js');

  const win = new BrowserWindow({
    ...mainShellBrowserWindowOptions(),
    width: 1280,
    height: 800,
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      /**
       * `false`: Chromium does not throttle timers/RAF as aggressively when the window is in the
       * background (smoother shell chrome / animations; higher idle CPU/power). Electron’s default
       * is `true`. To prefer battery/thermal behavior, set `AIGENIUS_BACKGROUND_THROTTLING=1` and
       * verify the UI still feels acceptable when unfocused.
       */
      backgroundThrottling: process.env.AIGENIUS_BACKGROUND_THROTTLING === '1',
    },
  });
  attachMainShellNavigationGuards(win);
  attachDesktopBridgeDebugLogging(win, preloadPath);

  win.on('focus', () => {
    lastFocusedMainShellWindow = win;
  });
  attachChatCompletionWindowFocusHandlers(win);

  if (!app.isPackaged) {
    win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      console.error(
        '[aigenius-desktop] did-fail-load',
        { errorCode, errorDescription, validatedURL },
      );
    });
    // Open after navigation: calling openDevTools() before loadURL is unreliable on some Linux
    // setups, and mode "detach" often opens a separate window that stays behind the shell.
    if (isDesktopDevToolsEnabled()) {
      const openDevToolsOnce = (): void => {
        if (win.isDestroyed()) {
          return;
        }
        try {
          if (!win.webContents.isDevToolsOpened()) {
            win.webContents.openDevTools();
          }
        } catch (err) {
          console.error('[aigenius-desktop] openDevTools failed', err);
        }
      };
      win.webContents.once('did-finish-load', openDevToolsOnce);
      win.webContents.once('did-fail-load', openDevToolsOnce);
    }
  }

  const url = relativePath
    ? loopbackHttpUrl(FRONTEND_PORT, relativePath.startsWith('/') ? relativePath : '/' + relativePath)
    : FRONTEND_URL;

  win.webContents.once('did-finish-load', () => {
    startupMark('window_did_finish_load');
    scheduleIndexerStartAfterShellReady();
    if (isDesktopPerfBenchmarkEnabled()) {
      void maybeRunPerfBenchmark(win).finally(() => {
        app.quit();
      });
    } else if (isDesktopPerfEnabled()) {
      startupMarkSummary();
    }
  });

  void win.loadURL(url);
  startupMark('window_created');
  return win;
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  if (DESKTOP_BRIDGE_DEBUG) {
    console.info(
      '[aigenius-desktop][bridge-debug] exit: another instance holds requestSingleInstanceLock()',
    );
  }
  app.quit();
} else {
  configureDesktopNotificationBranding();

  if (DESKTOP_BRIDGE_DEBUG) {
    console.info('[aigenius-desktop][bridge-debug] main: got single-instance lock');
  }
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) {
      if (w.isMinimized()) {
        w.restore();
      }
      w.focus();
    }
  });

  app.on('before-quit', (event) => {
    if (appShutdownStarted) {
      return;
    }
    event.preventDefault();
    appShutdownStarted = true;

    const forceExitTimer = setTimeout(() => {
      console.warn('[aigenius-desktop] Shutdown timed out; forcing exit');
      app.exit(0);
    }, 5000);

    void (async () => {
      try {
        await shutdownDesktopApp();
      } finally {
        clearTimeout(forceExitTimer);
        app.quit();
      }
    })();
  });

  ipcMain.on('open-external', (e, url: string) => {
    if (typeof url !== 'string' || (!url.startsWith('https:') && !url.startsWith('http:'))) {
      return;
    }
    if (deliverOpenExternalOrAuthUrl(e.sender, url)) {
      return;
    }
    const win = BrowserWindow.fromWebContents(e.sender);
    void (async () => {
      const { showExternalLinkApprovalDialog } = await import('./external-link-approval-dialog');
      const ok = await showExternalLinkApprovalDialog(win ?? undefined, url);
      if (ok) {
        void shell.openExternal(url);
      }
    })();
  });

  ipcMain.handle('open-file-path', async (_event, filePath: string) => {
    console.log('[aigenius-desktop][ipc] open-file-path:', filePath);
    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      return { ok: false as const, error: 'Invalid file path' };
    }
    const normalizedPath = normalizeRendererFilesystemPath(filePath.trim());
    const error = await shell.openPath(normalizedPath);
    if (error) {
      console.error('[aigenius-desktop][ipc] open-file-path error:', error);
    }
    return { ok: error === '', error };
  });

  ipcMain.handle('reveal-file-path', async (_event, filePath: string) => {
    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      return { ok: false as const, error: 'invalid' };
    }
    const normalizedPath = normalizeRendererFilesystemPath(filePath.trim());
    shell.showItemInFolder(normalizedPath);
    return { ok: true as const };
  });

  ipcMain.handle('read-local-file-preview', async (_event, filePath: string) => {
    const PREVIEW_IMAGE_MAX = 16 * 1024 * 1024;
    const PREVIEW_TEXT_MAX = 520 * 1024;
    const PROBE_UTF8_MAX = 400 * 1024;

    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      return { ok: false as const, error: 'invalid_path' };
    }
    const p = normalizeRendererFilesystemPath(filePath.trim());
    try {
      const st = await fs.promises.stat(p);
      if (!st.isFile()) {
        return { ok: false as const, error: 'not_a_file' };
      }
      const ext = path.extname(p).toLowerCase();

      const imageExt = new Set([
        '.png',
        '.jpg',
        '.jpeg',
        '.gif',
        '.webp',
        '.bmp',
        '.ico',
        '.avif',
      ]);
      const textExt = new Set([
        '.txt',
        '.md',
        '.json',
        '.csv',
        '.xml',
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '.mjs',
        '.cjs',
        '.css',
        '.html',
        '.htm',
        '.yaml',
        '.yml',
        '.log',
        '.svg',
        '.toml',
        '.ini',
        '.sql',
        '.sh',
        '.ps1',
        '.py',
        '.java',
        '.rs',
        '.go',
        '.cpp',
        '.hpp',
        '.c',
        '.h',
        '.cs',
        '.php',
        '.rb',
        '.pl',
        '.pm',
        '.t',
        '.dockerfile',
        'Dockerfile',
        '.env',
        '.gitignore',
        '.prettierrc',
        '.eslintrc',
        '.editorconfig',
      ]);

      const isPdf = ext === '.pdf';
      if (imageExt.has(ext) || isPdf) {
        if (st.size > PREVIEW_IMAGE_MAX) {
          return { ok: false as const, error: 'too_large', maxBytes: PREVIEW_IMAGE_MAX };
        }
        const buf = await fs.promises.readFile(p);
        const mimeType =
          ext === '.png'
            ? 'image/png'
            : ext === '.jpg' || ext === '.jpeg'
              ? 'image/jpeg'
              : ext === '.gif'
                ? 'image/gif'
                : ext === '.webp'
                  ? 'image/webp'
                  : ext === '.bmp'
                    ? 'image/bmp'
                    : ext === '.ico'
                      ? 'image/x-icon'
                      : ext === '.avif'
                        ? 'image/avif'
                        : ext === '.pdf'
                          ? 'application/pdf'
                          : 'application/octet-stream';
        return {
          ok: true as const,
          kind: 'image' as const,
          mimeType,
          base64: buf.toString('base64'),
        };
      }

      const allowTextByExt = textExt.has(ext);
      const allowSmallProbe = st.size <= PROBE_UTF8_MAX;
      if (allowTextByExt || allowSmallProbe) {
        if (st.size > PREVIEW_TEXT_MAX) {
          return { ok: false as const, error: 'too_large', maxBytes: PREVIEW_TEXT_MAX };
        }
        const buf = await fs.promises.readFile(p);
        const text = buf.toString('utf8');
        return {
          ok: true as const,
          kind: 'text' as const,
          mimeType: 'text/plain; charset=utf-8',
          text,
        };
      }

      return { ok: true as const, kind: 'binary' as const, mimeType: 'application/octet-stream', size: st.size };
    } catch (err) {
      console.error('[aigenius-desktop][ipc] read-local-file-preview failed', err);
      return { ok: false as const, error: 'io_error' };
    }
  });

  ipcMain.handle('get-local-search-index-state', async () => fetchLocalSearchIndexState());

  ipcMain.handle('get-chat-runtime-context', async () => {
    console.log('[aigenius-desktop][ipc] get-chat-runtime-context started');
    try {
      const context = await getChatRuntimeContextForIpc();
      console.log('[aigenius-desktop][ipc] get-chat-runtime-context success', {
        platform: context.desktopHost.platform,
        catalogSize: context.retrievalMemoryCatalog.entries.length
      });
      return context;
    } catch (err) {
      console.error('[aigenius-desktop][ipc] get-chat-runtime-context failed', err);
      return {
        desktopHost: {
          platform: process.platform,
          arch: process.arch,
          release: os.release(),
          userHomeDir: USER_HOME_DIR_AT_STARTUP,
        },
        retrievalMemoryCatalog: {
          generatedAtIso: new Date().toISOString(),
          entries: [],
        },
      };
    }
  });

  ipcMain.handle('tool-permissions:sync', async (_event, prefs: unknown) => {
    return applySyncedToolPermissionPreferences(prefs);
  });

  ipcMain.handle('pick-project-directory', async () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select project folder',
    });
    if (result.canceled || !result.filePaths[0]) {
      return null;
    }
    return { path: result.filePaths[0] };
  });

  ipcMain.handle('sync-active-editor', (_event, payload: unknown) => {
    if (!payload || typeof payload !== 'object') {
      setMainActiveEditor(null);
      return { ok: true };
    }
    const p = payload as Record<string, unknown>;
    const filePath = typeof p.path === 'string' ? p.path : '';
    if (!filePath) {
      setMainActiveEditor(null);
      return { ok: true };
    }
    setMainActiveEditor({
      path: filePath,
      name: typeof p.name === 'string' ? p.name : path.basename(filePath),
      line: typeof p.line === 'number' ? p.line : 1,
      character: typeof p.character === 'number' ? p.character : 1,
      selection: typeof p.selection === 'string' ? p.selection : undefined,
    });
    return { ok: true };
  });

  ipcMain.handle(
    'set-code-project-index',
    async (_event, payload: { projectId: string; rootPath: string } | null) => {
      setActiveCodeProjectIndex(payload);
      if (!payload?.rootPath) {
        return { ok: true };
      }

      saveLastCodeProject(app.getPath('userData'), {
        projectId: payload.projectId,
        rootPath: payload.rootPath,
      });

      try {
        const port = MINI_SERVER_PORT;
        const token = process.env.AIGENIUS_SECRET_TOKEN;
        if (!token) {
          console.warn('[aigenius-desktop] set-code-project-index: missing AIGENIUS_SECRET_TOKEN');
          return { ok: false, error: 'missing_secret_token' };
        }

        const switchRes = await fetch(loopbackHttpUrl(port, '/search/switch-project'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            projectId: payload.projectId,
            rootPath: payload.rootPath,
          }),
        });
        if (!switchRes.ok) {
          console.warn('[aigenius-desktop] switch-project returned', switchRes.status);
          return { ok: false, error: `switch-project:${switchRes.status}` };
        }

        const res = await fetch(loopbackHttpUrl(port, '/search/index-project'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ rootPath: payload.rootPath, force: false }),
        });
        if (!res.ok) {
          console.warn('[aigenius-desktop] index-project returned', res.status);
          return { ok: false, error: `index-project:${res.status}` };
        }

        if (payload.projectId) {
          refreshProjectArchitectureMemory(
            payload.projectId,
            payload.rootPath,
            path.basename(payload.rootPath) || payload.projectId,
          );
        }

        return { ok: true };
      } catch (err) {
        console.warn('[aigenius-desktop] index-project failed', err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'index-project_failed',
        };
      }
    },
  );

  ipcMain.handle(
    'local-desktop-tool',
    async (
      event,
      payload: { tool?: string; arguments?: Record<string, unknown>; shellStreamId?: string },
    ) => {
      if (!payload || typeof payload.tool !== 'string') {
        return { ok: false as const, error: 'Invalid tool payload' };
      }
      const shellStreamId =
        (payload.tool === 'run_command' || payload.tool === 'local_shell' || payload.tool === 'local_ollama_chat') &&
          typeof payload.shellStreamId === 'string' &&
          payload.shellStreamId.length > 0
          ? payload.shellStreamId
          : undefined;
      return runLocalDesktopTool(event.sender, payload.tool, payload.arguments ?? {}, shellStreamId);
    },
  );

  ipcMain.handle('get-upstream-api-url', async () => resolveUpstreamApiUrl());

  ipcMain.handle('get-desktop-refresh-token', async () => readDesktopRefreshToken());
  ipcMain.handle('set-desktop-refresh-token', async (_event, token: unknown) => {
    if (typeof token !== 'string' || token.trim().length === 0) {
      clearDesktopRefreshToken();
      return { ok: false as const };
    }
    storeDesktopRefreshToken(token);
    return { ok: true as const };
  });
  ipcMain.handle('clear-desktop-auth-secrets', async () => {
    clearDesktopRefreshToken();
    return { ok: true as const };
  });

  ipcMain.handle('web-signin', async (event) => runDesktopBrowserSignIn(event));
  ipcMain.handle('start-oauth-signin', async (event, options?: { provider?: 'google' }) =>
    runDesktopBrowserSignIn(event, options?.provider === 'google' ? { autoProvider: 'google' } : {}),
  );

  ipcMain.handle('shell-new-window', async (_event, relativePath?: string) => {
    const w = createWindow(relativePath);
    w.focus();
  });

  ipcMain.handle('chat-completion-notify', (event, payload: unknown) => {
    if (!payload || typeof payload !== 'object') {
      return { notified: false };
    }
    const { modelName, preview } = payload as ChatCompletionNotifyPayload;
    if (typeof preview !== 'string') {
      return { notified: false };
    }
    return notifyChatCompletionIfBackground(event.sender, {
      modelName: typeof modelName === 'string' ? modelName : undefined,
      preview,
    });
  });

  ipcMain.handle('capture-window-png-for-chat', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) {
      return { ok: false as const, error: 'No window' };
    }
    const cap = await captureBrowserWindowPngBase64(win);
    if ('error' in cap) {
      return { ok: false as const, error: cap.error };
    }
    return {
      ok: true as const,
      base64: cap.base64,
      mimeType: 'image/png',
      basename: defaultScreenshotBasename(),
    };
  });

  app.whenReady().then(async () => {
    startupMark('app_when_ready');
    createMenu();

    // Check system limits (Linux only)
    const limitCheck = checkInotifyLimit();
    if (limitCheck && !limitCheck.isSufficient) {
      const { dialog, clipboard } = await import('electron');
      const choice = dialog.showMessageBoxSync({
        type: 'warning',
        title: 'System Limit Warning',
        message: `Your system's file watcher limit (inotify) is too low (${limitCheck.currentValue}).`,
        detail: `The AIGenius search engine needs to watch more files than the system allows. This can cause search to fail or the app to crash.\n\nRecommended: ${limitCheck.recommendedValue}\n\nWould you like to copy the fix command to your clipboard?`,
        buttons: ['Copy & Close', 'Ignore'],
        defaultId: 0,
      });

      if (choice === 0) {
        clipboard.writeText(limitCheck.fixCommand);
      }
    }

    const iconPathForDock = resolveWindowIconPath();
    const appIcon = getWindowIcon();
    setChatCompletionNotificationIcon(appIcon ?? iconPathForDock);
    if (iconPathForDock && process.platform === 'darwin') {
      try {
        app.dock.setIcon(iconPathForDock);
      } catch {
        /* ignore */
      }
    }

    try {
      await startBackendProcesses();
    } catch (err) {
      console.error(err);
      const { dialog } = await import('electron');
      await dialog.showErrorBox(
        'AIGenius',
        app.isPackaged
          ? `Could not start the local app server.\n\n${String(err)}`
          : [
            'Development: the mini-server or the Next UI is not ready.',
            '',
            `Terminal 1 (leave running): cd frontend && npx next dev -p ${FRONTEND_PORT}`,
            `Terminal 2: cd desktop && npm run dev`,
            '',
            `(After the first successful setup you can use npm run dev:quick in desktop/ if desktop-server is already built.)`,
            '',
            String(err),
          ].join('\n'),
      );
      app.quit();
      return;
    }
    startupMark('backend_processes_ready');

    // Setup crash handlers
    setupCrashHandlers();

    initLocalRetrievalMemory(app.getPath('userData'));
    const lastProject = loadLastCodeProject(app.getPath('userData'));
    if (lastProject?.projectId && lastProject?.rootPath) {
      setActiveCodeProjectIndex({
        projectId: lastProject.projectId,
        rootPath: lastProject.rootPath,
      });
    }
    await loadToolPermissionPreferences();
    registerIpcHandlers();
    registerAudioRecorderHandlers();
    startupMark('ipc_handlers_registered');

    const registeredGlobalShot = globalShortcut.register(CHAT_SCREENSHOT_GLOBAL_ACCELERATOR, () => {
      void attachFullDesktopToChatShell(null);
    });
    if (!registeredGlobalShot) {
      console.warn(
        '[aigenius-desktop] Could not register global screenshot shortcut (in use by the OS or another app):',
        CHAT_SCREENSHOT_GLOBAL_ACCELERATOR,
      );
    }

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });

    // Handle microphone/camera permission requests in Electron shell
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      const allowed = ['media', 'audioCapture', 'notifications'];
      if (allowed.includes(permission)) {
        return callback(true);
      }
      callback(false);
    });
  });

  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}
