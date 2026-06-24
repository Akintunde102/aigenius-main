import 'dotenv/config';

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
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
import { initLocalRetrievalMemory } from './local-retrieval-memory';
import { attachMainShellNavigationGuards, deliverOpenExternalOrAuthUrl } from './navigation-guards';
import { mainShellBrowserWindowOptions } from './shell-chrome';
import { registerIpcHandlers } from './search';
import { registerAudioRecorderHandlers } from './audio-recorder-handler';
import { setupCrashHandlers } from './crash-handler';
import { checkInotifyLimit } from './utils/sys-limits';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import http from 'http';
import os from 'os';
import crypto from 'crypto';

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

const MINI_SERVER_PORT = process.env.AIGENIUS_MINI_SERVER_PORT ?? '8001';
const FRONTEND_PORT = process.env.AIGENIUS_FRONTEND_PORT ?? '3001';
/** Secure token for local sidecar communication. */
const SECRET_TOKEN = crypto.randomBytes(32).toString('hex');
process.env.AIGENIUS_SECRET_TOKEN = SECRET_TOKEN;

if (!SECRET_TOKEN) {
  console.error('[aigenius-desktop] CRITICAL: Failed to generate SECRET_TOKEN. Local tools will be unavailable.');
}
/** Must match frontend `DESKTOP_SHELL_ENTRY_QUERY_PARAM` (longer preload poll on this route). */
const FRONTEND_URL = `http://127.0.0.1:${FRONTEND_PORT}/desktop-login?aigenius_shell=1`;
const WEBSITE_LOGIN_URL = 'http://localhost:3001/login';

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

const children: ChildProcess[] = [];

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

function nextStandaloneDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'next-standalone');
  }
  return path.join(repoRootFromDesktopDist(), 'frontend', '.next', 'standalone');
}

function nextServerScript(): string {
  return path.join(nextStandaloneDir(), 'server.js');
}

function spawnAsNode(scriptPath: string, opts: { cwd: string; env: NodeJS.ProcessEnv; logPath?: string }): ChildProcess {
  const env = { ...opts.env };
  env.ELECTRON_RUN_AS_NODE = '1';

  let stdioConfig: any = 'inherit';
  let outStream: fs.WriteStream | null = null;
  if (opts.logPath) {
    try {
      outStream = fs.createWriteStream(opts.logPath, { flags: 'a' });
      outStream.on('error', (err) => {
        console.error(`[aigenius-desktop] Log write stream error for ${opts.logPath}:`, err);
      });
      stdioConfig = ['ignore', 'pipe', 'pipe'];
    } catch (err) {
      console.error(`[aigenius-desktop] Failed to create log stream for ${opts.logPath}:`, err);
    }
  }

  // Use the same Node version as Electron (bundled) to avoid host Node incompatibility (e.g. Node 24 vs Electron's Node 22)
  const child = spawn(process.execPath, [scriptPath], {
    cwd: opts.cwd,
    env,
    stdio: stdioConfig,
  });

  if (outStream && child.stdout && child.stderr) {
    const stream = outStream;
    child.stdout.on('data', (chunk: Buffer) => {
      process.stdout.write(chunk);
      if (stream.writable) stream.write(chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      process.stderr.write(chunk);
      if (stream.writable) stream.write(chunk);
    });
    child.on('close', () => stream.end());
  }

  children.push(child);
  return child;
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
    if (!c.killed) {
      c.kill('SIGTERM');
    }
  }
  children.length = 0;
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
                `http://127.0.0.1:${FRONTEND_PORT}/desktop-search-index`,
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
    spawnAsNode(serverEntry, {
      cwd: desktopServerDir(),
      env: {
        ...process.env,
        PORT: miniPort,
        HOST: '127.0.0.1',
        AIGENIUS_USER_DATA_PATH: userDataPath,
        ...(process.env.AIGENIUS_SKIP_SEARCH === '1' ? {} : { AIGENIUS_DB_PATH: dbPath }),
        AIGENIUS_MODELS_DIR: modelsDir,
        AIGENIUS_SEARCH_WORKERS: '1',
        AIGENIUS_SEARCH_IMAGES: process.env.AIGENIUS_SEARCH_IMAGES || '1',
        AIGENIUS_SECRET_TOKEN: token,
      },
      logPath: path.join(logsDir, 'mini-server.log'),
    });
  } else {
    console.info('[aigenius-desktop] Using external mini-server (Docker). Skipping local spawn.');
  }


  await waitForHttpOk(
    `http://127.0.0.1:${miniPort}/health`,
    60_000,
    1000,
  );

  if (app.isPackaged) {
    const nextRoot = nextStandaloneDir();
    const serverJs = nextServerScript();
    spawnAsNode(serverJs, {
      cwd: nextRoot,
      env: {
        ...process.env,
        PORT: FRONTEND_PORT,
        HOSTNAME: '127.0.0.1',
        NODE_ENV: 'production',
      },
      logPath: path.join(logsDir, 'frontend.log'),
    });
  }

  // Dev: Next must already be running (e.g. `npm run dev` starts it in parallel). Packaged: we
  // spawned standalone above. Avoid loadURL before the UI is reachable (ERR_CONNECTION_REFUSED).
  const frontendWaitMs = app.isPackaged ? 120_000 : 180_000;
  await waitForFrontendPageReady(FRONTEND_URL, frontendWaitMs, 400);
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
    ? `http://127.0.0.1:${FRONTEND_PORT}${relativePath.startsWith('/') ? relativePath : '/' + relativePath}`
    : FRONTEND_URL;

  void win.loadURL(url);
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
  // Set identity for Linux window managers / taskbars
  app.setName('AIGenius');

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
    // Hold the quit so the sidecar has time to flush the SQLite WAL checkpoint.
    // We prevent default, send the shutdown signal, wait for the response (or a
    // 2 s hard deadline), kill the child processes, then re-trigger quit.
    event.preventDefault();
    void (async () => {
      try {
        await fetch(`http://127.0.0.1:${MINI_SERVER_PORT}/search/shutdown`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${SECRET_TOKEN}`, 'Content-Length': '0' },
          signal: AbortSignal.timeout(2000),
        });
      } catch {
        /* sidecar may already be gone or not started — always proceed */
      }
      killChildren();
      // Remove this listener before re-triggering to avoid an infinite loop.
      app.quit();
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

  ipcMain.handle('web-signin', async (event) => {
    return new Promise((resolve) => {
      const server = http.createServer((req, res) => {
        const u = new URL(req.url || '', `http://${req.headers.host}`);
        const token = u.searchParams.get('token');

        if (token) {
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
                  <p>AIGenius Desktop has been authenticated. We are taking you back to the website...</p>
                  <div class="spinner"></div>
                </div>
              </body>
            </html>
          `);
          server.close();

          // Bring the app window to focus
          const win = BrowserWindow.fromWebContents(event.sender);
          if (win) {
            if (win.isMinimized()) win.restore();
            win.show();
            win.focus();
          }

          resolve({ token });
        } else {
          res.writeHead(400);
          res.end('Missing token');
        }
      });

      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        const port = addr.port;
        const callbackUrl = `http://127.0.0.1:${port}/`;
        const authUrl = `${WEBSITE_LOGIN_URL}?desktop_callback=${encodeURIComponent(callbackUrl)}`;
        void shell.openExternal(authUrl);
      });

      server.on('error', (err) => {
        console.error('[aigenius-desktop] Web sign-in server error:', err);
        resolve(null);
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        if (server.listening) {
          server.close();
          resolve(null);
        }
      }, 5 * 60 * 1000);
    });
  });

  ipcMain.handle('shell-new-window', async (_event, relativePath?: string) => {
    const w = createWindow(relativePath);
    w.focus();
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

    // Setup crash handlers
    setupCrashHandlers();

    initLocalRetrievalMemory(app.getPath('userData'));
    registerIpcHandlers();
    registerAudioRecorderHandlers();

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
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}
