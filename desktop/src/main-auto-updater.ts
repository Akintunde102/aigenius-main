import { autoUpdater } from 'electron-updater';
import { ipcMain, BrowserWindow } from 'electron';

export function setupAutoUpdater(mainWindow: BrowserWindow): void {
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

  ipcMain.handle('aigenius-check-for-updates', async () => {
    // electron-updater will fail in development without dev-app-update.yml,
    // so we can gracefully return ok:false or handle it.
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      console.warn('[aigenius-desktop] Skipping update check in development mode');
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
    try {
      await autoUpdater.downloadUpdate();
      return { ok: true };
    } catch (error) {
      console.error('[aigenius-desktop] Download update error:', error);
      return { ok: false, error: String(error) };
    }
  });

  ipcMain.handle('aigenius-install-update', () => {
    autoUpdater.quitAndInstall(false, true);
  });
}
