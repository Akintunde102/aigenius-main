import { randomUUID } from 'crypto';
import type { BrowserWindow } from 'electron';
import { ipcMain } from 'electron';

export const TOOL_APPROVAL_REQUEST_CHANNEL = 'aigenius-tool-approval-request';

export function toolApprovalResponseChannel(requestId: string): string {
  return `aigenius-tool-approval-response:${requestId}`;
}

export type InAppShellApprovalPayload = {
  command: string;
  cwdDisplay: string;
  timeoutLabel: string;
};

export type InAppPatchApprovalRow = {
  variant: 'create' | 'update' | 'delete';
  verb: string;
  fileName: string;
  directory: string;
  fullPath: string;
};

export type InAppPatchApprovalPayload = {
  count: number;
  rows: InAppPatchApprovalRow[];
  blastRadius?: {
    certain: number;
    heuristic: number;
    inferred: number;
    total: number;
  };
};

export type InAppToolApprovalRequest =
  | { requestId: string; kind: 'shell'; payload: InAppShellApprovalPayload }
  | { requestId: string; kind: 'patch'; payload: InAppPatchApprovalPayload };

const IN_APP_APPROVAL_TIMEOUT_MS = 5 * 60 * 1000;

/**
 * Ask the main renderer to show an approval overlay (avoids blank auxiliary BrowserWindows on Windows).
 */
export function requestToolApprovalInApp(
  parent: BrowserWindow,
  kind: InAppToolApprovalRequest['kind'],
  payload: InAppShellApprovalPayload | InAppPatchApprovalPayload,
): Promise<boolean> {
  if (parent.isDestroyed() || parent.webContents.isDestroyed()) {
    return Promise.reject(new Error('Renderer window unavailable for in-app approval'));
  }

  const requestId = randomUUID();
  const responseChannel = toolApprovalResponseChannel(requestId);

  return new Promise((resolve, reject) => {
    let settled = false;

    const settle = (value: boolean) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      resolve(value);
    };

    const fail = (err: Error) => {
      if (settled) {
        return;
      }
      settled = true;
      cleanup();
      reject(err);
    };

    const onResponse = (event: Electron.IpcMainEvent, approved: unknown): void => {
      if (event.sender !== parent.webContents) {
        return;
      }
      console.log(`[DEBUG] requestToolApprovalInApp: Received response on ${responseChannel}:`, approved);
      settle(approved === true);
    };

    const timer = setTimeout(() => {
      console.log(`[DEBUG] requestToolApprovalInApp: Timeout of ${IN_APP_APPROVAL_TIMEOUT_MS}ms reached.`);
      fail(new Error('In-app approval timed out'));
    }, IN_APP_APPROVAL_TIMEOUT_MS);

    const cleanup = (): void => {
      clearTimeout(timer);
      ipcMain.removeListener(responseChannel, onResponse);
    };

    ipcMain.on(responseChannel, onResponse);

    const request: InAppToolApprovalRequest =
      kind === 'shell'
        ? { requestId, kind: 'shell', payload: payload as InAppShellApprovalPayload }
        : { requestId, kind: 'patch', payload: payload as InAppPatchApprovalPayload };

    parent.webContents.send(TOOL_APPROVAL_REQUEST_CHANNEL, request);
  });
}
