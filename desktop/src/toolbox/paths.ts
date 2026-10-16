import path from 'path';

export function toolboxRootDir(userDataDir: string): string {
  return path.join(userDataDir, 'toolbox');
}

export function toolboxDbPath(userDataDir: string): string {
  return path.join(toolboxRootDir(userDataDir), 'toolbox.db');
}

export function toolFolderPath(
  userDataDir: string,
  scope: 'global' | 'project',
  projectId: string | null,
  name: string,
): string {
  const base = path.join(toolboxRootDir(userDataDir), 'tools');
  if (scope === 'project') {
    const pid = projectId?.trim() || '_missing';
    return path.join(base, 'projects', pid, name);
  }
  return path.join(base, 'global', name);
}

export function toolWorkDir(
  userDataDir: string,
  scopeKey: string,
  name: string,
): string {
  return path.join(toolboxRootDir(userDataDir), 'work', scopeKey, name);
}

export function toolArchiveDir(
  userDataDir: string,
  scopeKey: string,
  name: string,
  timestamp: string,
): string {
  return path.join(toolboxRootDir(userDataDir), 'archive', scopeKey, `${name}-${timestamp}`);
}

export function toolHistoryDir(
  userDataDir: string,
  scopeKey: string,
  name: string,
  version: number,
  timestamp: string,
): string {
  return path.join(
    toolboxRootDir(userDataDir),
    'history',
    scopeKey,
    name,
    `${version}-${timestamp}`,
  );
}

export function scopeKey(scope: 'global' | 'project', projectId: string | null): string {
  return scope === 'project' ? `project:${projectId ?? ''}` : 'global';
}

export function isInsideToolbox(userDataDir: string, absolutePath: string): boolean {
  const root = path.resolve(toolboxRootDir(userDataDir));
  const resolved = path.resolve(absolutePath);
  if (process.platform === 'win32') {
    const rootLower = root.toLowerCase();
    const resolvedLower = resolved.toLowerCase();
    return resolvedLower === rootLower || resolvedLower.startsWith(rootLower + path.sep);
  }
  return resolved === root || resolved.startsWith(root + path.sep);
}

export function safeRelPath(rel: string): { ok: true; normalized: string } | { ok: false; error: string } {
  if (!rel || typeof rel !== 'string') {
    return { ok: false, error: 'path required' };
  }
  if (rel.includes('\0') || rel.includes(':')) {
    return { ok: false, error: 'invalid path characters' };
  }
  const trimmed = rel.replace(/\\/g, '/').trim();
  if (!trimmed || trimmed.startsWith('/') || /^[a-zA-Z]:/.test(trimmed)) {
    return { ok: false, error: 'path must be relative' };
  }
  const segments = trimmed.split('/').filter((s) => s.length > 0);
  for (const seg of segments) {
    if (seg === '..') {
      return { ok: false, error: 'path must not contain ..' };
    }
    if (seg.startsWith('.')) {
      return { ok: false, error: 'dotfiles are not allowed' };
    }
    if (seg.toLowerCase() === 'skill.md') {
      return { ok: false, error: 'SKILL.md is written by the app' };
    }
  }
  const normalized = segments.join('/');
  return { ok: true, normalized };
}

export function parseToolNameArg(
  raw: string,
  defaultScope?: 'global' | 'project',
): { scope?: 'global' | 'project'; name: string } | { ok: false; error: string } {
  const s = raw.trim();
  if (!s) {
    return { ok: false, error: 'name required' };
  }
  const slash = s.indexOf('/');
  if (slash >= 0) {
    const scopePart = s.slice(0, slash).toLowerCase();
    const name = s.slice(slash + 1).trim();
    if (scopePart !== 'global' && scopePart !== 'project') {
      return { ok: false, error: 'scope must be global or project' };
    }
    if (!name) {
      return { ok: false, error: 'name required after scope/' };
    }
    return { scope: scopePart as 'global' | 'project', name };
  }
  return { scope: defaultScope, name: s };
}
