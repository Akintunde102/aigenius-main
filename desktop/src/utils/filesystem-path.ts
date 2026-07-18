import path from 'path';

import { USER_HOME_DIR_AT_STARTUP } from '../chat-runtime-context';

/** Expand a leading `~` / `~/` path to the user home directory (Node does not do this in `path.resolve`). */
export function expandTildeInPath(filePath: string): string {
  if (filePath === '~') {
    return USER_HOME_DIR_AT_STARTUP;
  }
  if (filePath.startsWith('~/') || filePath.startsWith('~\\')) {
    return path.join(USER_HOME_DIR_AT_STARTUP, filePath.slice(2));
  }
  return filePath;
}
