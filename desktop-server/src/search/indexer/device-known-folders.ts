import fs from 'fs';
import os from 'os';
import path from 'path';

export type StandardUserFolders = {
  home: string;
  desktop: string | null;
  documents: string | null;
  downloads: string | null;
};

function dirIfExists(candidate: string): string | null {
  try {
    const norm = path.normalize(candidate);
    if (fs.statSync(norm).isDirectory()) return norm;
  } catch {
    /* missing */
  }
  return null;
}

/** Resolve Desktop, Documents, Downloads (platform + XDG on Linux). */
export function resolveStandardUserFolders(): StandardUserFolders {
  const home = path.normalize(os.homedir());

  const fromEnv = (key: string, fallback: string): string | null =>
    dirIfExists(process.env[key] ?? fallback);

  if (process.platform === 'win32') {
    const profile = process.env.USERPROFILE ?? home;
    return {
      home,
      desktop: dirIfExists(path.join(profile, 'Desktop')),
      documents: dirIfExists(path.join(profile, 'Documents')),
      downloads: dirIfExists(path.join(profile, 'Downloads')),
    };
  }

  if (process.platform === 'darwin') {
    return {
      home,
      desktop: dirIfExists(path.join(home, 'Desktop')),
      documents: dirIfExists(path.join(home, 'Documents')),
      downloads: dirIfExists(path.join(home, 'Downloads')),
    };
  }

  return {
    home,
    desktop: fromEnv('XDG_DESKTOP_DIR', path.join(home, 'Desktop')),
    documents: fromEnv('XDG_DOCUMENTS_DIR', path.join(home, 'Documents')),
    downloads: fromEnv('XDG_DOWNLOAD_DIR', path.join(home, 'Downloads')),
  };
}

export function baselineFastIndexDirectories(): string[] {
  const { desktop, documents, downloads } = resolveStandardUserFolders();
  return [desktop, documents, downloads].filter((p): p is string => Boolean(p));
}
