import { autoUpdater } from 'electron-updater';
import { ipcMain, BrowserWindow, app } from 'electron';
import { shutdownDesktopApp } from './main-backend-lifecycle';
import { checkForSilentUiUpdate, type OtaCheckResult } from './desktop-ui-ota';

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  // If running inside Microsoft Store AppX container, full updates are handled natively by Windows Store.
  const isWindowsStore = Boolean(process.windowsStore);

  if (!isWindowsStore) {
    // Disable auto-download so the user can choose when to download.
    autoUpdater.autoDownload = false;

    autoUpdater.on('update-available', (info) => {
      mainWindow.webContents.send('aigenius-update-available', info);
    });

    autoUpdater.on('update-downloaded', (info) => {
      mainWindow.webContents.send('aigenius-update-downloaded', info);
    });

    autoUpdater.on('error', (err) => {
      mainWindow.webContents.send('aigenius-update-error', err?.message || String(err));
    });

    autoUpdater.on('download-progress', (progressObj) => {
      mainWindow.webContents.send('aigenius-update-progress', progressObj);
    });
  }

  ipcMain.handle('aigenius-check-for-updates', async () => {
    if (isWindowsStore) {
      console.info('[aigenius-desktop] Running in Microsoft Store container; binary updates managed by Store.');
      return { ok: false, error: 'Managed by Microsoft Store' };
    }

    // electron-updater will fail in development without dev-app-update.yml
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
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
    if (isWindowsStore) {
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

  // Silent UI OTA handler
  ipcMain.handle('aigenius-check-ui-ota', async (): Promise<OtaCheckResult> => {
    return runSilentUiOtaCheck();
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
