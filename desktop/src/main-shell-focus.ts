import type { BrowserWindow } from 'electron';

export let lastFocusedMainShellWindow: BrowserWindow | null = null;

export function setLastFocusedMainShellWindow(win: BrowserWindow | null): void {
  lastFocusedMainShellWindow = win;
}
