import type { BrowserWindow, WebPreferences } from 'electron';
import { app, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import {
  centerAuxiliaryWindowOverParent,
  showApprovalDialogWhenReady,
} from './secondary-browser-window';

export type ApprovalDialogIpcChannels = {
  data: string;
  ready: string;
  done: string;
};

/** Resolve preload script path (asarUnpack on packaged builds). */
export function approvalDialogPreloadPath(fileName: string): string {
  const preloadPath = path.join(__dirname, fileName);
  if (!app.isPackaged) {
    return preloadPath;
  }
  const unpacked = preloadPath.replace('app.asar', 'app.asar.unpacked');
  return fs.existsSync(unpacked) ? unpacked : preloadPath;
}

/** Preload + isolation only; sandbox is off so packaged Windows builds paint reliably. */
export function approvalDialogWebPreferences(preloadPath: string): WebPreferences {
  return {
    preload: preloadPath,
    contextIsolation: true,
    sandbox: false,
    nodeIntegration: false,
  };
}

/**
 * Push approval payload to the renderer and reveal the window after dom-ready.
 * Keeps the ready handshake as a fallback when preload sends before dom-ready.
 */
export function attachApprovalDialogIpc<T>(
  win: BrowserWindow,
  parent: BrowserWindow | undefined,
  payload: T,
  channels: ApprovalDialogIpcChannels,
  onDone: (approved: boolean) => void,
): () => void {
  const pushPayload = (): void => {
    if (!win.isDestroyed()) {
      win.webContents.send(channels.data, payload);
    }
  };

  const onReady = (event: Electron.IpcMainEvent): void => {
    if (event.sender !== win.webContents) {
      return;
    }
    pushPayload();
  };

  const onDoneEvent = (event: Electron.IpcMainEvent, approved: unknown): void => {
    if (event.sender !== win.webContents) {
      return;
    }
    cleanup();
    onDone(approved === true);
    if (!win.isDestroyed()) {
      win.close();
    }
  };

  const cleanup = (): void => {
    ipcMain.removeListener(channels.ready, onReady);
    ipcMain.removeListener(channels.done, onDoneEvent);
  };

  ipcMain.on(channels.ready, onReady);
  ipcMain.on(channels.done, onDoneEvent);

  win.webContents.once('dom-ready', () => {
    pushPayload();
    centerAuxiliaryWindowOverParent(win, parent);
    showApprovalDialogWhenReady(win);
  });

  win.webContents.once('did-fail-load', (_event, code, description, url) => {
    console.error('[aigenius-desktop] approval dialog failed to load', {
      code,
      description,
      url,
    });
  });

  return cleanup;
}
