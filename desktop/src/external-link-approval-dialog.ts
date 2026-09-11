import { BrowserWindow, app } from 'electron';
import path from 'path';
import fs from 'fs';
import { approvalDialogWindowChrome } from './approval-dialog-window-chrome';
import { approvalDialogBrowserWindowOptions } from './secondary-browser-window';
import {
  approvalDialogPreloadPath,
  approvalDialogWebPreferences,
  attachApprovalDialogIpc,
} from './approval-dialog-host';

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

    const win = new BrowserWindow(approvalDialogBrowserWindowOptions(parent, {
      ...approvalDialogWindowChrome(),
      title: 'Open link',
      width: 520,
      height: preferredHeight,
      minWidth: 400,
      minHeight: 240,
      webPreferences: approvalDialogWebPreferences(
        approvalDialogPreloadPath('external-link-approval-preload.js'),
      ),
    }));

    const settle = (value: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      resolve(value);
    };

    const cleanup = attachApprovalDialogIpc(
      win,
      parent,
      payload,
      {
        data: 'aigenius-external-link-approval-data',
        ready: 'aigenius-external-link-approval-ready',
        done: 'aigenius-external-link-approval-done',
      },
      (approved) => {
        settle(approved);
      },
    );

    win.once('closed', () => {
      cleanup();
      if (!settled) {
        settle(false);
      }
    });

    void win.loadFile(htmlPath);
  });
}
