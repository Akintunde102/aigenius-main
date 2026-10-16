import { randomUUID } from 'crypto';
import type { BrowserWindow } from 'electron';
import { ipcMain } from 'electron';
import type { ToolboxApprovalPayload } from '../toolbox/types';
import {
  TOOLBOX_APPROVAL_REQUEST_CHANNEL,
  toolboxApprovalResponseChannel,
} from './toolbox-approval-channels';

export { TOOLBOX_APPROVAL_REQUEST_CHANNEL, toolboxApprovalResponseChannel };

const APPROVAL_TIMEOUT_MS = 5 * 60 * 1000;

export function requestToolboxApproval(
  parent: BrowserWindow | undefined,
  payload: ToolboxApprovalPayload,
): Promise<boolean> {
  if (!parent || parent.isDestroyed() || parent.webContents.isDestroyed()) {
    return Promise.resolve(false);
  }

  const requestId = randomUUID();
  const responseChannel = toolboxApprovalResponseChannel(requestId);

  return new Promise((resolve) => {
    let settled = false;

    const settle = (value: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(value);
    };

    const onResponse = (event: Electron.IpcMainEvent, approved: unknown): void => {
      if (event.sender !== parent.webContents) {
        return;
      }
      settle(approved === true);
    };

    const timer = setTimeout(() => {
      settle(false);
    }, APPROVAL_TIMEOUT_MS);

    const onClosed = (): void => {
      settle(false);
    };

    const cleanup = (): void => {
      clearTimeout(timer);
      ipcMain.removeListener(responseChannel, onResponse);
      try {
        parent.removeListener('closed', onClosed);
      } catch {
        /* ignore */
      }
    };

    ipcMain.on(responseChannel, onResponse);
    parent.once('closed', onClosed);

    parent.webContents.send(TOOLBOX_APPROVAL_REQUEST_CHANNEL, {
      requestId,
      kind: 'toolbox',
      payload,
    });
  });
}
