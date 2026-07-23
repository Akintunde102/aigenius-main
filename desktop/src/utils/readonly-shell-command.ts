export type ReadonlyShellPlatform = 'win32' | 'unix';

export function resolveReadonlyShellPlatform(platform = process.platform): ReadonlyShellPlatform {
  return platform === 'win32' ? 'win32' : 'unix';
}

const UNIX_BLOCKED = [
  /\brm\b/i,
  /\brmdir\b/i,
  /\bmv\b/i,
  /\bcp\b/i,
  /\bchmod\b/i,
  /\bchown\b/i,
  /\bmkdir\b/i,
  /\btouch\b/i,
  /\btruncate\b/i,
  /\bdd\b/i,
  /\btee\b/i,
  /\bcurl\b/i,
  /\bwget\b/i,
  /\bnc\b/i,
  /\bnetcat\b/i,
  /\bnpm\s+install\b/i,
  /\bapt\b/i,
  /\byum\b/i,
  /\bbrew\s+install\b/i,
  />>?/,
  /\|\s*tee\b/i,
];

const WINDOWS_BLOCKED = [
  /\bremove-item\b/i,
  /\brm\b/i,
  /\bdel\b/i,
  /\brmdir\b/i,
  /\brd\b/i,
  /\bset-content\b/i,
  /\badd-content\b/i,
  /\bout-file\b/i,
  /\bnew-item\b/i,
  /\bmove-item\b/i,
  /\bcopy-item\b/i,
  /\bcopy\b/i,
  /\binvoke-webrequest\b/i,
  /\bstart-process\b/i,
  /\biwr\b/i,
  /\bcurl\b/i,
  /\bwget\b/i,
  />>?/,
];

/**
 * Throws when a listing command appears mutating or exfiltrating.
 * Best-effort gate for approval-free read-only shell.
 */
export function assertReadonlyShellCommand(command: string, platform: ReadonlyShellPlatform = resolveReadonlyShellPlatform()): void {
  const trimmed = command.trim();
  if (!trimmed) {
    throw new Error('command must be a non-empty read-only shell command');
  }
  if (trimmed.length > 16_000) {
    throw new Error('command is too long');
  }

  const blocked = platform === 'win32' ? WINDOWS_BLOCKED : UNIX_BLOCKED;
  for (const pattern of blocked) {
    if (pattern.test(trimmed)) {
      throw new Error('command is not allowed for read-only directory listing');
    }
  }
}
