import { spawn, type ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export type RevealInFolderResult = { ok: true } | { ok: false; error: string };

export type RevealSpawnAttempt = {
  command: string;
  args: string[];
  /** Wait for exit (Linux dbus). Explorer/open should not be waited on. */
  waitForExit: boolean;
};

type SpawnLike = (
  command: string,
  args: string[],
  options: { detached?: boolean; stdio: 'ignore'; windowsHide?: boolean },
) => ChildProcess;

const DBUS_WAIT_MS = 2_500;

/**
 * OS file-manager commands that reveal `targetPath` (select file when the manager supports it).
 * Windows: Explorer `/select,`
 * macOS: Finder `open -R`
 * Linux: FileManager1 DBus, then `xdg-open` on the containing folder
 */
export function buildRevealInFolderAttempts(
  platform: NodeJS.Platform,
  targetPath: string,
  isDirectory: boolean,
): RevealSpawnAttempt[] {
  if (platform === 'win32') {
    return [{ command: 'explorer.exe', args: ['/select,', targetPath], waitForExit: false }];
  }
  if (platform === 'darwin') {
    return [{ command: 'open', args: ['-R', targetPath], waitForExit: false }];
  }

  const folderToOpen = isDirectory ? targetPath : path.dirname(targetPath);
  const fileUri = JSON.stringify(pathToFileURL(targetPath).href);
  return [
    {
      command: 'dbus-send',
      args: [
        '--session',
        '--print-reply',
        '--dest=org.freedesktop.FileManager1',
        '--type=method_call',
        '/org/freedesktop/FileManager1',
        'org.freedesktop.FileManager1.ShowItems',
        `array:string:${fileUri}`,
        'string:',
      ],
      waitForExit: true,
    },
    { command: 'xdg-open', args: [folderToOpen], waitForExit: false },
  ];
}

function spawnAttempt(
  spawnFn: SpawnLike,
  attempt: RevealSpawnAttempt,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawnFn(attempt.command, attempt.args, {
      detached: !attempt.waitForExit,
      stdio: 'ignore',
      windowsHide: false,
    });

    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    let timer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = () => {
      child.removeListener('error', onError);
      child.removeListener('spawn', onSpawn);
      child.removeListener('exit', onExit);
      if (timer) clearTimeout(timer);
    };

    const onSpawn = () => {
      if (!attempt.waitForExit) {
        cleanup();
        child.unref();
        resolve();
      }
    };

    const onExit = (code: number | null) => {
      cleanup();
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${attempt.command} exited with ${code ?? 'null'}`));
    };

    child.once('error', onError);

    if (attempt.waitForExit) {
      timer = setTimeout(() => {
        cleanup();
        try {
          child.kill();
        } catch {
          /* ignore */
        }
        reject(new Error(`${attempt.command} timed out`));
      }, DBUS_WAIT_MS);
      child.once('exit', onExit);
    } else {
      child.once('spawn', onSpawn);
    }
  });
}

export async function revealPathInFileManager(
  targetPath: string,
  options?: {
    platform?: NodeJS.Platform;
    spawn?: SpawnLike;
    stat?: (p: string) => Promise<fs.Stats>;
    electronFallback?: (p: string) => void;
  },
): Promise<RevealInFolderResult> {
  const trimmed = targetPath.trim();
  if (!trimmed) {
    return { ok: false, error: 'Invalid file path' };
  }

  const platform = options?.platform ?? process.platform;
  const statFn = options?.stat ?? ((p: string) => fs.promises.stat(p));
  const spawnFn = (options?.spawn ?? spawn) as SpawnLike;

  let st: fs.Stats;
  try {
    st = await statFn(trimmed);
  } catch {
    return { ok: false, error: 'Path does not exist' };
  }

  const attempts = buildRevealInFolderAttempts(platform, trimmed, st.isDirectory());
  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      await spawnAttempt(spawnFn, attempt);
      return { ok: true };
    } catch (err) {
      lastError = err;
    }
  }

  if (options?.electronFallback) {
    try {
      options.electronFallback(trimmed);
      return { ok: true };
    } catch (err) {
      lastError = err;
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : 'Failed to reveal in file manager';
  return { ok: false, error: message };
}
