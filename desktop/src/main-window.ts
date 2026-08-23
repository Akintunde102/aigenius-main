import {
  app,
  BrowserWindow,
  nativeImage,
  net,
  session,
} from 'electron';
import fs from 'fs';
import path from 'path';
import { attachMainShellNavigationGuards } from './navigation-guards';
import { mainShellBrowserWindowOptions } from './shell-chrome';
import { loopbackHttpUrl } from './loopback-host';
import { attachChatCompletionWindowFocusHandlers } from './chat-completion-notifications';
import {
  isDesktopPerfBenchmarkEnabled,
  isDesktopPerfEnabled,
  maybeRunPerfBenchmark,
  startupMark,
  startupMarkSummary,
} from './perf';
import { setLastFocusedMainShellWindow } from './main-shell-focus';
import { scheduleIndexerStartAfterShellReady } from './main-backend-lifecycle';
import { attachDesktopBridgeDebugLogging, isDesktopDevToolsEnabled } from './main-devtools';
import { FRONTEND_PORT, FRONTEND_URL, repoRootFromDesktopDist } from './main-backend-lifecycle';
import { createShellBootDataUrl, isShellBootDataUrl } from './shell-boot-page';
import { desktopUiAppUrl, shouldUseDesktopUiCustomProtocol } from './desktop-ui-mode';

export function resolveWindowIconPath(): string | undefined {
  const candidates: string[] = [];
  const repoRoot = repoRootFromDesktopDist();

  if (app.isPackaged) {
    candidates.push(path.join(__dirname, '..', 'build', 'aigenius_icon_final.png'));
    candidates.push(path.join(process.resourcesPath, 'aigenius_icon_final.png'));
    candidates.push(path.join(path.dirname(app.getPath('exe')), 'aigenius_icon_final.png'));
  } else {
    candidates.push(path.join(__dirname, '..', 'build', 'aigenius_icon_final.png'));
    candidates.push(path.join(repoRoot, 'aigenius_icon_final.png'));
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
let mainShellWindowsCreated = 0;
let devSessionCacheCleared = false;

async function prefetchShellUrl(url: string): Promise<void> {
  try {
    const response = await net.fetch(url);
    await response.text();
  } catch (err) {
    console.warn('[aigenius-desktop] shell prefetch failed', { url, err });
  }
}

export function getWindowIcon(): Electron.NativeImage | undefined {
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

export function resolveMainShellAppUrl(relativePath?: string): string {
  if (shouldUseDesktopUiCustomProtocol()) {
    const rel = relativePath
      ? relativePath.startsWith('/')
        ? relativePath
        : `/${relativePath}`
      : '/desktop-login';
    return desktopUiAppUrl(rel);
  }
  return relativePath
    ? loopbackHttpUrl(FRONTEND_PORT, relativePath.startsWith('/') ? relativePath : '/' + relativePath)
    : FRONTEND_URL;
}

function attachShellPageReadyHandler(win: BrowserWindow): void {
  const onShellPageReady = (): void => {
    if (win.isDestroyed()) {
      return;
    }
    if (isShellBootDataUrl(win.webContents.getURL())) {
      return;
    }
    win.webContents.removeListener('did-finish-load', onShellPageReady);
    startupMark('window_did_finish_load');
    try {
      win.webContents.setVisualZoomLevelLimits(1, 1);
    } catch (err) {
      console.warn('[aigenius-desktop] setVisualZoomLevelLimits failed', err);
    }
    scheduleIndexerStartAfterShellReady();
    if (isDesktopPerfBenchmarkEnabled()) {
      void maybeRunPerfBenchmark(win).finally(() => {
        app.quit();
      });
    } else if (isDesktopPerfEnabled()) {
      startupMarkSummary();
    }
  };
  win.webContents.on('did-finish-load', onShellPageReady);
}

function shouldClearDevSessionCache(): boolean {
  return process.env.AIGENIUS_DEV_CLEAR_CACHE === '1';
}

export type CreateWindowOptions = {
  /** Load boot splash only; call `navigateMainShellToApp` when sidecars are ready. */
  deferAppLoad?: boolean;
  relativePath?: string;
};

export function createWindow(relativePath?: string): BrowserWindow;
export function createWindow(options?: CreateWindowOptions): BrowserWindow;
export function createWindow(relativePathOrOptions?: string | CreateWindowOptions): BrowserWindow {
  const options: CreateWindowOptions =
    typeof relativePathOrOptions === 'string'
      ? { relativePath: relativePathOrOptions }
      : (relativePathOrOptions ?? {});
  const { deferAppLoad = false, relativePath } = options;
  const isAdditionalWindow = mainShellWindowsCreated > 0;
  mainShellWindowsCreated += 1;

  const icon = getWindowIcon();
  const preloadPath = path.join(__dirname, 'preload.js');
  const appUrl = resolveMainShellAppUrl(relativePath);

  const win = new BrowserWindow({
    ...mainShellBrowserWindowOptions(),
    width: 1280,
    height: 800,
    show: false,
    ...(icon ? { icon } : {}),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      /** Default on (Electron/Chromium). Set `AIGENIUS_BACKGROUND_THROTTLING=0` for legacy smooth-unfocused behavior. */
      backgroundThrottling: process.env.AIGENIUS_BACKGROUND_THROTTLING !== '0',
    },
  });

  win.once('ready-to-show', () => {
    if (!win.isDestroyed()) {
      win.show();
    }
  });

  attachMainShellNavigationGuards(win);
  attachDesktopBridgeDebugLogging(win, preloadPath);

  win.on('focus', () => {
    setLastFocusedMainShellWindow(win);
  });
  attachChatCompletionWindowFocusHandlers(win);
  attachShellPageReadyHandler(win);

  win.once('ready-to-show', () => {
    if (!win.isDestroyed()) {
      win.show();
    }
  });

  if (!app.isPackaged) {
    win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
      console.error(
        '[aigenius-desktop] did-fail-load',
        { errorCode, errorDescription, validatedURL },
      );
    });
    if (isDesktopDevToolsEnabled()) {
      const openDevToolsOnce = (): void => {
        if (win.isDestroyed() || isShellBootDataUrl(win.webContents.getURL())) {
          return;
        }
        win.webContents.removeListener('did-finish-load', openDevToolsOnce);
        try {
          if (!win.webContents.isDevToolsOpened()) {
            win.webContents.openDevTools();
          }
        } catch (err) {
          console.error('[aigenius-desktop] openDevTools failed', err);
        }
      };
      win.webContents.on('did-finish-load', openDevToolsOnce);
      win.webContents.once('did-fail-load', openDevToolsOnce);
    }
  }

  const loadShellUrl = (): void => {
    if (deferAppLoad || isAdditionalWindow) {
      const sessionRestoreHint = !relativePath;
      void win.loadURL(createShellBootDataUrl(sessionRestoreHint));
      if (!deferAppLoad && isAdditionalWindow) {
        void prefetchShellUrl(appUrl).then(() => {
          if (!win.isDestroyed()) {
            void win.loadURL(appUrl);
          }
        });
      }
      return;
    }
    void win.loadURL(appUrl);
  };

  if (!app.isPackaged) {
    console.info(
      `[aigenius-desktop] dev shell loading live Next.js at ${appUrl} (not packaged Vite desktop-renderer)`,
    );
    if (shouldClearDevSessionCache() && !devSessionCacheCleared) {
      devSessionCacheCleared = true;
      void session.defaultSession.clearCache().then(loadShellUrl).catch(loadShellUrl);
    } else {
      loadShellUrl();
    }
  } else {
    loadShellUrl();
  }

  startupMark('window_created');
  return win;
}

/** Navigate the main shell from boot splash to the real app URL once sidecars are ready. */
export async function navigateMainShellToApp(
  win: BrowserWindow,
  relativePath?: string,
): Promise<void> {
  if (win.isDestroyed()) {
    return;
  }
  const url = resolveMainShellAppUrl(relativePath);
  if (!isShellBootDataUrl(win.webContents.getURL()) && win.webContents.getURL() === url) {
    return;
  }
  await prefetchShellUrl(url);
  if (!win.isDestroyed()) {
    await win.loadURL(url);
  }
}
