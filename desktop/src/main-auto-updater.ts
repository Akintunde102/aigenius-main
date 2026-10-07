import { autoUpdater } from 'electron-updater';
import { ipcMain, BrowserWindow, app } from 'electron';
import { shutdownDesktopApp } from './main-backend-lifecycle';
import { checkForSilentUiUpdate, type OtaCheckResult } from './desktop-ui-ota';

const UPDATE_IPC_CHANNELS = [
  'aigenius-check-for-updates',
  'aigenius-download-update',
  'aigenius-install-update',
  'aigenius-check-ui-ota',
] as const;

let ipcHandlersRegistered = false;
let updaterEventsAttached = false;
let updaterShellWindow: BrowserWindow | undefined;

function isWindowsStoreBuild(): boolean {
  return Boolean(process.windowsStore);
}

function isDevBinaryUpdateCheckSkipped(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Register IPC handlers as early as possible so the renderer cannot invoke
 * before `setupAutoUpdater` runs (dev loads the UI immediately on window create).
 */
export function registerAutoUpdaterIpcHandlers(): void {
  if (ipcHandlersRegistered) {
    return;
  }
  ipcHandlersRegistered = true;

  for (const channel of UPDATE_IPC_CHANNELS) {
    ipcMain.removeHandler(channel);
  }

  ipcMain.handle('aigenius-check-for-updates', async () => {
    if (isWindowsStoreBuild()) {
      console.info('[aigenius-desktop] Running in Microsoft Store container; binary updates managed by Store.');
      return { ok: false, error: 'Managed by Microsoft Store' };
    }

    if (isDevBinaryUpdateCheckSkipped()) {
      console.warn('[aigenius-desktop] Skipping binary update check in development mode');
      return { ok: false, error: 'Cannot check for updates in development mode' };
    }
    try {
      const result = await autoUpdater.checkForUpdates();
      return { ok: true, result };
    } catch (error) {
      console.error('[aigenius-desktop] Update check error:', error);
      return { ok: false, error: String(error) };
    }
  });

  ipcMain.handle('aigenius-download-update', async () => {
    if (isWindowsStoreBuild()) {
      return { ok: false, error: 'Managed by Microsoft Store' };
    }
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (error) {
      console.error('[aigenius-desktop] Download update error:', error);
      return { ok: false, error: String(error) };
    }
  });

  ipcMain.handle('aigenius-install-update', async () => {
    try {
      console.info('[aigenius-desktop] Shutting down sidecars before installing update...');
      await shutdownDesktopApp();
    } catch (err) {
      console.warn('[aigenius-desktop] Error during pre-update shutdown:', err);
    }
    autoUpdater.quitAndInstall(false, true);
  });

  ipcMain.handle('aigenius-check-ui-ota', async (): Promise<OtaCheckResult> => {
    return runSilentUiOtaCheck();
  });
}

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  registerAutoUpdaterIpcHandlers();
  updaterShellWindow = mainWindow;

  if (isWindowsStoreBuild() || updaterEventsAttached) {
    return;
  }
  updaterEventsAttached = true;

  autoUpdater.autoDownload = false;

  autoUpdater.on('update-available', (info) => {
    updaterShellWindow?.webContents.send('aigenius-update-available', info);
  });

  autoUpdater.on('update-downloaded', (info) => {
    updaterShellWindow?.webContents.send('aigenius-update-downloaded', info);
  });

  autoUpdater.on('error', (err) => {
    updaterShellWindow?.webContents.send('aigenius-update-error', err?.message || String(err));
  });

  autoUpdater.on('download-progress', (progressObj) => {
    updaterShellWindow?.webContents.send('aigenius-update-progress', progressObj);
  });
}

/**
 * Runs a silent UI OTA update in the background.
 * Works uniformly on Microsoft Store (AppX) and standalone installs.
 * Enforces minDesktopVersion contract to guarantee older shells never break.
 */
export async function runSilentUiOtaCheck(): Promise<OtaCheckResult> {
  try {
    const installedShellVersion = app.getVersion();
    const userDataPath = app.getPath('userData');

    const result = await checkForSilentUiUpdate({
      userDataPath,
      installedShellVersion,
    });

    console.info('[aigenius-desktop] Silent UI OTA check result:', result.status);
    return result;
  } catch (err) {
    console.warn('[aigenius-desktop] Silent UI OTA check encountered error:', err);
    return { status: 'download-failed', error: String(err) };
  }
}
