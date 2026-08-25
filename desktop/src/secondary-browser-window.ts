import type { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';
import { getWindowIcon } from './main-window';

/** Apply the app icon so auxiliary windows do not flash the generic Electron dock icon. */
export function withAppWindowIcon(
  options: BrowserWindowConstructorOptions,
): BrowserWindowConstructorOptions {
  const icon = getWindowIcon();
  if (!icon || icon.isEmpty()) {
    return options;
  }
  return { ...options, icon };
}

/**
 * Chrome for dialogs / popups: parented, hidden until ready, not listed in the taskbar.
 * macOS still uses one dock icon per app bundle; this avoids orphan top-level windows.
 */
export function auxiliaryBrowserWindowOptions(
  parent: BrowserWindow | undefined,
  base: BrowserWindowConstructorOptions,
): BrowserWindowConstructorOptions {
  return withAppWindowIcon({
    ...base,
    parent: parent ?? undefined,
    modal: Boolean(parent),
    show: false,
    skipTaskbar: true,
    autoHideMenuBar: true,
  });
}

/** Show a hidden auxiliary window once its HTML is ready (dialogs, OAuth popups). */
export function showAuxiliaryWindowWhenReady(win: BrowserWindow): void {
  const reveal = (): void => {
    if (win.isDestroyed()) {
      return;
    }
    if (!win.isVisible()) {
      win.show();
    }
    try {
      win.focus();
    } catch {
      /* ignore */
    }
  };

  if (win.webContents.isLoading()) {
    win.once('ready-to-show', reveal);
    return;
  }
  reveal();
}

/**
 * Global hook: every BrowserWindow gets the branded icon; child windows stay parented.
 * Call once from main before creating windows.
 */
export function registerSecondaryBrowserWindowPolicy(app: Electron.App): void {
  app.on('browser-window-created', (_event, win) => {
    const icon = getWindowIcon();
    if (icon && !icon.isEmpty()) {
      try {
        win.setIcon(icon);
      } catch {
        /* ignore */
      }
    }

    const parent = win.getParentWindow();
    if (!parent) {
      return;
    }

    try {
      win.setSkipTaskbar(true);
    } catch {
      /* Windows / Linux only */
    }
  });
}
