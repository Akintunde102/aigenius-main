import {
  app,
  BrowserWindow,
  nativeImage,
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

export function resolveWindowIconPath(): string | undefined {
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

export function createWindow(relativePath?: string): BrowserWindow {
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
    setLastFocusedMainShellWindow(win);
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
    try {
      // Keep page zoom fixed so trackpad pinch emits wheel events the chat UI can handle.
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
  });

  const loadShellUrl = (): void => {
    void win.loadURL(url);
  };

  if (!app.isPackaged) {
    console.info(
      `[aigenius-desktop] dev shell loading live Next.js at ${url} (not packaged Vite desktop-renderer)`,
    );
    void session.defaultSession.clearCache().then(loadShellUrl).catch(loadShellUrl);
  } else {
    loadShellUrl();
  }
  startupMark('window_created');
  return win;
}
