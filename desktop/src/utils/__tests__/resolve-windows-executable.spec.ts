import fs from 'fs';
import path from 'path';
import {
  resolveWindowsExecutable,
  resolveWindowsShellExecutable,
  buildShellInvocation,
} from '../resolve-windows-executable';

describe('resolve-windows-executable and shell invocation', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform });
  });

  describe('resolveWindowsShellExecutable', () => {
    it('returns process.env.SHELL or /bin/sh on non-Windows', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      expect(resolveWindowsShellExecutable()).toBe(process.env.SHELL || '/bin/sh');
    });

    it('resolves powershell or pwsh on Windows', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const shell = resolveWindowsShellExecutable();
      expect(shell).toMatch(/powershell\.exe|pwsh\.exe/i);
      if (process.platform === 'win32') {
        expect(fs.existsSync(shell)).toBe(true);
      }
    });
  });

  describe('buildShellInvocation', () => {
    it('builds /bin/sh -c invocation on POSIX platforms', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      const inv = buildShellInvocation('ls -la');
      expect(inv.shell).toBe(process.env.SHELL || '/bin/sh');
      expect(inv.args).toEqual(['-c', 'ls -la']);
      expect(inv.windowsVerbatimArguments).toBe(false);
    });

    it('builds EncodedCommand PowerShell invocation on Windows for standard commands', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const command = "Get-ChildItem | Select-Object -First 2";
      const inv = buildShellInvocation(command);

      expect(inv.shell).toMatch(/powershell\.exe|pwsh\.exe/i);
      expect(inv.windowsVerbatimArguments).toBe(false);
      expect(inv.args[0]).toBe('-NoProfile');
      expect(inv.args[1]).toBe('-NonInteractive');
      expect(inv.args[2]).toBe('-ExecutionPolicy');
      expect(inv.args[3]).toBe('Bypass');
      expect(inv.args[4]).toBe('-EncodedCommand');

      // Decode base64 UTF-16LE payload to ensure preamble, command, and exit checks are intact
      const decoded = Buffer.from(inv.args[5], 'base64').toString('utf16le');
      expect(decoded).toContain("[Console]::OutputEncoding = [System.Text.Encoding]::UTF8;");
      expect(decoded).toContain("$ProgressPreference = 'SilentlyContinue';");
      expect(decoded).toContain(command);
      expect(decoded).toContain("if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) { exit $LASTEXITCODE }");
    });

    it('falls back to -Command on Windows when command exceeds 8000 characters', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      const longCommand = 'Write-Output ' + 'x'.repeat(8100);
      const inv = buildShellInvocation(longCommand);

      expect(inv.args[4]).toBe('-Command');
      expect(inv.args[5]).toContain(longCommand);
      expect(inv.args[5]).toContain("$ProgressPreference = 'SilentlyContinue';");
    });
  });
});
