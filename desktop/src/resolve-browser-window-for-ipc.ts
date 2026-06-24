import { BrowserWindow } from 'electron';
import type { WebContents } from 'electron';

type BrowserWindowClass = typeof BrowserWindow;

/**
 * Resolves the app window that should own permission dialogs for an IPC `sender`.
 * `BrowserWindow.fromWebContents` can be null for DevTools webContents or some embed paths;
 * fall back to focused / first app window so approval UIs still attach and show modally when possible.
 */
export function resolveBrowserWindowForIpcSender(sender: WebContents): BrowserWindow | undefined {
  if (sender.isDestroyed()) {
    return undefined;
  }

  const direct = BrowserWindow.fromWebContents(sender);
  if (direct && !direct.isDestroyed()) {
    return direct;
  }

  const fromDevTools = (BrowserWindow as BrowserWindowClass & {
    fromDevToolsWebContents?: (wc: WebContents) => BrowserWindow | null;
  }).fromDevToolsWebContents?.(sender);
  if (fromDevTools && !fromDevTools.isDestroyed()) {
    return fromDevTools;
  }

  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) {
    return focused;
  }

  const all = BrowserWindow.getAllWindows();
  const owner = all.find((w) => !w.isDestroyed() && w.webContents === sender);
  if (owner) {
    return owner;
  }

  return all.find((w) => !w.isDestroyed());
}
