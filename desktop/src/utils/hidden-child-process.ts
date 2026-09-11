import type { ExecSyncOptions, SpawnOptions, SpawnSyncOptions } from 'child_process';

/**
 * Win32 CREATE_NO_WINDOW. Node maps `windowsHide: true` to this flag; we set it
 * explicitly because packaged Electron builds are stricter (electron/electron#32334).
 */
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

/**
 * Options for child_process.spawn that avoid a visible console flash on Windows.
 * Uses piped stdio by default so the child does not inherit a console host.
 */
export function hiddenSpawnOptions(base: SpawnOptions = {}): SpawnOptions {
  const merged: SpawnOptions = {
    ...base,
    stdio: base.stdio ?? ['pipe', 'pipe', 'pipe'],
  };
  return withWin32NoConsole(merged);
}

/** Sync variant for spawnSync probes. */
export function hiddenSpawnSyncOptions(base: SpawnSyncOptions = {}): SpawnSyncOptions {
  return withWin32NoConsole(base);
}

/** execSync helper (e.g. `where` probes on Windows). */
export function hiddenExecSyncOptions(base: ExecSyncOptions = {}): ExecSyncOptions {
  return withWin32NoConsole(base);
}
