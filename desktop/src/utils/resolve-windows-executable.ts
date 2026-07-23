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
    candidates.push(
      path.join(windowsRoot(), 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe'),
      path.join(process.env.ProgramFiles || 'C:\\Program Files', 'PowerShell', '7', 'pwsh.exe'),
      path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'PowerShell', '7', 'pwsh.exe'),
    );
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
