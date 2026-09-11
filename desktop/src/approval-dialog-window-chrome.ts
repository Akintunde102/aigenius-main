import type { BrowserWindowConstructorOptions } from 'electron';

/** Matches approval HTML `--bg` and window `backgroundColor`. */
const APPROVAL_TITLEBAR_BG = '#0f1114';

/**
 * Native title bar for permission modals.
 *
 * macOS: inset traffic lights on a frameless sheet.
 * Windows/Linux: a normal framed window. Frameless + Window Controls Overlay on small
 * modal dialogs can leave a blank surface (overlay height / `titlebar-area-height`
 * consuming the whole client area), so Run/Cancel never appear.
 */
export function approvalDialogWindowChrome(): BrowserWindowConstructorOptions {
  if (process.platform === 'darwin') {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 12, y: 10 },
      backgroundColor: APPROVAL_TITLEBAR_BG,
    };
  }
  return {
    frame: true,
    autoHideMenuBar: true,
    backgroundColor: APPROVAL_TITLEBAR_BG,
  };
}
