import { BrowserWindow, app } from 'electron';

import path from 'path';

import os from 'os';

import fs from 'fs';

import type { PatchOp } from './local-apply-patch-types';

import { approvalDialogWindowChrome } from './approval-dialog-window-chrome';

import { approvalDialogBrowserWindowOptions } from './secondary-browser-window';

import {

  approvalDialogPreloadPath,

  approvalDialogWebPreferences,

  attachApprovalDialogIpc,

} from './approval-dialog-host';

import { requestToolApprovalInApp } from './approval-dialog-in-app';

import type { BlastRadiusSummary } from './patch-blast-radius-gate';



function patchApprovalHtmlPath(): string {

  if (app.isPackaged) {

    return path.join(process.resourcesPath, 'aigenius-desktop-ui', 'patch-approval.html');

  }

  return path.join(__dirname, '..', 'resources', 'patch-approval.html');

}



function buildRows(ops: PatchOp[]): {

  count: number;

  rows: Array<{

    variant: 'create' | 'update' | 'delete';

    verb: string;

    fileName: string;

    directory: string;

    fullPath: string;

  }>;

} {

  const home = os.homedir();

  const rows = ops.map((op) => {

    const fullPath = op.path;

    const rel =

      fullPath === home || fullPath.startsWith(home + path.sep)

        ? '~' + fullPath.slice(home.length)

        : fullPath;

    const fileName = path.basename(fullPath);

    const directory = path.dirname(rel);

    let verb: string;

    let variant: 'create' | 'update' | 'delete';

    if (op.kind === 'delete_file') {

      verb = 'Delete';

      variant = 'delete';

    } else if (op.kind === 'create_file') {

      verb = 'Create';

      variant = 'create';

    } else {

      verb = 'Update';

      variant = 'update';

    }

    return { variant, verb, fileName, directory, fullPath };

  });

  return { count: ops.length, rows };

}



function buildPayload(

  ops: PatchOp[],

  blastSummary: BlastRadiusSummary | null,

): {

  count: number;

  rows: ReturnType<typeof buildRows>['rows'];

  blastRadius?: {

    certain: number;

    heuristic: number;

    inferred: number;

    total: number;

  };

} {

  const base = buildRows(ops);

  if (!blastSummary || blastSummary.total === 0) return base;

  return {

    ...base,

    blastRadius: {

      certain: blastSummary.certain,

      heuristic: blastSummary.heuristic,

      inferred: blastSummary.inferred,

      total: blastSummary.total,

    },

  };

}



function showPatchApprovalAuxiliaryWindow(

  parent: BrowserWindow | undefined,

  ops: PatchOp[],

  payload: ReturnType<typeof buildPayload>,

): Promise<boolean> {

  const htmlPath = patchApprovalHtmlPath();

  if (!fs.existsSync(htmlPath)) {

    return Promise.reject(new Error(`Missing patch approval UI: ${htmlPath}`));

  }



  const extraBlast = payload.blastRadius?.total ? 56 : 0;

  const preferredHeight = Math.min(

    760,

    268 + extraBlast + Math.min(ops.length, 14) * 76 + Math.max(0, ops.length - 14) * 52,

  );

  const windowTitle =

    ops.length === 0

      ? 'File changes'

      : ops.length === 1

        ? 'File changes — 1 file'

        : `File changes — ${ops.length} files`;



  return new Promise((resolve) => {

    let settled = false;



    const win = new BrowserWindow(approvalDialogBrowserWindowOptions(parent, {

      ...approvalDialogWindowChrome(),

      title: windowTitle,

      width: 520,

      height: preferredHeight,

      minWidth: 400,

      minHeight: 320,

      webPreferences: approvalDialogWebPreferences(

        approvalDialogPreloadPath('patch-approval-preload.js'),

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

        data: 'aigenius-patch-approval-data',

        ready: 'aigenius-patch-approval-ready',

        done: 'aigenius-patch-approval-done',

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



/**

 * Custom themed confirmation (replaces stock dialog.showMessageBox) so local patch approval

 * matches the AIGenius desktop shell and shows paths in a scannable layout.

 */

export async function showPatchApprovalDialog(

  parent: BrowserWindow | undefined,

  ops: PatchOp[],

  blastSummary: BlastRadiusSummary | null = null,

): Promise<boolean> {

  const payload = buildPayload(ops, blastSummary);



  if (parent && !parent.isDestroyed()) {

    try {

      return await requestToolApprovalInApp(parent, 'patch', payload);

    } catch (e) {

      console.warn('[aigenius-desktop] in-app patch approval failed, using auxiliary window', e);

    }

  }



  return showPatchApprovalAuxiliaryWindow(parent, ops, payload);

}


