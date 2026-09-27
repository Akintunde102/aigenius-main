/**
 * Block shell commands that need elevation or system package installs.
 * Non-interactive sidecar shells cannot enter passwords / UAC — fail fast with OS-specific guidance.
 */

export type ShellBlockPlatform = NodeJS.Platform;

function terminalLabel(platform: ShellBlockPlatform): string {
  if (platform === 'win32') {
    return 'PowerShell or Command Prompt';
  }
  if (platform === 'darwin') {
    return 'Terminal';
  }
  return 'system Terminal';
}

function installGuidance(platform: ShellBlockPlatform, reason: string): string {
  return (
    `${reason} AIGenius shell cannot complete this interactively. `
    + `Run the command in your ${terminalLabel(platform)}, or ask me for copy-paste install steps in chat.`
  );
}

function detectUnixElevation(command: string): boolean {
  return /\bsudo\b/.test(command) || /\bpkexec\b/.test(command);
}

function detectLinuxPackageInstall(command: string): boolean {
  return /\b(apt-get|apt|dnf|yum|apk|pacman|zypper)\b/i.test(command)
    && /\b(install|add)\b/i.test(command);
}

function detectMacPackageInstall(command: string): boolean {
  return /\bbrew\s+(install|upgrade|reinstall|tap)\b/i.test(command)
    || /\bport\s+install\b/i.test(command);
}

function detectWindowsElevation(command: string): boolean {
  if (/\brunas\b/i.test(command)) {
    return true;
  }
  if (/\bStart-Process\b/i.test(command) && /-Verb\s+RunAs/i.test(command)) {
    return true;
  }
  if (/\bpowershell\b/i.test(command) && /-verb\s+runas/i.test(command)) {
    return true;
  }
  return false;
}

function detectWindowsPackageInstall(command: string): boolean {
  return /\b(winget|choco|scoop)\s+install\b/i.test(command)
    || /\bmsiexec\b/i.test(command);
}

function detectGlobalNpmInstall(command: string): boolean {
  return /\bnpm\s+(install|i)\s+(-g|--global)\b/i.test(command)
    || /\bnpm\s+(-g|--global)\s+(install|i)\b/i.test(command);
}

/** Killing every node.exe also kills the API, Next.js, and the sidecar, so the tool result can never return. */
function detectKillsAllNodeProcesses(command: string): boolean {
  return /\bStop-Process\b[\s\S]{0,160}-Name\b[\s\S]{0,40}\bnode\b/i.test(command)
    || /\btaskkill\b[\s\S]{0,160}\bnode\.exe\b/i.test(command)
    || /\b(killall|pkill)\b[\s\S]{0,40}\bnode\b/.test(command);
}

/**
 * Returns an error message when the command should not run in local_shell, else null.
 */
export function blockInteractiveShellCommand(
  command: string,
  platform: ShellBlockPlatform = process.platform,
): string | null {
  const trimmed = command.trim();
  if (!trimmed) {
    return null;
  }

  if (detectGlobalNpmInstall(trimmed)) {
    return installGuidance(
      platform,
      'Global npm installs (`npm i -g`) are blocked in the app shell.',
    );
  }

  if (detectKillsAllNodeProcesses(trimmed)) {
    return (
      'This command stops every Node process, including the AIGenius API. '
      + 'The chat connection would drop and this tool could not return a result. '
      + 'Stop one process by PID instead (for example Stop-Process -Id <pid>).'
    );
  }

  if (platform === 'win32') {
    if (detectWindowsElevation(trimmed)) {
      return installGuidance(
        platform,
        'This command requests administrator elevation (runas / RunAs).',
      );
    }
    if (detectWindowsPackageInstall(trimmed)) {
      return installGuidance(
        platform,
        'System package installs (winget, choco, scoop, msiexec) are blocked in the app shell.',
      );
    }
    return null;
  }

  if (platform === 'darwin') {
    if (detectUnixElevation(trimmed)) {
      return installGuidance(platform, 'This command uses sudo and needs your password.');
    }
    if (detectMacPackageInstall(trimmed)) {
      return installGuidance(
        platform,
        'Homebrew/MacPorts installs are blocked in the app shell.',
      );
    }
    return null;
  }

  // Linux and other Unix
  if (detectUnixElevation(trimmed)) {
    return installGuidance(platform, 'This command uses sudo/pkexec and needs your password.');
  }
  if (detectLinuxPackageInstall(trimmed)) {
    return installGuidance(
      platform,
      'System package installs (apt, dnf, yum, etc.) are blocked in the app shell.',
    );
  }

  return null;
}
