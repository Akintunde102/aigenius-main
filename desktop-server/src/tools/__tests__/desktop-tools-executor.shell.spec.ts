import os from 'node:os';
import { executeDesktopTool } from '../desktop-tools-executor';
import { isLongRunningShellCommand, resolveShellRunPolicy } from '../shell-run-policy.utils';
import { killChildProcessTree } from '../../utils/shell-process-tree';

describe('sidecar shell-run-policy', () => {
  it('backgrounds npm run dev and not npm test', () => {
    expect(isLongRunningShellCommand('npm run dev')).toBe(true);
    expect(resolveShellRunPolicy('npm test', {}).blockUntilMs).toBeNull();
  });
});

describe('executeDesktopTool local_shell', () => {
  function nodeEval(code: string): string {
    return `node -e ${JSON.stringify(code)}`;
  }

  it('backgrounds a sleeper when block_until_ms elapses', async () => {
    const started = Date.now();
    const out = await executeDesktopTool('local_shell', {
      command: nodeEval("console.log('ready'); setInterval(() => {}, 1000)"),
      cwd: os.tmpdir(),
      block_until_ms: 400,
      timeout_ms: 10_000,
    });
    expect(Date.now() - started).toBeLessThan(3_000);
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('still running');
      const pid = (out.rawData as { pid?: number } | undefined)?.pid;
      if (typeof pid === 'number') {
        killChildProcessTree({ pid });
      }
    }
  });

  it('executes PowerShell syntax and cmdlets on Windows', async () => {
    if (process.platform !== 'win32') {
      return;
    }
    const out = await executeDesktopTool('local_shell', {
      command: "Write-Output 'Hello from Sidecar PowerShell'; Get-Item . | ForEach-Object { $_.Exists }",
      cwd: os.tmpdir(),
      timeout_ms: 25_000,
    });
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.result).toContain('Hello from Sidecar PowerShell');
      expect(out.result).toContain('True');
    }
  }, 30_000);
});
