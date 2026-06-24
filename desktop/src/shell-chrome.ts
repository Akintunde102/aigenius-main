import type { BrowserWindowConstructorOptions } from 'electron';

/** Dark title region aligned with VS Code / editor shells (not pure black). */
export const MAIN_SHELL_CHROME_BG = '#1a1a1c';
/** Control glyphs on Windows / Linux window-controls overlay. */
export const MAIN_SHELL_CHROME_SYMBOL = '#a1a1aa';

/**
 * Layout metrics for the shell chrome strip (`titleBarTopPx` / overlay height).
 * Sandboxed `preload.ts` duplicates these values and `mainShellRendererChrome` (sandbox preload cannot
 * `require` this module).
 */
export const MAIN_SHELL_MAC_TITLE_TOP_PX = 30;
export const MAIN_SHELL_OVERLAY_HEIGHT_PX = 36;
/** Space reserved for traffic lights (macOS). Keep in sync with `preload.ts`. */
export const MAIN_SHELL_DARWIN_TITLEBAR_RIGHT_INSET_PX = 12;
/** Space for Windows / Linux window-controls overlay (WCO). Keep in sync with `preload.ts`. */
export const MAIN_SHELL_WIN_LINUX_WCO_RIGHT_INSET_PX = 138;

/**
 * Native title bar integration for the main shell window (VS Code–style): inset traffic
 * lights on macOS; frameless + window-controls overlay on Windows and Linux.
 */
export function mainShellBrowserWindowOptions(): BrowserWindowConstructorOptions {
  if (process.platform === 'darwin') {
    return {
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 14, y: 11 },
      backgroundColor: MAIN_SHELL_CHROME_BG,
    };
  }
  return {
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: MAIN_SHELL_CHROME_BG,
    titleBarOverlay: {
      color: MAIN_SHELL_CHROME_BG,
      symbolColor: MAIN_SHELL_CHROME_SYMBOL,
      height: MAIN_SHELL_OVERLAY_HEIGHT_PX,
    },
  };
}

export function mainShellRendererChrome(platform: NodeJS.Platform): {
  titleBarTopPx: number;
  contentLeftPx: number;
  titleBarRightInsetPx: number;
} {
  if (platform === 'darwin') {
    return {
      titleBarTopPx: MAIN_SHELL_MAC_TITLE_TOP_PX,
      /** Reserved for a future in-window menu row (VS Code–style); not applied to the whole page. */
      contentLeftPx: 0,
      titleBarRightInsetPx: MAIN_SHELL_DARWIN_TITLEBAR_RIGHT_INSET_PX,
    };
  }
  return {
    titleBarTopPx: MAIN_SHELL_OVERLAY_HEIGHT_PX,
    contentLeftPx: 0,
    titleBarRightInsetPx: MAIN_SHELL_WIN_LINUX_WCO_RIGHT_INSET_PX,
  };
}
