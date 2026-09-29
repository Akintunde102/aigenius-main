import { spawn, type ChildProcess } from 'node:child_process';

type KillableChild = Pick<ChildProcess, 'pid'> & {
  kill?: (signal?: NodeJS.Signals | number) => boolean;
};

/**
 * Kill a spawned shell and its descendants. `child.kill()` only hits cmd.exe / sh,
 * so `npm run dev` grandchildren keep stdio open and Node never emits `close`.
 */
export function killChildProcessTree(child: KillableChild): void {
  const pid = child.pid;
  if (typeof pid !== 'number' || pid <= 0) {
    try {
      child.kill?.('SIGKILL');
    } catch {
      /* ignore */
    }
    return;
  }

  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/pid', String(pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
    });
    killer.on('error', () => {
      try {
        child.kill?.('SIGKILL');
      } catch {
        /* ignore */
      }
    });
    return;
  }

  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try {
      spawn('pkill', ['-TERM', '-P', String(pid)], { stdio: 'ignore' });
    } catch {
      /* ignore */
    }
    try {
      child.kill?.('SIGTERM');
    } catch {
      /* ignore */
    }
  }
}
