import type { BrowserWindowConstructorOptions } from 'electron';

/** Matches approval HTML `--bg` and window `backgroundColor`. */
const APPROVAL_TITLEBAR_BG = '#0f1114';
/** Muted control glyphs on dark bar (Windows / Linux WCO). */
const APPROVAL_TITLEBAR_SYMBOL = '#94a3b8';

/**
 * Native title bar styling for permission modals: unified dark chrome on Windows/Linux
 * (window-controls overlay) and inset traffic lights on macOS.
 */
export function approvalDialogWindowChrome(): BrowserWindowConstructorOptions {
  if (process.platform === 'darwin') {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 12, y: 10 },
    };
  }
  return {
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: APPROVAL_TITLEBAR_BG,
      symbolColor: APPROVAL_TITLEBAR_SYMBOL,
      height: 40,
    },
  };
}
