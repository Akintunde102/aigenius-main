import fs from 'fs';
import path from 'path';
import { shouldSkipSearchIndexing } from './exemptions.js';
import { resolveStandardUserFolders } from './device-known-folders.js';

const MAX_TOP_LEVEL_ENTRIES = 48;
const MAX_CHILDREN_LISTED = 12;

export type HomeFolderMapEntry = {
  name: string;
  absPath: string;
  kind: 'directory' | 'file' | 'symlink';
  childDirNames?: string[];
};

export type DeviceFolderStructureMap = {
  home: string;
  platform: string;
  baselineFastDirs: string[];
  topLevel: HomeFolderMapEntry[];
};

function listTopLevel(home: string): HomeFolderMapEntry[] {
  let names: string[] = [];
  try {
    names = fs.readdirSync(home);
  } catch {
    return [];
  }
  names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const out: HomeFolderMapEntry[] = [];
  for (const name of names) {
    if (out.length >= MAX_TOP_LEVEL_ENTRIES) break;
    if (name.startsWith('.')) continue;
    const abs = path.join(home, name);
    if (shouldSkipSearchIndexing(abs)) continue;
    try {
      const stat = fs.lstatSync(abs);
      if (stat.isDirectory()) {
        let childDirNames: string[] | undefined;
        try {
          childDirNames = fs
            .readdirSync(abs, { withFileTypes: true })
            .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
            .map((e) => e.name)
            .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
            .slice(0, MAX_CHILDREN_LISTED);
        } catch {
          childDirNames = undefined;
        }
        out.push({ name, absPath: abs, kind: 'directory', childDirNames });
      } else if (stat.isFile()) {
        out.push({ name, absPath: abs, kind: 'file' });
      } else if (stat.isSymbolicLink()) {
        out.push({ name, absPath: abs, kind: 'symlink' });
      }
    } catch {
      /* permission */
    }
  }
  return out;
}

/** Compact home layout for the pocket planner model (no file contents). */
export function buildDeviceFolderStructureMap(): DeviceFolderStructureMap {
  const folders = resolveStandardUserFolders();
  const { home, desktop, documents, downloads } = folders;
  const baselineFastDirs = [desktop, documents, downloads].filter((p): p is string => Boolean(p));

  return {
    home,
    platform: process.platform,
    baselineFastDirs,
    topLevel: listTopLevel(home),
  };
}

export function formatDeviceFolderStructureMapForPrompt(map: DeviceFolderStructureMap): string {
  const lines: string[] = [
    `home=${map.home}`,
    `platform=${map.platform}`,
    `already_fast_index=${map.baselineFastDirs.join('; ') || '(none)'}`,
    'top_level:',
  ];
  for (const entry of map.topLevel) {
    if (entry.kind === 'directory') {
      const kids = entry.childDirNames?.length
        ? ` [dirs: ${entry.childDirNames.join(', ')}]`
        : '';
      lines.push(`  - ${entry.name}/ (absolute: ${entry.absPath})${kids}`);
    } else {
      lines.push(`  - ${entry.name} (${entry.kind})`);
    }
  }
  return lines.join('\n');
}
