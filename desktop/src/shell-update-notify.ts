import type { BrowserWindow } from 'electron';
import type { OtaCheckResult } from './desktop-ui-ota';

export const SHELL_UPDATE_REQUIRED_IPC_CHANNEL = 'aigenius-shell-update-required';

export type ShellUpdateRequiredPayload = {
  requiredShellVersion: string;
  installedShellVersion: string;
  updateChannel: 'microsoft-store' | 'standalone';
};

export function isWindowsStoreBuild(): boolean {
  return Boolean(process.windowsStore);
}

export function shellUpdatePayloadFromOtaResult(
  result: OtaCheckResult,
  options?: { isWindowsStore?: boolean },
): ShellUpdateRequiredPayload | null {
  if (result.status !== 'incompatible-shell') {
    return null;
  }
  const store =
    options?.isWindowsStore !== undefined
      ? options.isWindowsStore
      : isWindowsStoreBuild();
  return {
    requiredShellVersion: result.requiredShellVersion,
    installedShellVersion: result.installedShellVersion,
    updateChannel: store ? 'microsoft-store' : 'standalone',
  };
}

export function notifyShellUpdateRequired(
  win: BrowserWindow | undefined,
  payload: ShellUpdateRequiredPayload,
): void {
  if (!win || win.isDestroyed()) {
    return;
  }
  win.webContents.send(SHELL_UPDATE_REQUIRED_IPC_CHANNEL, payload);
}
