import { app, BrowserWindow, Notification, type NativeImage, type WebContents } from 'electron';

export const AIGENIUS_NOTIFICATION_BRAND = 'AIGenius';
export const AIGENIUS_APP_USER_MODEL_ID = 'chat.aigenius.desktop';
export const MAX_NOTIFICATION_PREVIEW_WORDS = 10;

export type ChatCompletionNotifyPayload = {
  modelName?: string;
  preview: string;
};

let unreadCompletionCount = 0;
let notificationIcon: NativeImage | string | undefined;

export function configureDesktopNotificationBranding(): void {
  app.setName(AIGENIUS_NOTIFICATION_BRAND);
  if (process.platform === 'win32') {
    app.setAppUserModelId(AIGENIUS_APP_USER_MODEL_ID);
  }
}

export function setChatCompletionNotificationIcon(icon: NativeImage | string | undefined): void {
  notificationIcon = icon;
}

export function getUnreadChatCompletionCount(): number {
  return unreadCompletionCount;
}

export function isAppWindowFocused(): boolean {
  const focused = BrowserWindow.getFocusedWindow();
  return focused != null && !focused.isDestroyed();
}

export function clearChatCompletionBadge(win?: BrowserWindow): void {
  unreadCompletionCount = 0;
  try {
    if (process.platform === 'darwin') {
      app.dock?.setBadge('');
    } else {
      app.setBadgeCount(0);
    }
  } catch {
    /* ignore */
  }

  if (win && !win.isDestroyed()) {
    try {
      win.flashFrame(false);
    } catch {
      /* ignore */
    }
  }
}

function applyBadgeCount(): void {
  try {
    if (process.platform === 'darwin') {
      app.dock?.setBadge(unreadCompletionCount > 0 ? String(unreadCompletionCount) : '');
      return;
    }
    app.setBadgeCount(unreadCompletionCount);
  } catch {
    /* ignore */
  }
}

function incrementChatCompletionBadge(win?: BrowserWindow): void {
  unreadCompletionCount += 1;
  applyBadgeCount();
  if (win && !win.isDestroyed()) {
    try {
      win.flashFrame(true);
    } catch {
      /* ignore */
    }
  }
}

export function shortenModelLabel(modelName?: string): string | undefined {
  const raw = modelName?.trim();
  if (!raw) {
    return undefined;
  }

  const withoutProvider = raw.includes('/') ? raw.split('/').pop()! : raw;
  const humanized = withoutProvider
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!humanized) {
    return undefined;
  }
  if (humanized.length <= 28) {
    return humanized;
  }
  return `${humanized.slice(0, 25)}…`;
}

export function truncateNotificationPreview(
  text: string,
  maxWords = MAX_NOTIFICATION_PREVIEW_WORDS,
): string {
  const cleaned = text
    .replace(/[#*_`>[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return '';
  }

  const words = cleaned.split(' ');
  if (words.length <= maxWords) {
    return cleaned;
  }
  return `${words.slice(0, maxWords).join(' ')}…`;
}

export type FormattedChatCompletionNotification = {
  title: string;
  subtitle?: string;
  body: string;
};

export function formatChatCompletionNotification(
  modelName?: string,
  preview?: string,
): FormattedChatCompletionNotification {
  const snippet = truncateNotificationPreview(preview ?? '');
  const model = shortenModelLabel(modelName);
  const subtitle = model ? `Reply ready · ${model}` : 'Reply ready';

  if (snippet) {
    return {
      title: AIGENIUS_NOTIFICATION_BRAND,
      subtitle,
      body: snippet,
    };
  }

  return {
    title: AIGENIUS_NOTIFICATION_BRAND,
    subtitle,
    body: model ? `${model} finished. Tap to open.` : 'Your reply is ready. Tap to open.',
  };
}

function focusWindow(win: BrowserWindow): void {
  if (win.isDestroyed()) {
    return;
  }
  if (win.isMinimized()) {
    win.restore();
  }
  win.show();
  win.focus();
}

function resolveNotificationIcon(): NativeImage | string | undefined {
  if (notificationIcon) {
    return notificationIcon;
  }
  return undefined;
}

export function notifyChatCompletionIfBackground(
  sender: WebContents,
  payload: ChatCompletionNotifyPayload,
): { notified: boolean } {
  if (isAppWindowFocused()) {
    return { notified: false };
  }

  const formatted = formatChatCompletionNotification(payload.modelName, payload.preview);
  if (!formatted.body.trim()) {
    return { notified: false };
  }

  const win = BrowserWindow.fromWebContents(sender);
  incrementChatCompletionBadge(win ?? undefined);

  if (!Notification.isSupported()) {
    return { notified: true };
  }

  const icon = resolveNotificationIcon();
  const notification = new Notification({
    title: formatted.title,
    ...(formatted.subtitle ? { subtitle: formatted.subtitle } : {}),
    body: formatted.body,
    ...(icon ? { icon } : {}),
    silent: false,
  });

  notification.on('click', () => {
    const target = win && !win.isDestroyed() ? win : BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());
    if (target) {
      focusWindow(target);
      clearChatCompletionBadge(target);
      target.webContents.send('main-window-focus');
    }
  });

  notification.show();
  return { notified: true };
}

export function attachChatCompletionWindowFocusHandlers(win: BrowserWindow): void {
  const onFocus = (): void => {
    if (win.isDestroyed()) {
      return;
    }
    clearChatCompletionBadge(win);
    win.webContents.send('main-window-focus');
  };

  win.on('focus', onFocus);
}

/** @internal Test helper for icon wiring. */
export function __setChatCompletionNotificationIconForTests(icon: NativeImage | string | undefined): void {
  notificationIcon = icon;
}
