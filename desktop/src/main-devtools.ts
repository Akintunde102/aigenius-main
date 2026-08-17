import fs from 'fs';
import type { BrowserWindow } from 'electron';

export const DESKTOP_BRIDGE_DEBUG = process.env.AIGENIUS_DESKTOP_BRIDGE_DEBUG === '1';

/**
 * Works while other apps are focused (unlike menu accelerators). Keep in sync with any docs/tooltips.
 * If registration fails (OS reserved / conflict), use View → Attach Window Screenshot to Chat.
 */
const CHAT_SCREENSHOT_GLOBAL_ACCELERATOR = 'CommandOrControl+Alt+S';

export function isDesktopDevToolsEnabled(): boolean {
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
export function attachDesktopBridgeDebugLogging(win: BrowserWindow, preloadPath: string): void {
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
