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
let mainShellWindowsCreated = 0;
let devSessionCacheCleared = false;

function shellBootDataUrl(sessionRestoreHint: boolean): string {
  const subtitle = sessionRestoreHint
    ? '<p class="sub">Verifying your saved session…</p>'
    : '';
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><style>
html,body{margin:0;height:100%;background:#0c0d0f;color:#d4d4d8;font-family:system-ui,-apple-system,sans-serif}
.wrap{display:flex;height:100%;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px}
.spin{width:28px;height:28px;border:2px solid rgba(34,211,238,0.2);border-top-color:#22d3ee;border-radius:50%;animation:r .8s linear infinite;margin-bottom:20px}
@keyframes r{to{transform:rotate(360deg)}}
p{font-size:14px;font-weight:500;color:#d4d4d8;margin:0}
.sub{font-size:12px;line-height:1.5;color:#71717a;margin-top:8px;max-width:18rem}
</style></head><body><div class="wrap"><div class="spin" role="status" aria-label="Loading"></div><p>Opening AIGenius…</p>${subtitle}</div></body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

async function prefetchShellUrl(url: string): Promise<void> {
  try {
    const response = await net.fetch(url);
    await response.text();
  } catch (err) {
    console.warn('[aigenius-desktop] shell prefetch failed', { url, err });
  }
}

function isShellBootDataUrl(url: string): boolean {
  return url.startsWith('data:text/html');
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

export function createWindow(relativePath?: string): BrowserWindow {
  const isAdditionalWindow = mainShellWindowsCreated > 0;
  mainShellWindowsCreated += 1;

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
        if (isShellBootDataUrl(win.webContents.getURL())) {
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

  const url = relativePath
    ? loopbackHttpUrl(FRONTEND_PORT, relativePath.startsWith('/') ? relativePath : '/' + relativePath)
    : FRONTEND_URL;

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
  };

  win.webContents.on('did-finish-load', onShellPageReady);

  const loadShellUrl = (): void => {
    if (isAdditionalWindow) {
      const sessionRestoreHint = !relativePath;
      void win.loadURL(shellBootDataUrl(sessionRestoreHint));
      void prefetchShellUrl(url).then(() => {
        if (!win.isDestroyed()) {
          void win.loadURL(url);
        }
      });
      return;
    }
    void win.loadURL(url);
  };

  if (!app.isPackaged) {
    console.info(
      `[aigenius-desktop] dev shell loading live Next.js at ${url} (not packaged Vite desktop-renderer)`,
    );
    if (!devSessionCacheCleared) {
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
