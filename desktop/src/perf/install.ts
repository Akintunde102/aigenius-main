import { ipcMain } from 'electron';

import { wrapIpcHandler } from './ipc-timing';
import { isDesktopPerfEnabled, startupMark } from './startup-markers';

type IpcMainHandle = typeof ipcMain.handle;

let installed = false;

/**
 * Patches `ipcMain.handle` to record handler latency and emit slow-call logs.
 * Import this module before any `ipcMain.handle` registrations.
 */
export function installDesktopPerfInstrumentation(): void {
  if (!isDesktopPerfEnabled() || installed) {
    return;
  }
  installed = true;
  startupMark('main_module_loaded');

  const originalHandle: IpcMainHandle = ipcMain.handle.bind(ipcMain);
  ipcMain.handle = ((channel: string, handler: Parameters<IpcMainHandle>[1]) => {
    if (typeof handler !== 'function') {
      return originalHandle(channel, handler);
    }
    return originalHandle(channel, wrapIpcHandler(channel, handler as Parameters<IpcMainHandle>[1]));
  }) as IpcMainHandle;
}
