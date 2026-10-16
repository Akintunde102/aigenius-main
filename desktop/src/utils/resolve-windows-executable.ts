import fs from 'fs';
import path from 'path';

function windowsRoot(): string {
  return process.env.SystemRoot || process.env.WINDIR || 'C:\\Windows';
}

/**
 * Resolve a Windows shell executable to an absolute path.
 * Electron often launches with a minimal PATH, so bare names like `powershell.exe` fail with ENOENT.
 */
export function resolveWindowsExecutable(executable: string): string {
  if (process.platform !== 'win32') {
    return executable;
  }

  const normalized = executable.toLowerCase();
  const candidates: string[] = [];

  if (normalized === 'powershell.exe' || normalized === 'pwsh.exe') {
    if (normalized === 'pwsh.exe') {
      candidates.push(
        path.join(process.env.ProgramFiles || 'C:\\Program Files', 'PowerShell', '7', 'pwsh.exe'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'PowerShell', '7', 'pwsh.exe'),
        path.join(windowsRoot(), 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      );
    } else {
      candidates.push(
        path.join(windowsRoot(), 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
        path.join(process.env.ProgramFiles || 'C:\\Program Files', 'PowerShell', '7', 'pwsh.exe'),
        path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'PowerShell', '7', 'pwsh.exe'),
      );
    }
  }

  if (normalized === 'cmd.exe') {
    candidates.push(path.join(windowsRoot(), 'System32', 'cmd.exe'));
  }

  candidates.push(path.join(windowsRoot(), 'System32', executable));

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      /* ignore inaccessible paths */
    }
  }

  return executable;
}

/**
 * Resolves the preferred PowerShell executable on Windows.
 * Prioritizes pwsh.exe (PowerShell 7+) when installed, then standard Windows PowerShell (powershell.exe).
 */
export function resolveWindowsShellExecutable(): string {
  if (process.platform !== 'win32') {
    return process.env.SHELL || '/bin/sh';
  }

  const pwshCandidates: string[] = [
    path.join(process.env.ProgramFiles || 'C:\\Program Files', 'PowerShell', '7', 'pwsh.exe'),
    path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'PowerShell', '7', 'pwsh.exe'),
  ];

  for (const candidate of pwshCandidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      /* ignore inaccessible paths */
    }
  }

  const winPs = path.join(windowsRoot(), 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
  try {
    if (fs.existsSync(winPs)) {
      return winPs;
    }
  } catch {
    /* ignore inaccessible paths */
  }

  return 'powershell.exe';
}

export type ShellInvocation = {
  shell: string;
  args: string[];
  windowsVerbatimArguments: boolean;
};

/**
 * Builds the platform-standard shell command invocation.
 * On Windows, spawns PowerShell with UTF-8 encoding, suppressed CLIXML progress noise, and exit code propagation.
 * On POSIX, spawns `/bin/sh -c <command>`.
 */
export function buildShellInvocation(command: string): ShellInvocation {
  if (process.platform === 'win32') {
    const shell = resolveWindowsShellExecutable();
    const preamble = `[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; $ProgressPreference = 'SilentlyContinue'; `;
    const exitCheck = `; if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) { exit $LASTEXITCODE }`;
    const fullScript = `${preamble}${command}${exitCheck}`;

    // Base64 EncodedCommand avoids cmdline quote escaping issues for complex scripts.
    // Windows command line length limit is 32k chars, so we use EncodedCommand when under 8k chars.
    if (fullScript.length <= 8000) {
      const b64 = Buffer.from(fullScript, 'utf16le').toString('base64');
      return {
        shell,
        args: ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-EncodedCommand', b64],
        windowsVerbatimArguments: false,
      };
    }

    return {
      shell,
      args: ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', fullScript],
      windowsVerbatimArguments: false,
    };
  }

  return {
    shell: process.env.SHELL || '/bin/sh',
    args: ['-c', command],
    windowsVerbatimArguments: false,
  };
}
