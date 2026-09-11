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

/**
 * Local HTML permission modals (shell / patch / external link).
 *
 * On Windows/Linux the main shell is frameless with window-controls overlay. A modal child
 * of that parent often paints as a blank dark sheet even when the child has its own frame.
 * Use a framed, non-modal auxiliary window centered over the parent instead.
 */
export function approvalDialogBrowserWindowOptions(
  parent: BrowserWindow | undefined,
  base: BrowserWindowConstructorOptions,
): BrowserWindowConstructorOptions {
  if (process.platform === 'darwin') {
    return auxiliaryBrowserWindowOptions(parent, base);
  }
  return withAppWindowIcon({
    ...base,
    frame: true,
    parent: undefined,
    modal: false,
    show: false,
    skipTaskbar: true,
    autoHideMenuBar: true,
  });
}

/** Center a small auxiliary window over its parent (non-modal approval dialogs). */
export function centerAuxiliaryWindowOverParent(
  win: BrowserWindow,
  parent: BrowserWindow | undefined,
): void {
  if (!parent || parent.isDestroyed()) {
    win.center();
    return;
  }
  const parentBounds = parent.getBounds();
  const winBounds = win.getBounds();
  win.setPosition(
    Math.round(parentBounds.x + (parentBounds.width - winBounds.width) / 2),
    Math.round(parentBounds.y + (parentBounds.height - winBounds.height) / 2),
  );
}

/**
 * Reveal small local HTML approval dialogs after dom-ready.
 * ready-to-show alone can surface a blank framed window on Windows before paint.
 */
export function showApprovalDialogWhenReady(win: BrowserWindow): void {
  let revealed = false;
  const reveal = (): void => {
    if (revealed || win.isDestroyed()) {
      return;
    }
    revealed = true;
    setTimeout(() => {
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
    }, 48);
  };

  if (win.webContents.isLoading()) {
    win.webContents.once('dom-ready', reveal);
    return;
  }
  reveal();
}

/** Show a hidden auxiliary window once its HTML is ready (dialogs, OAuth popups). */
export function showAuxiliaryWindowWhenReady(win: BrowserWindow): void {
  let revealed = false;
  const reveal = (): void => {
    if (revealed || win.isDestroyed()) {
      return;
    }
    revealed = true;
    setTimeout(() => {
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
    }, 16);
  };

  win.once('ready-to-show', reveal);
  win.webContents.once('did-finish-load', reveal);

  if (!win.webContents.isLoading()) {
    reveal();
  }
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
