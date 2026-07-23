import chokidar, { type FSWatcher } from 'chokidar';
import type { Stats } from 'fs';
import fs from 'fs';
import path from 'path';
import { shouldSkipSearchIndexing } from './exemptions.js';
import type { IndexPhase } from './index-phase.js';

export type WatchEventType = 'add' | 'change' | 'unlink' | 'git_branch_switch';
export type WatchEvent = {
  type: WatchEventType;
  path: string;
  stats?: Stats;
  force?: boolean;
  /** Bulk scans: `text` then `structure`. Watcher events omit phase (full pipeline). */
  phase?: IndexPhase;
  /** After text phase completes, enqueue structure for this path (bulk active project). */
  pipelineStructure?: boolean;
  attempt?: number;
};

const DEFAULT_IGNORED_PATTERNS = [
  /(^|[/\\])\..+/, // dot-files / dot-folders
  /(^|[/\\])venv([/\\]|$)/,
  /(^|[/\\])\.venv([/\\]|$)/,
  /(^|[/\\])env([/\\]|$)/,
  /(^|[/\\])\.env([/\\]|$)/,
  /__pycache__/,
  /(^|[/\\])out([/\\]|$)/,
  /(^|[/\\])target([/\\]|$)/,
  /(^|[/\\])cuda([/\\]|$)/,
  /(^|[/\\])anaconda3([/\\]|$)/,
  /(^|[/\\])miniconda3([/\\]|$)/,
  /(^|[/\\])site-packages([/\\]|$)/,
  /\.sqlite/,
  /\.db$/,
  /\.DS_Store/,
  // Windows Junctions/System folders that often cause EPERM
  /Local Settings/,
  /Cookies/,
  /My Documents/,
  /My Music/,
  /My Pictures/,
  /My Videos/,
  /Recent/,
  /NetHood/,
  /PrintHood/,
  /Templates/,
  /SendTo/,
  /Start Menu/,
  /[/\\]\.agent([/\\]|$)/,
];

/**
 * Starts a chokidar watcher over the given paths.
 * Emits add/change/unlink events via the `onEvent` callback.
 * Returns a cleanup function that stops the watcher.
 */
export function startWatcher(
  paths: string[],
  onEvent: (event: WatchEvent) => void,
): () => Promise<void> {
  const watcher: FSWatcher = chokidar.watch(paths, {
    ignored: (testPath: string) => {
      if (shouldSkipSearchIndexing(testPath)) return true;
      return DEFAULT_IGNORED_PATTERNS.some((pattern) => pattern.test(testPath));
    },
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 500, pollInterval: 100 },
  });

  const emit =
    (type: WatchEventType) =>
      (filePath: string, stats?: Stats): void => {
        onEvent({ type, path: filePath, stats });
      };

  watcher
    .on('add', emit('add'))
    .on('change', emit('change'))
    .on('unlink', emit('unlink'))
    .on('error', (err: any) => {
      // Silence common permission errors on Windows system folders/junctions
      if (err?.code === 'EPERM' || err?.code === 'EACCES') {
        return;
      }

      if (err?.code === 'ENOSPC') {
        console.error(
          '[search-watcher] System limit for file watchers reached (ENOSPC).',
          'To fix this, increase the inotify limit:',
          'sudo sysctl -w fs.inotify.max_user_watches=524288',
        );
      } else {
        console.error('[search-watcher] chokidar error:', err);
      }
    });

  // Detect git branch switches via HEAD changes
  const headWatchers: FSWatcher[] = [];
  for (const watchRoot of paths) {
    const gitHead = path.join(watchRoot, '.git', 'HEAD');
    if (!fs.existsSync(gitHead)) continue;
    const headWatcher = chokidar.watch(gitHead, { persistent: true, ignoreInitial: true });
    headWatcher.on('change', () => {
      onEvent({ type: 'git_branch_switch', path: watchRoot });
    });
    headWatchers.push(headWatcher);
  }

  return async () => {
    await watcher.close();
    await Promise.all(headWatchers.map((w) => w.close()));
  };
}
