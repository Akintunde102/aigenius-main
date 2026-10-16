/** Shared IPC channel names — safe to import from preload (no ipcMain). */

export const TOOLBOX_APPROVAL_REQUEST_CHANNEL = 'aigenius-toolbox-approval-request';

export function toolboxApprovalResponseChannel(requestId: string): string {
  return `aigenius-toolbox-approval-response:${requestId}`;
}
