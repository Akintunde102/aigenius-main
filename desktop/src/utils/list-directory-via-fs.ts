import fs from 'fs/promises';
import path from 'path';
import type { DirectoryListingItem } from './tool-formatter';

/**
 * List a directory via Node fs APIs (no shell spawn). Used for default explorer listings.
 */
export async function listDirectoryViaFs(dirPath: string, limit: number): Promise<DirectoryListingItem[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const items: DirectoryListingItem[] = [];

  for (const entry of entries) {
    if (items.length >= limit) {
      break;
    }

    const name = entry.name;
    if (!name || name === '.' || name === '..') {
      continue;
    }

    const itemPath = path.join(dirPath, name);
    const isDir = entry.isDirectory();
    const item: DirectoryListingItem = { name, path: itemPath, isDir };

    if (!isDir) {
      try {
        const stat = await fs.stat(itemPath);
        item.size = stat.size;
        item.mtime = Math.floor(stat.mtimeMs / 1000);
      } catch {
        /* stat may fail for transient or permission-restricted files */
      }
    }

    items.push(item);
  }

  return items;
}
