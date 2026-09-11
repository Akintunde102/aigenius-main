import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';
import {
  buildRevealInFolderAttempts,
  revealPathInFileManager,
} from './reveal-path-in-file-manager';

function fakeStats(isDirectory: boolean) {
  return { isDirectory: () => isDirectory } as import('fs').Stats;
}

function fakeChild(opts: { emitSpawn?: boolean; emitError?: Error; exitCode?: number | null }) {
  const child = new EventEmitter() as EventEmitter & {
    unref: jest.Mock;
    kill: jest.Mock;
  };
  child.unref = jest.fn();
  child.kill = jest.fn();
  queueMicrotask(() => {
    if (opts.emitError) {
      child.emit('error', opts.emitError);
      return;
    }
    if (opts.emitSpawn) {
      child.emit('spawn');
    }
    if (opts.exitCode !== undefined) {
      child.emit('exit', opts.exitCode);
    }
  });
  return child as unknown as ChildProcess;
}

describe('buildRevealInFolderAttempts', () => {
  it('uses Explorer /select, on Windows so the file is highlighted', () => {
    const attempts = buildRevealInFolderAttempts(
      'win32',
      'C:\\Users\\me\\resume.md',
      false,
    );
    expect(attempts).toEqual([
      { command: 'explorer.exe', args: ['/select,', 'C:\\Users\\me\\resume.md'], waitForExit: false },
    ]);
  });

  it('uses open -R on macOS so Finder selects the file', () => {
    const attempts = buildRevealInFolderAttempts('darwin', '/Users/me/resume.md', false);
    expect(attempts).toEqual([
      { command: 'open', args: ['-R', '/Users/me/resume.md'], waitForExit: false },
    ]);
  });

  it('tries DBus ShowItems then xdg-open of the parent folder on Linux', () => {
    const attempts = buildRevealInFolderAttempts('linux', '/home/me/docs/resume.md', false);
    expect(attempts).toHaveLength(2);
    expect(attempts[0].command).toBe('dbus-send');
    expect(attempts[0].args).toContain('org.freedesktop.FileManager1.ShowItems');
    expect(
      attempts[0].args.some((a) => a.startsWith('array:string:') && a.includes('resume.md')),
    ).toBe(true);
    expect(attempts[1]).toEqual({
      command: 'xdg-open',
      args: ['/home/me/docs'],
      waitForExit: false,
    });
  });

  it('opens the directory itself with xdg-open when the target is a folder', () => {
    const attempts = buildRevealInFolderAttempts('linux', '/home/me/docs', true);
    expect(attempts[1].args).toEqual(['/home/me/docs']);
  });
});

describe('revealPathInFileManager', () => {
  it('rejects an empty path', async () => {
    const result = await revealPathInFileManager('   ');
    expect(result).toEqual({ ok: false, error: 'Invalid file path' });
  });

  it('rejects a path that does not exist', async () => {
    const result = await revealPathInFileManager('/missing.md', {
      stat: async () => {
        throw new Error('ENOENT');
      },
    });
    expect(result).toEqual({ ok: false, error: 'Path does not exist' });
  });

  it('spawns Explorer on Windows and does not wait for it to exit', async () => {
    const spawn = jest.fn(
      (_command: string, _args: string[], _options?: unknown) => fakeChild({ emitSpawn: true }),
    );
    const result = await revealPathInFileManager('C:\\me\\cv.md', {
      platform: 'win32',
      stat: async () => fakeStats(false),
      spawn,
    });
    expect(result).toEqual({ ok: true });
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(spawn.mock.calls[0][0]).toBe('explorer.exe');
    expect(spawn.mock.calls[0][1]).toEqual(['/select,', 'C:\\me\\cv.md']);
  });

  it('falls through to xdg-open on Linux when dbus-send is missing', async () => {
    const spawn = jest.fn((command: string, _args: string[], _options?: unknown) => {
      if (command === 'dbus-send') {
        return fakeChild({ emitError: new Error('ENOENT') });
      }
      return fakeChild({ emitSpawn: true });
    });
    const result = await revealPathInFileManager('/home/me/cv.md', {
      platform: 'linux',
      stat: async () => fakeStats(false),
      spawn,
    });
    expect(result).toEqual({ ok: true });
    expect(spawn).toHaveBeenCalledTimes(2);
    expect(spawn.mock.calls[1][0]).toBe('xdg-open');
    expect(spawn.mock.calls[1][1]).toEqual(['/home/me']);
  });

  it('uses Electron showItemInFolder when every spawn attempt fails', async () => {
    const spawn = jest.fn(
      (_command: string, _args: string[], _options?: unknown) => fakeChild({ emitError: new Error('ENOENT') }),
    );
    const electronFallback = jest.fn();
    const result = await revealPathInFileManager('/home/me/cv.md', {
      platform: 'linux',
      stat: async () => fakeStats(false),
      spawn,
      electronFallback,
    });
    expect(result).toEqual({ ok: true });
    expect(electronFallback).toHaveBeenCalledWith('/home/me/cv.md');
  });

  it('returns an error when spawn and Electron fallback both fail', async () => {
    const spawn = jest.fn(
      (_command: string, _args: string[], _options?: unknown) => fakeChild({ emitError: new Error('ENOENT') }),
    );
    const result = await revealPathInFileManager('/Users/me/cv.md', {
      platform: 'darwin',
      stat: async () => fakeStats(false),
      spawn,
      electronFallback: () => {
        throw new Error('shell failed');
      },
    });
    expect(result).toEqual({ ok: false, error: 'shell failed' });
  });
});
