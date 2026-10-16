import { app, ipcMain } from 'electron';
import { getActiveCodeProjectId } from '../active-code-project';
import { getToolboxService } from '../toolbox/service';
import { toolboxRootDir } from '../toolbox/paths';

export function initToolbox(): void {
  const userData = app.getPath('userData');
  const svc = getToolboxService(userData);
  void svc.reconcile();

  ipcMain.handle('toolbox-list', async (_event, payload: { includeArchived?: boolean } | undefined) => {
    try {
      const includeArchived = payload?.includeArchived === true;
      const tools = svc.listForUi(getActiveCodeProjectId(), includeArchived);
      return { ok: true, tools };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  });

  ipcMain.handle('toolbox-get-root-path', async () => ({
    ok: true,
    path: toolboxRootDir(userData),
  }));
}
