import { BrowserWindow, app } from 'electron';

import path from 'path';

import os from 'os';

import fs from 'fs';

import { approvalDialogWindowChrome } from './approval-dialog-window-chrome';

import { approvalDialogBrowserWindowOptions } from './secondary-browser-window';

import {

  approvalDialogPreloadPath,

  approvalDialogWebPreferences,

  attachApprovalDialogIpc,

} from './approval-dialog-host';

import { requestToolApprovalInApp } from './approval-dialog-in-app';



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



function showShellApprovalAuxiliaryWindow(

  parent: BrowserWindow | undefined,

  payload: ShellApprovalPayload,

): Promise<boolean> {

  const htmlPath = shellApprovalHtmlPath();

  if (!fs.existsSync(htmlPath)) {

    return Promise.reject(new Error(`Missing shell approval UI: ${htmlPath}`));

  }



  const preloadPath = approvalDialogPreloadPath('shell-approval-preload.js');

  if (!fs.existsSync(preloadPath)) {

    return Promise.reject(new Error(`Missing shell approval preload: ${preloadPath}`));

  }



  const lineCount = Math.max(1, payload.command.split(/\r?\n/).length);

  const preferredHeight = Math.min(720, 268 + Math.min(lineCount, 24) * 20);



  return new Promise((resolve, reject) => {

    let settled = false;



    const win = new BrowserWindow(approvalDialogBrowserWindowOptions(parent, {

      ...approvalDialogWindowChrome(),

      title: 'Local terminal',

      width: 520,

      height: preferredHeight,

      minWidth: 400,

      minHeight: 280,

      webPreferences: approvalDialogWebPreferences(preloadPath),

    }));



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



    const cleanup = attachApprovalDialogIpc(

      win,

      parent,

      payload,

      {

        data: 'aigenius-shell-approval-data',

        ready: 'aigenius-shell-approval-ready',

        done: 'aigenius-shell-approval-done',

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



    void win.loadFile(htmlPath).catch((e: unknown) => {

      failLoad(e instanceof Error ? e : new Error(String(e)));

    });

  });

}



/**

 * Themed confirmation for local shell execution (matches patch-approval.html chrome).

 */

export async function showShellApprovalDialog(

  parent: BrowserWindow | undefined,

  command: string,

  cwdRaw: string,

  timeoutMs: number,

): Promise<boolean> {

  const payload = buildPayload(command, cwdRaw, timeoutMs);



  if (parent && !parent.isDestroyed()) {

    try {

      return await requestToolApprovalInApp(parent, 'shell', payload);

    } catch (e) {

      console.warn('[aigenius-desktop] in-app shell approval failed, using auxiliary window', e);

    }

  }



  return showShellApprovalAuxiliaryWindow(parent, payload);

}


