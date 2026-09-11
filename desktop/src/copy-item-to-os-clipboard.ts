import { spawn, type ChildProcess } from 'child_process';
import fs from 'fs';
import { pathToFileURL } from 'url';

export type CopyItemResult = { ok: true } | { ok: false; error: string };

export type CopySpawnAttempt = {
  command: string;
  args: string[];
  stdin?: string;
};

type SpawnLike = (
  command: string,
  args: string[],
  options: {
    stdio: ['pipe', 'ignore', 'ignore'] | ['ignore', 'ignore', 'ignore'];
    windowsHide?: boolean;
  },
) => ChildProcess;

const COPY_WAIT_MS = 8_000;

export function escapePowerShellLiteral(value: string): string {
  return value.replace(/'/g, "''");
}

export function escapeAppleScriptString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * Commands that put a file or folder on the OS clipboard so Paste works in
 * Explorer / Finder / the Linux file manager.
 */
export function buildCopyItemClipboardAttempts(
  platform: NodeJS.Platform,
  targetPath: string,
): CopySpawnAttempt[] {
  const uri = pathToFileURL(targetPath).href;

  if (platform === 'win32') {
    return [
      {
        command: 'powershell.exe',
        args: [
          '-NoProfile',
          '-NonInteractive',
          '-WindowStyle',
          'Hidden',
          '-Command',
          `Set-Clipboard -LiteralPath '${escapePowerShellLiteral(targetPath)}'`,
        ],
      },
    ];
  }

  if (platform === 'darwin') {
    return [
      {
        command: 'osascript',
        args: ['-e', `set the clipboard to POSIX file "${escapeAppleScriptString(targetPath)}"`],
      },
    ];
  }

  const gnomePayload = `copy\n${uri}\n`;
  const uriList = `${uri}\n`;
  return [
    { command: 'wl-copy', args: ['--type', 'text/uri-list'], stdin: uriList },
    {
      command: 'wl-copy',
      args: ['--type', 'x-special/gnome-copied-files'],
      stdin: gnomePayload,
    },
    {
      command: 'xclip',
      args: ['-selection', 'clipboard', '-t', 'text/uri-list'],
      stdin: uriList,
    },
    {
      command: 'xclip',
      args: ['-selection', 'clipboard', '-t', 'x-special/gnome-copied-files'],
      stdin: gnomePayload,
    },
  ];
}

function spawnAttempt(spawnFn: SpawnLike, attempt: CopySpawnAttempt): Promise<void> {
  return new Promise((resolve, reject) => {
    const useStdin = attempt.stdin != null;
    const child = spawnFn(attempt.command, attempt.args, {
      stdio: useStdin ? ['pipe', 'ignore', 'ignore'] : ['ignore', 'ignore', 'ignore'],
      windowsHide: true,
    });

    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    const onExit = (code: number | null) => {
      cleanup();
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${attempt.command} exited with ${code ?? 'null'}`));
    };

    const timer = setTimeout(() => {
      cleanup();
      try {
        child.kill();
      } catch {
        /* ignore */
      }
      reject(new Error(`${attempt.command} timed out`));
    }, COPY_WAIT_MS);

    const cleanup = () => {
      child.removeListener('error', onError);
      child.removeListener('exit', onExit);
      clearTimeout(timer);
    };

    child.once('error', onError);
    child.once('exit', onExit);

    if (useStdin) {
      const stdin = child.stdin;
      if (!stdin) {
        cleanup();
        reject(new Error(`${attempt.command} has no stdin`));
        return;
      }
      stdin.write(attempt.stdin);
      stdin.end();
    }
  });
}

export async function copyItemToOsClipboard(
  targetPath: string,
  options?: {
    platform?: NodeJS.Platform;
    spawn?: SpawnLike;
    stat?: (p: string) => Promise<fs.Stats>;
    electronWriteFiles?: (p: string) => void;
    writeText?: (p: string) => void;
  },
): Promise<CopyItemResult> {
  const trimmed = targetPath.trim();
  if (!trimmed) {
    return { ok: false, error: 'Invalid file path' };
  }

  const platform = options?.platform ?? process.platform;
  const statFn = options?.stat ?? ((p: string) => fs.promises.stat(p));
  const spawnFn = (options?.spawn ?? spawn) as SpawnLike;

  try {
    await statFn(trimmed);
  } catch {
    return { ok: false, error: 'Path does not exist' };
  }

  if (options?.electronWriteFiles) {
    try {
      options.electronWriteFiles(trimmed);
      return { ok: true };
    } catch {
      /* try OS commands next */
    }
  }

  const attempts = buildCopyItemClipboardAttempts(platform, trimmed);
  let lastError: unknown;
  for (const attempt of attempts) {
    try {
      await spawnAttempt(spawnFn, attempt);
      return { ok: true };
    } catch (err) {
      lastError = err;
    }
  }

  if (options?.writeText) {
    try {
      options.writeText(trimmed);
      return { ok: true };
    } catch (err) {
      lastError = err;
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : 'Failed to copy to clipboard';
  return { ok: false, error: message };
}
