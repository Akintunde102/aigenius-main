import { BrowserWindow, ipcMain, app } from 'electron';
import path from 'path';
import os from 'os';
import fs from 'fs';
import type { PatchOp } from './local-apply-patch-types';
import { approvalDialogWindowChrome } from './approval-dialog-window-chrome';
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

/**
 * Custom themed confirmation (replaces stock dialog.showMessageBox) so local patch approval
 * matches the AIGenius desktop shell and shows paths in a scannable layout.
 */
export function showPatchApprovalDialog(
  parent: BrowserWindow | undefined,
  ops: PatchOp[],
  blastSummary: BlastRadiusSummary | null = null,
): Promise<boolean> {
  const htmlPath = patchApprovalHtmlPath();
  if (!fs.existsSync(htmlPath)) {
    return Promise.reject(new Error(`Missing patch approval UI: ${htmlPath}`));
  }

  const payload = buildPayload(ops, blastSummary);
  const extraBlast = blastSummary?.total ? 56 : 0;
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

    const win = new BrowserWindow({
      ...approvalDialogWindowChrome(),
      parent: parent ?? undefined,
      modal: Boolean(parent),
      title: windowTitle,
      width: 520,
      height: preferredHeight,
      minWidth: 400,
      minHeight: 320,
      show: false,
      backgroundColor: '#0f1114',
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'patch-approval-preload.js'),
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
      ipcMain.removeListener('aigenius-patch-approval-ready', onReady);
      ipcMain.removeListener('aigenius-patch-approval-done', onDone);
    };

    const onReady = (event: Electron.IpcMainEvent) => {
      if (event.sender !== win.webContents) {
        return;
      }
      ipcMain.removeListener('aigenius-patch-approval-ready', onReady);
      event.reply('aigenius-patch-approval-data', payload);
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

    ipcMain.on('aigenius-patch-approval-ready', onReady);
    ipcMain.on('aigenius-patch-approval-done', onDone);

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
