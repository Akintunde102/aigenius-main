import { BrowserWindow, ipcMain, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { approvalDialogWindowChrome } from './approval-dialog-window-chrome';

export type ExternalLinkApprovalPayload = {
  url: string;
};

function externalLinkApprovalHtmlPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'aigenius-desktop-ui', 'external-link-approval.html');
  }
  return path.join(__dirname, '..', 'resources', 'external-link-approval.html');
}

/**
 * Confirm before opening an http(s) URL in the system default browser.
 */
export function showExternalLinkApprovalDialog(
  parent: BrowserWindow | undefined,
  url: string,
): Promise<boolean> {
  const htmlPath = externalLinkApprovalHtmlPath();
  if (!fs.existsSync(htmlPath)) {
    return Promise.reject(new Error(`Missing external link approval UI: ${htmlPath}`));
  }

  const payload: ExternalLinkApprovalPayload = { url };
  const lineCount = Math.max(1, url.split(/\r?\n/).length);
  const urlLines = Math.ceil(url.length / 72);
  const preferredHeight = Math.min(720, 220 + Math.min(Math.max(lineCount, urlLines), 28) * 18);

  return new Promise((resolve) => {
    let settled = false;

    const win = new BrowserWindow({
      ...approvalDialogWindowChrome(),
      parent: parent ?? undefined,
      modal: Boolean(parent),
      title: 'Open link',
      width: 520,
      height: preferredHeight,
      minWidth: 400,
      minHeight: 240,
      show: false,
      backgroundColor: '#0f1114',
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'external-link-approval-preload.js'),
        contextIsolation: true,
        sandbox: true,
        nodeIntegration: false,
      },
    });

    const settle = (value: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };

    const cleanup = () => {
      ipcMain.removeListener('aigenius-external-link-approval-ready', onReady);
      ipcMain.removeListener('aigenius-external-link-approval-done', onDone);
    };

    const onReady = (event: Electron.IpcMainEvent) => {
      if (event.sender !== win.webContents) {
        return;
      }
      ipcMain.removeListener('aigenius-external-link-approval-ready', onReady);
      event.reply('aigenius-external-link-approval-data', payload);
    };

    const onDone = (event: Electron.IpcMainEvent, approved: unknown) => {
      if (event.sender !== win.webContents) {
        return;
      }
      cleanup();
      settle(approved === true);
      if (!win.isDestroyed()) {
        win.close();
      }
    };

    ipcMain.on('aigenius-external-link-approval-ready', onReady);
    ipcMain.on('aigenius-external-link-approval-done', onDone);

    win.once('closed', () => {
      cleanup();
      if (!settled) {
        settle(false);
      }
    });

    void win.loadFile(htmlPath).then(() => {
      win.center();
      win.show();
    });
  });
}
