/**
 * Reveal a BrowserWindow that was created with `show: false`.
 *
 * On Windows, frameless windows with `titleBarOverlay` often never emit
 * `ready-to-show` (https://github.com/electron/electron/issues/42409). Relying
 * on that event alone leaves the shell running with no HWND — Tilt looks Ready
 * but the app never appears.
 */

export type ShowableBrowserWindow = {
  isDestroyed(): boolean;
  isVisible(): boolean;
  show(): void;
  focus(): void;
  moveTop?: () => void;
  setAlwaysOnTop?: (value: boolean) => void;
  once(event: 'ready-to-show', listener: () => void): void;
  webContents: {
    isLoading(): boolean;
    once(event: 'did-finish-load' | 'did-fail-load', listener: () => void): void;
  };
};

export type AttachShowWindowWhenReadyOptions = {
  /** Last-resort timer if Chromium never paints. Default 1000ms. */
  fallbackMs?: number;
};

export function revealShowableWindow(win: ShowableBrowserWindow): boolean {
  if (win.isDestroyed()) {
    return false;
  }
  try {
    if (!win.isVisible()) {
      win.show();
    }
    win.moveTop?.();
    // Windows often blocks SetForegroundWindow for processes started by Tilt.
    // Pulsing always-on-top is the reliable way to surface the shell.
    win.setAlwaysOnTop?.(true);
    win.setAlwaysOnTop?.(false);
    win.focus();
    return true;
  } catch (err) {
    console.warn('[aigenius-desktop] failed to show window', err);
    return false;
  }
}

export function attachShowWindowWhenReady(
  win: ShowableBrowserWindow,
  options: AttachShowWindowWhenReadyOptions = {},
): void {
  const fallbackMs = options.fallbackMs ?? 1000;
  let revealed = false;
  let fallbackTimer: ReturnType<typeof setTimeout> | undefined;

  const reveal = (): void => {
    if (revealed) {
      return;
    }
    revealShowableWindow(win);
    // An early show() before loadURL can no-op with titleBarOverlay (no HWND yet).
    // Only lock once Chromium actually mapped a visible window.
    if (win.isDestroyed() || !win.isVisible()) {
      return;
    }
    revealed = true;
    if (fallbackTimer !== undefined) {
      clearTimeout(fallbackTimer);
      fallbackTimer = undefined;
    }
  };

  win.once('ready-to-show', reveal);
  win.webContents.once('did-finish-load', reveal);
  win.webContents.once('did-fail-load', reveal);

  fallbackTimer = setTimeout(reveal, fallbackMs);
}
