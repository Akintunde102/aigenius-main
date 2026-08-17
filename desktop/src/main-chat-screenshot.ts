import {
  BrowserWindow,
  desktopCapturer,
  screen,
} from 'electron';
import * as mainShellFocus from './main-shell-focus';

const DESKTOP_BRIDGE_DEBUG = process.env.AIGENIUS_DESKTOP_BRIDGE_DEBUG === '1';

export const DESKTOP_QUEUE_CHAT_SCREENSHOT_CHAN = 'aigenius-desktop-queue-chat-screenshot';

/**
 * Works while other apps are focused (unlike menu accelerators). Keep in sync with any docs/tooltips.
 * If registration fails (OS reserved / conflict), use View → Attach Window Screenshot to Chat.
 */
export const CHAT_SCREENSHOT_GLOBAL_ACCELERATOR = 'CommandOrControl+Alt+S';

export function defaultScreenshotBasename(): string {
  const stamp = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+/, '');
  return `aigenius-screenshot-${stamp}.png`;
}

export async function captureBrowserWindowPngBase64(
  win: BrowserWindow,
): Promise<{ base64: string } | { error: string }> {
  try {
    const image = await win.webContents.capturePage();
    const png = image.toPNG();
    if (!png || png.length === 0) {
      return { error: 'Empty capture' };
    }
    return { base64: png.toString('base64') };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message || 'capturePage failed' };
  }
}

export function resolveShellWindowForScreenshot(hint?: BrowserWindow | null): BrowserWindow | null {
  if (hint && !hint.isDestroyed()) {
    return hint;
  }
  if (mainShellFocus.lastFocusedMainShellWindow && !mainShellFocus.lastFocusedMainShellWindow.isDestroyed()) {
    return mainShellFocus.lastFocusedMainShellWindow;
  }
  const focused = BrowserWindow.getFocusedWindow();
  if (focused && !focused.isDestroyed()) {
    return focused;
  }
  return BrowserWindow.getAllWindows().find((w) => !w.isDestroyed()) ?? null;
}

type ChatScreenshotPart = { base64: string; mimeType: string; basename: string };

export function sortDisplaysLeftTopFirst(displays: Electron.Display[]): Electron.Display[] {
  return displays.slice().sort((a, b) => {
    if (a.bounds.x !== b.bounds.x) {
      return a.bounds.x - b.bounds.x;
    }
    return a.bounds.y - b.bounds.y;
  });
}

/**
 * Full-monitor PNGs via `desktopCapturer` (not the AIGenius window).
 * Multiple monitors → multiple images (except OS setups that expose one combined screen source).
 */
export async function captureAllDisplaysAsPngPayloads(): Promise<ChatScreenshotPart[]> {
  const displays = sortDisplaysLeftTopFirst(screen.getAllDisplays());
  if (displays.length === 0) {
    return [];
  }

  const maxW = Math.max(
    1,
    ...displays.map((d) => Math.round(d.size.width * d.scaleFactor)),
  );
  const maxH = Math.max(
    1,
    ...displays.map((d) => Math.round(d.size.height * d.scaleFactor)),
  );

  let sources: Electron.DesktopCapturerSource[];
  try {
    sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: maxW, height: maxH },
    });
  } catch (err) {
    console.error('[aigenius-desktop] desktopCapturer.getSources failed', err);
    return [];
  }

  if (sources.length === 0) {
    return [];
  }

  const stampSegment = new Date().toISOString().replace(/[:]/g, '-').replace(/\..+/, '');
  const out: ChatScreenshotPart[] = [];

  if (sources.length === 1) {
    const png = sources[0]!.thumbnail.toPNG();
    if (png.length > 0) {
      out.push({
        base64: png.toString('base64'),
        mimeType: 'image/png',
        basename: `desktop-full-${stampSegment}.png`,
      });
    }
    return out;
  }

  for (let i = 0; i < displays.length; i++) {
    const display = displays[i]!;
    const match =
      sources.find((s) => String(s.display_id) === String(display.id)) ??
      (sources.length === displays.length ? sources[i] : undefined);

    if (!match) {
      console.warn('[aigenius-desktop] No desktopCapturer source for display', display.id);
      continue;
    }
    const png = match.thumbnail.toPNG();
    if (png.length === 0) {
      continue;
    }
    out.push({
      base64: png.toString('base64'),
      mimeType: 'image/png',
      basename: `desktop-${display.id}-${i}-${stampSegment}.png`,
    });
  }

  return out;
}

export async function attachFullDesktopScreenshotsToChat(webContents: Electron.WebContents): Promise<void> {
  const batch = await captureAllDisplaysAsPngPayloads();
  if (batch.length === 0) {
    if (DESKTOP_BRIDGE_DEBUG) {
      console.warn('[aigenius-desktop] full-desktop capture produced no images');
    }
    return;
  }
  webContents.send(DESKTOP_QUEUE_CHAT_SCREENSHOT_CHAN, { batch });
}

export async function attachFullDesktopToChatShell(hint?: BrowserWindow | null): Promise<void> {
  const target = resolveShellWindowForScreenshot(hint ?? undefined);
  if (!target || target.isDestroyed()) {
    return;
  }
  await attachFullDesktopScreenshotsToChat(target.webContents);
}
