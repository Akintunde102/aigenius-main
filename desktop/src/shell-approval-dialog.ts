import { BrowserWindow, ipcMain, app } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import { approvalDialogWindowChrome } from './approval-dialog-window-chrome';

export type ShellApprovalPayload = {
  command: string;
  cwdDisplay: string;
  timeoutLabel: string;
};

function shellApprovalHtmlPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'aigenius-desktop-ui', 'shell-approval.html');
  }
  return path.join(__dirname, '..', 'resources', 'shell-approval.html');
}

function displayPath(absPath: string): string {
  const home = os.homedir();
  if (absPath === home || absPath.startsWith(home + path.sep)) {
    return '~' + absPath.slice(home.length);
  }
  return absPath;
}

function buildPayload(command: string, cwdRaw: string, timeoutMs: number): ShellApprovalPayload {
  const timeoutSec = Math.round(timeoutMs / 1000);
  const timeoutLabel = timeoutSec >= 60
    ? `${Math.floor(timeoutSec / 60)} min${timeoutSec % 60 ? ` ${timeoutSec % 60} s` : ''}`
    : `${timeoutSec} s`;
  return {
    command,
    cwdDisplay: displayPath(path.resolve(cwdRaw)),
    timeoutLabel,
  };
}

/**
 * Themed confirmation for local shell execution (matches patch-approval.html chrome).
 */
export function showShellApprovalDialog(
  parent: BrowserWindow | undefined,
  command: string,
  cwdRaw: string,
  timeoutMs: number,
): Promise<boolean> {
  const htmlPath = shellApprovalHtmlPath();
  if (!fs.existsSync(htmlPath)) {
    return Promise.reject(new Error(`Missing shell approval UI: ${htmlPath}`));
  }

  const preloadPath = path.join(__dirname, 'shell-approval-preload.js');
  if (!fs.existsSync(preloadPath)) {
    return Promise.reject(new Error(`Missing shell approval preload: ${preloadPath}`));
  }

  const payload = buildPayload(command, cwdRaw, timeoutMs);
  const lineCount = Math.max(1, command.split(/\r?\n/).length);
  const preferredHeight = Math.min(720, 268 + Math.min(lineCount, 24) * 20);

  return new Promise((resolve, reject) => {
    let settled = false;

    const win = new BrowserWindow({
      ...approvalDialogWindowChrome(),
      parent: parent ?? undefined,
      modal: Boolean(parent),
      title: 'Local terminal',
      width: 520,
      height: preferredHeight,
      minWidth: 400,
      minHeight: 280,
      show: false,
      backgroundColor: '#0f1114',
      autoHideMenuBar: true,
      webPreferences: {
        preload: preloadPath,
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

    const failLoad = (err: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      if (!win.isDestroyed()) {
        win.close();
      }
      console.error('[aigenius-desktop] shell approval window failed to load', err);
      reject(err);
    };

    const cleanup = () => {
      ipcMain.removeListener('aigenius-shell-approval-ready', onReady);
      ipcMain.removeListener('aigenius-shell-approval-done', onDone);
    };

    const onReady = (event: Electron.IpcMainEvent) => {
      if (event.sender !== win.webContents) {
        return;
      }
      ipcMain.removeListener('aigenius-shell-approval-ready', onReady);
      event.reply('aigenius-shell-approval-data', payload);
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

    ipcMain.on('aigenius-shell-approval-ready', onReady);
    ipcMain.on('aigenius-shell-approval-done', onDone);

    win.once('closed', () => {
      cleanup();
      if (!settled) {
        settle(false);
      }
    });

    void win
      .loadFile(htmlPath)
      .then(() => {
        win.center();
        win.show();
        try {
          win.focus();
          win.moveTop();
        } catch {
          /* focus/moveTop unsupported or flaky on some compositors */
        }
      })
      .catch((e: unknown) => {
        failLoad(e instanceof Error ? e : new Error(String(e)));
      });
  });
}
