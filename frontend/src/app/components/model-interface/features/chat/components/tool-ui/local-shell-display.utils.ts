/**
 * Human-friendly copy for local_shell tool cards (desktop terminal).
 * Command text is shown only as a short quote; full args live under Details.
 */

const CMD_MAX = 56;

export function shortenShellCommand(command: string, max = CMD_MAX): string {
  const t = command.trim().replace(/\s+/g, ' ');
  if (!t) return '';
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

/** Last path segment or whole string if no separators. */
export function folderLabelFromPath(cwd: string): string {
  const t = cwd.trim();
  if (!t) return '';
  const parts = t.split(/[/\\]/).filter(Boolean);
  return parts.length ? parts[parts.length - 1]! : t;
}

/**
 * Short plain-language category for the command (no jargon in the label itself).
 */
export function plainLanguageShellSummary(command: string): string {
  const c = command.trim().toLowerCase();
  if (!c) return 'A terminal command';

  if (/^npm\s+run\s+build\b/.test(c) || /^yarn\s+build\b/.test(c) || /^pnpm\s+run\s+build\b/.test(c)) {
    return 'Building the project';
  }
  if (/^npm\s+(install|ci|i)\b/.test(c) || /^yarn(\s+install)?\b/.test(c) || /^pnpm\s+i(nstall)?\b/.test(c)) {
    return 'Installing dependencies';
  }
  if (/^npm\b/.test(c) || /^yarn\b/.test(c) || /^pnpm\b/.test(c) || /^npx\b/.test(c)) {
    return 'Running a project task';
  }
  if (/^git\b/.test(c)) return 'Working with your Git repository';
  if (/^(docker|podman)\b/.test(c)) return 'Running a container command';
  if (/^(ls|dir)\b/.test(c)) return 'Listing folder contents';
  if (/^pwd\b/.test(c)) return 'Checking the current folder';
  if (/^(cd)\b/.test(c)) return 'Changing folder';
  if (/^(cat|type|head|tail|less|more)\b/.test(c)) return 'Reading a file';
  if (/^(curl|wget)\b/.test(c)) return 'Fetching from the network';
  if (/^(python|python3|py)\b/.test(c)) return 'Running Python';
  if (/^node\b/.test(c)) return 'Running Node.js';
  if (/^(bash|sh|zsh|fish)\b/.test(c)) return 'Running a shell script';
  if (/^(mkdir|rmdir|rm|del|copy|move|mv|cp)\b/.test(c)) return 'Changing files or folders';
  if (/^(grep|rg|find)\b/.test(c)) return 'Searching files';
  return 'Running a command';
}

/**
 * Verb for “{Verb} your command: …” one-liner (matches product copy).
 */
export function shellOneLinerVerb(command: string): string {
  const c = command.trim().toLowerCase();
  if (!c) return 'Running';

  if (/^npm\s+(install|ci|i)\b/.test(c) || (/^yarn\b/.test(c) && /install/.test(c)) || /^pnpm\s+i(nstall)?\b/.test(c)) {
    return 'Installing';
  }
  if (/^cd\b/.test(c)) return 'Changing directory';
  if (/^(ls|dir)\b/.test(c)) return 'Listing';
  if (/^git\b/.test(c)) return 'Using Git';
  if (/^(docker|podman)\b/.test(c)) return 'Running Docker';
  if (/^(npm|yarn|pnpm|npx)\b/.test(c)) return 'Running';
  if (/^(python|python3|py|node)\b/.test(c)) return 'Running';
  return 'Running';
}

const ONE_LINER_CMD_MAX = 96;

/**
 * Primary one-liner: “Running your command: cd foo && bar …”
 */
export function buildLocalShellOneLiner(args: Record<string, unknown> | undefined): string {
  const command = typeof args?.command === 'string' ? args.command.trim() : '';
  if (!command) {
    return 'No command was included with this step.';
  }
  const verb = shellOneLinerVerb(command);
  const shown = command.length > ONE_LINER_CMD_MAX ? `${command.slice(0, ONE_LINER_CMD_MAX - 1)}…` : command;
  return `${verb} your command: ${shown}`;
}

/** Parts for a single-line faux terminal prompt (cwd + separator + command). */
export type ShellTerminalPromptParts = {
  cwdDisplay: string;
  sep: string;
  commandLine: string;
};

/**
 * Builds prompt segments so the UI can render `{cwd} {sep} {command}` like a real shell.
 * Uses `>` after cwd when the path looks Windows-style; otherwise `$`.
 */
export function shellTerminalPromptParts(
  args: Record<string, unknown> | undefined,
): ShellTerminalPromptParts | null {
  const commandRaw = typeof args?.command === 'string' ? args.command : '';
  const cwdRaw = typeof args?.cwd === 'string' ? args.cwd.trim() : '';

  const commandLine = commandRaw.trim();
  if (!commandLine && !cwdRaw) return null;

  const cwdDisplay = cwdRaw.length > 0 ? cwdRaw : '~';

  const windowsPath =
    /^[A-Za-z]:[\\/]/.test(cwdDisplay) ||
    (cwdDisplay.includes('\\') && !cwdDisplay.startsWith('/'));

  const sep = windowsPath ? '>' : '$';

  return {
    cwdDisplay,
    sep,
    commandLine: commandLine.length > 0 ? commandLine : '(empty command)',
  };
}

/**
 * @deprecated Prefer {@link buildLocalShellOneLiner} for the surface row.
 */
export function buildLocalShellFriendlySurfaceLine(args: Record<string, unknown> | undefined): string {
  const command = typeof args?.command === 'string' ? args.command : '';
  const cwdRaw = typeof args?.cwd === 'string' && args.cwd.trim() ? args.cwd.trim() : '';

  if (!command.trim()) {
    return 'No command text was included with this step.';
  }

  const summary = plainLanguageShellSummary(command);
  const short = shortenShellCommand(command);
  const folder = folderLabelFromPath(cwdRaw);
  const where = folder ? ` in folder “${folder}”` : '';

  return `${summary}: “${short}”${where}.`;
}
