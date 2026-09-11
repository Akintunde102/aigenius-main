import type { ExecSyncOptions, SpawnOptions, SpawnSyncOptions } from 'node:child_process';

/** Win32 CREATE_NO_WINDOW — see electron/electron#32334 for packaged Electron behavior. */
export const WIN32_CREATE_NO_WINDOW = 0x08000000;

type Win32ProcessOptions = { creationFlags?: number; windowsHide?: boolean };

function withWin32NoConsole<T extends SpawnOptions | SpawnSyncOptions | ExecSyncOptions>(
  base: T,
): T {
  if (process.platform !== 'win32') {
    return base;
  }
  const winBase = base as T & Win32ProcessOptions;
  const creationFlags =
    typeof winBase.creationFlags === 'number'
      ? winBase.creationFlags | WIN32_CREATE_NO_WINDOW
      : WIN32_CREATE_NO_WINDOW;
  return {
    ...base,
    windowsHide: true,
    creationFlags,
  } as T;
}

export function hiddenSpawnOptions(base: SpawnOptions = {}): SpawnOptions {
  const merged: SpawnOptions = {
    ...base,
    stdio: base.stdio ?? ['pipe', 'pipe', 'pipe'],
  };
  return withWin32NoConsole(merged);
}

export function hiddenSpawnSyncOptions(base: SpawnSyncOptions = {}): SpawnSyncOptions {
  return withWin32NoConsole(base);
}

export function hiddenExecSyncOptions(base: ExecSyncOptions = {}): ExecSyncOptions {
  return withWin32NoConsole(base);
}
