export type DesktopOsFamily = 'win32' | 'darwin' | 'linux';

/** Best-effort OS family for labels when preload does not expose `process.platform`. */
export function detectDesktopOsFamily(
  userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): DesktopOsFamily {
  if (/Windows/i.test(userAgent)) return 'win32';
  if (/Mac OS X|Macintosh/i.test(userAgent)) return 'darwin';
  return 'linux';
}

export function getRevealInFolderLabel(osFamily: DesktopOsFamily = detectDesktopOsFamily()): string {
  if (osFamily === 'darwin') return 'Reveal in Finder';
  if (osFamily === 'win32') return 'Reveal in File Explorer';
  return 'Reveal in file manager';
}

export async function copyLocalItem(
  filePath: string,
  options: {
    copyFileToClipboard?: (path: string) => Promise<{ ok: boolean; error?: string } | undefined>;
    writeText: (text: string) => boolean | Promise<boolean>;
  },
): Promise<boolean> {
  const trimmed = filePath.trim();
  if (!trimmed) return false;
  if (options.copyFileToClipboard) {
    const nativeCopy = await options.copyFileToClipboard(trimmed);
    if (nativeCopy?.ok) return true;
  }
  return Boolean(await options.writeText(trimmed));
}
