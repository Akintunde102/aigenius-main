import fs from 'fs';

const MIN_WATCHES = 524288;
const WATCHES_PATH = '/proc/sys/fs/inotify/max_user_watches';

export interface LimitCheck {
  isSufficient: boolean;
  currentValue: number;
  recommendedValue: number;
  fixCommand: string;
}

/**
 * Checks if the Linux inotify limit is sufficient for large directory watching.
 * Returns null if not on Linux or if check fails.
 */
export function checkInotifyLimit(): LimitCheck | null {
  if (process.platform !== 'linux') {
    return null;
  }

  try {
    const raw = fs.readFileSync(WATCHES_PATH, 'utf8').trim();
    const current = parseInt(raw, 10);

    if (isNaN(current)) return null;

    return {
      isSufficient: current >= MIN_WATCHES,
      currentValue: current,
      recommendedValue: MIN_WATCHES,
      fixCommand: `echo "fs.inotify.max_user_watches=${MIN_WATCHES}" | sudo tee -a /etc/sysctl.conf && sudo sysctl -p`,
    };
  } catch (err) {
    console.warn('[sys-limits] Failed to read inotify limits:', err);
    return null;
  }
}
