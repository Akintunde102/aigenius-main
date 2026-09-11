import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';
import {
  buildCopyItemClipboardAttempts,
  copyItemToOsClipboard,
  escapeAppleScriptString,
  escapePowerShellLiteral,
} from './copy-item-to-os-clipboard';

function fakeStats() {
  return { isDirectory: () => false } as import('fs').Stats;
}

function fakeChild(opts: { emitError?: Error; exitCode?: number | null; hasStdin?: boolean }) {
  const child = new EventEmitter() as EventEmitter & {
    kill: jest.Mock;
    stdin: { write: jest.Mock; end: jest.Mock } | null;
  };
  child.kill = jest.fn();
  child.stdin = opts.hasStdin === false ? null : { write: jest.fn(), end: jest.fn() };
  queueMicrotask(() => {
    if (opts.emitError) {
      child.emit('error', opts.emitError);
      return;
    }
    child.emit('exit', opts.exitCode ?? 0);
  });
  return child as unknown as ChildProcess;
}

describe('escape helpers', () => {
  it('doubles single quotes for PowerShell literals', () => {
    expect(escapePowerShellLiteral("C:\\O'Brien\\cv.md")).toBe("C:\\O''Brien\\cv.md");
  });

  it('escapes quotes for AppleScript strings', () => {
    expect(escapeAppleScriptString('/Users/me/"drafts"/cv.md')).toBe(
      '/Users/me/\\"drafts\\"/cv.md',
    );
  });
});

describe('buildCopyItemClipboardAttempts', () => {
  it('uses Set-Clipboard -LiteralPath on Windows for files and folders', () => {
    const attempts = buildCopyItemClipboardAttempts('win32', 'C:\\Users\\me\\resume.md');
    expect(attempts).toHaveLength(1);
    expect(attempts[0].command).toBe('powershell.exe');
    expect(attempts[0].args).toContain("Set-Clipboard -LiteralPath 'C:\\Users\\me\\resume.md'");
  });

  it('uses osascript POSIX file on macOS', () => {
    const attempts = buildCopyItemClipboardAttempts('darwin', '/Users/me/resume.md');
    expect(attempts[0]).toEqual({
      command: 'osascript',
      args: ['-e', 'set the clipboard to POSIX file "/Users/me/resume.md"'],
    });
  });

  it('tries wl-copy then xclip on Linux so folders and files can be pasted', () => {
    const attempts = buildCopyItemClipboardAttempts('linux', '/home/me/docs');
    expect(attempts.map((a) => a.command)).toEqual(['wl-copy', 'wl-copy', 'xclip', 'xclip']);
    expect(attempts[0].args).toContain('text/uri-list');
    expect(attempts[2].command).toBe('xclip');
  });
});

describe('copyItemToOsClipboard', () => {
  it('rejects an empty path', async () => {
    await expect(copyItemToOsClipboard('  ')).resolves.toEqual({
      ok: false,
      error: 'Invalid file path',
    });
  });

  it('rejects a path that does not exist', async () => {
    await expect(
      copyItemToOsClipboard('/missing.md', {
        stat: async () => {
          throw new Error('ENOENT');
        },
      }),
    ).resolves.toEqual({ ok: false, error: 'Path does not exist' });
  });

  it('runs Set-Clipboard on Windows', async () => {
    const spawn = jest.fn((_c: string, _a: string[], _o?: unknown) => fakeChild({}));
    const result = await copyItemToOsClipboard('C:\\me\\cv.md', {
      platform: 'win32',
      stat: async () => fakeStats(),
      spawn,
    });
    expect(result).toEqual({ ok: true });
    expect(spawn.mock.calls[0][0]).toBe('powershell.exe');
  });

  it('falls through to copying the path as text when OS file copy fails', async () => {
    const spawn = jest.fn((_c: string, _a: string[], _o?: unknown) =>
      fakeChild({ emitError: new Error('ENOENT') }),
    );
    const writeText = jest.fn();
    const result = await copyItemToOsClipboard('/home/me/docs', {
      platform: 'linux',
      stat: async () => fakeStats(),
      spawn,
      writeText,
    });
    expect(result).toEqual({ ok: true });
    expect(writeText).toHaveBeenCalledWith('/home/me/docs');
  });

  it('uses Electron native write when provided and skips spawn', async () => {
    const spawn = jest.fn();
    const electronWriteFiles = jest.fn();
    const result = await copyItemToOsClipboard('/Users/me/cv.md', {
      platform: 'darwin',
      stat: async () => fakeStats(),
      spawn,
      electronWriteFiles,
    });
    expect(result).toEqual({ ok: true });
    expect(electronWriteFiles).toHaveBeenCalledWith('/Users/me/cv.md');
    expect(spawn).not.toHaveBeenCalled();
  });
});
