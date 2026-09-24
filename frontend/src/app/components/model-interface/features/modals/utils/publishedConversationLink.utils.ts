import copy from 'copy-to-clipboard';

/**
 * Electron denies `navigator.clipboard.writeText` unless clipboard permission is granted.
 * `copy-to-clipboard` uses `document.execCommand('copy')`, which works in the desktop shell.
 * The clipboard API is the fallback for browsers that block `execCommand`.
 */
export async function copyPublishedConversationUrl(url: string): Promise<boolean> {
  const text = url.trim();
  if (!text) {
    return false;
  }
  if (copy(text)) {
    return true;
  }
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * On desktop, `window.open` of a same-origin published page is loaded inside the shell.
 * The desktop bridge opens the OS browser instead.
 */
export function openPublishedConversationUrl(url: string): void {
  const target = url.trim();
  if (!target || typeof window === 'undefined') {
    return;
  }

  const desktop = window.aigeniusDesktop;
  if (desktop?.isDesktop) {
    const openInBrowser = desktop.openExternalUrl ?? desktop.openExternal;
    if (typeof openInBrowser === 'function') {
      void openInBrowser(target);
      return;
    }
  }

  window.open(target, '_blank', 'noopener,noreferrer');
}
