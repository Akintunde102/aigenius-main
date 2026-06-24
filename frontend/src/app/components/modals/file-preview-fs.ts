type BridgeResult = { ok: boolean; error?: string; result?: string; rawData?: unknown };

function getBridge() {
  return (typeof window !== 'undefined' ? (window as any).aigeniusDesktop : null) as {
    runLocalDesktopTool?: (payload: { tool: string; arguments: Record<string, unknown> }) => Promise<BridgeResult>;
  } | null;
}

export function joinPath(dir: string, name: string): string {
  const sep = dir.includes('\\') ? '\\' : '/';
  const trimmed = dir.replace(/[\\/]+$/, '');
  return `${trimmed}${sep}${name}`;
}

export function parentDir(filePath: string): string {
  const parts = filePath.split(/[\\/]/).filter(Boolean);
  if (parts.length <= 1) return filePath;
  const isWindowsDrive = /^[a-zA-Z]:$/.test(parts[0]);
  parts.pop();
  if (parts.length === 1 && isWindowsDrive) return `${parts[0]}\\`;
  return parts.join(filePath.includes('\\') ? '\\' : '/');
}

function isWindowsPath(p: string): boolean {
  return /^[a-zA-Z]:/.test(p) || p.includes('\\');
}

async function runPatch(operations: Array<Record<string, unknown>>): Promise<BridgeResult> {
  const bridge = getBridge();
  if (!bridge?.runLocalDesktopTool) return { ok: false, error: 'Desktop bridge unavailable' };
  return bridge.runLocalDesktopTool({ tool: 'local_apply_patch', arguments: { operations } });
}

async function runShell(command: string, cwd?: string): Promise<BridgeResult> {
  const bridge = getBridge();
  if (!bridge?.runLocalDesktopTool) return { ok: false, error: 'Desktop bridge unavailable' };
  return bridge.runLocalDesktopTool({
    tool: 'run_command',
    arguments: cwd ? { command, cwd } : { command },
  });
}

export async function createFile(filePath: string, content = ''): Promise<BridgeResult> {
  return runPatch([{ op: 'create_file', path: filePath, content }]);
}

export async function deleteFile(filePath: string): Promise<BridgeResult> {
  return runPatch([{ op: 'delete_file', path: filePath }]);
}

export async function createFolder(folderPath: string): Promise<BridgeResult> {
  const win = isWindowsPath(folderPath);
  const command = win ? `mkdir "${folderPath}"` : `mkdir -p "${folderPath}"`;
  return runShell(command);
}

export async function deleteFolder(folderPath: string): Promise<BridgeResult> {
  const win = isWindowsPath(folderPath);
  const command = win ? `rmdir /s /q "${folderPath}"` : `rm -rf "${folderPath}"`;
  return runShell(command);
}

export async function renamePath(oldPath: string, newName: string, isDir: boolean): Promise<BridgeResult> {
  const trimmed = newName.trim();
  if (!trimmed || /[\\/]/.test(trimmed)) {
    return { ok: false, error: 'Invalid name' };
  }
  const newPath = joinPath(parentDir(oldPath), trimmed);
  if (newPath === oldPath) return { ok: true };

  if (isDir) {
    const win = isWindowsPath(oldPath);
    const command = win
      ? `move "${oldPath}" "${newPath}"`
      : `mv "${oldPath}" "${newPath}"`;
    return runShell(command);
  }

  const bridge = getBridge();
  if (!bridge?.runLocalDesktopTool) return { ok: false, error: 'Desktop bridge unavailable' };

  const readRes = await bridge.runLocalDesktopTool({
    tool: 'local_read_file',
    arguments: { path: oldPath },
  });
  if (!readRes.ok) return readRes;

  const data = (readRes.rawData ?? JSON.parse(readRes.result || '{}')) as { content?: string };
  const createRes = await runPatch([{ op: 'create_file', path: newPath, content: data.content ?? '' }]);
  if (!createRes.ok) return createRes;
  return deleteFile(oldPath);
}
