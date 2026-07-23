import path from 'path';
import {
  formatListDirectoryShellCommand,
  looksLikeMisparsedShellTableOutput,
  parseListDirectoryShellStdout,
  parseLs1ApOutput,
} from './list-directory-via-shell';
import { assertReadonlyShellCommand } from './readonly-shell-command';

describe('readonly-shell-command', () => {
  it('allows common read-only unix commands', () => {
    expect(() => assertReadonlyShellCommand("ls -la", 'unix')).not.toThrow();
    expect(() => assertReadonlyShellCommand("find . -maxdepth 2 -type f", 'unix')).not.toThrow();
  });

  it('blocks destructive unix commands', () => {
    expect(() => assertReadonlyShellCommand('rm -rf .', 'unix')).toThrow();
    expect(() => assertReadonlyShellCommand('ls > out.txt', 'unix')).toThrow();
  });

  it('allows read-only PowerShell and blocks destructive cmdlets', () => {
    expect(() => assertReadonlyShellCommand('Get-ChildItem -Force', 'win32')).not.toThrow();
    expect(() => assertReadonlyShellCommand('Remove-Item x', 'win32')).toThrow();
  });
});

describe('list-directory-via-shell', () => {
  describe('formatListDirectoryShellCommand', () => {
    it('uses Get-ChildItem on Windows', () => {
      const original = process.platform;
      Object.defineProperty(process, 'platform', { value: 'win32' });
      try {
        expect(formatListDirectoryShellCommand('C:\\Users\\Test')).toBe(
          "Get-ChildItem -LiteralPath 'C:\\Users\\Test' -Force",
        );
      } finally {
        Object.defineProperty(process, 'platform', { value: original });
      }
    });

    it('uses ls -1Ap on Unix', () => {
      const original = process.platform;
      Object.defineProperty(process, 'platform', { value: 'linux' });
      try {
        expect(formatListDirectoryShellCommand('/home/user/project')).toBe(
          "ls -1Ap '/home/user/project'",
        );
      } finally {
        Object.defineProperty(process, 'platform', { value: original });
      }
    });

    it('returns custom command when provided', () => {
      expect(formatListDirectoryShellCommand('/tmp', 'find . -maxdepth 1')).toBe('find . -maxdepth 1');
    });
  });

  describe('parseListDirectoryShellStdout', () => {
    it('parses JSON array output', () => {
      const stdout = JSON.stringify([
        { name: 'a.ts', path: '/proj/a.ts', isDir: false, size: 12, mtime: 100 },
        { name: 'src', path: '/proj/src', isDir: true },
      ]);
      expect(parseListDirectoryShellStdout(stdout)).toEqual([
        { name: 'a.ts', path: '/proj/a.ts', isDir: false, size: 12, mtime: 100 },
        { name: 'src', path: '/proj/src', isDir: true },
      ]);
    });

    it('throws on error payload', () => {
      expect(() => parseListDirectoryShellStdout(JSON.stringify({ error: 'Permission denied' })))
        .toThrow('Permission denied');
    });
  });

  describe('parseLs1ApOutput', () => {
    it('parses ls -1Ap lines', () => {
      expect(parseLs1ApOutput('src/\nREADME.md\n', '/proj')).toEqual([
        { name: 'src', path: path.join('/proj', 'src'), isDir: true },
        { name: 'README.md', path: path.join('/proj', 'README.md'), isDir: false },
      ]);
    });
  });

  describe('looksLikeMisparsedShellTableOutput', () => {
    it('detects PowerShell table header rows misread as files', () => {
      expect(
        looksLikeMisparsedShellTableOutput([
          { name: 'Name', path: 'C:\\proj\\Name', isDir: false },
          { name: '----', path: 'C:\\proj\\----', isDir: false },
          { name: 'apps', path: 'C:\\proj\\apps', isDir: false },
        ]),
      ).toBe(true);
    });

    it('returns false for normal directory listings', () => {
      expect(
        looksLikeMisparsedShellTableOutput([
          { name: 'apps', path: 'C:\\proj\\apps', isDir: true },
          { name: 'README.md', path: 'C:\\proj\\README.md', isDir: false },
        ]),
      ).toBe(false);
    });
  });
});
