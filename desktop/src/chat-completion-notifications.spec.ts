import {
  AIGENIUS_NOTIFICATION_BRAND,
  clearChatCompletionBadge,
  formatChatCompletionNotification,
  getUnreadChatCompletionCount,
  isAppWindowFocused,
  notifyChatCompletionIfBackground,
  shortenModelLabel,
  truncateNotificationPreview,
} from './chat-completion-notifications';

const mockSetBadgeCount = jest.fn();
const mockSetAppUserModelId = jest.fn();
const mockSetName = jest.fn();
const mockDockSetBadge = jest.fn();
const mockNotificationShow = jest.fn();
const mockFlashFrame = jest.fn();

jest.mock('electron', () => {
  const focusedWindow: { current: null | { isDestroyed: () => boolean; flashFrame: typeof mockFlashFrame } } = {
    current: null,
  };
  const notificationCtor = jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    show: mockNotificationShow,
  }));

  return {
    app: {
      setName: (...args: unknown[]) => mockSetName(...args),
      setAppUserModelId: (...args: unknown[]) => mockSetAppUserModelId(...args),
      setBadgeCount: (...args: unknown[]) => mockSetBadgeCount(...args),
      dock: {
        setBadge: (...args: unknown[]) => mockDockSetBadge(...args),
      },
    },
    BrowserWindow: {
      getFocusedWindow: () => focusedWindow.current,
      fromWebContents: () => ({
        isDestroyed: () => false,
        isMinimized: () => false,
        restore: jest.fn(),
        show: jest.fn(),
        focus: jest.fn(),
        flashFrame: mockFlashFrame,
        webContents: { send: jest.fn() },
      }),
      getAllWindows: () => [],
      __setFocusedWindow: (win: typeof focusedWindow.current) => {
        focusedWindow.current = win;
      },
    },
    Notification: Object.assign(notificationCtor, { isSupported: () => true }),
    __notificationCtor: notificationCtor,
  };
});

const electron = jest.requireMock('electron') as {
  BrowserWindow: {
    __setFocusedWindow: (win: null | { isDestroyed: () => boolean; flashFrame: typeof mockFlashFrame }) => void;
  };
  __notificationCtor: jest.Mock;
};

describe('chat-completion-notifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearChatCompletionBadge();
    electron.BrowserWindow.__setFocusedWindow(null);
    Object.defineProperty(process, 'platform', { value: 'win32' });
  });

  it('does not notify when an app window is focused', () => {
    electron.BrowserWindow.__setFocusedWindow({
      isDestroyed: () => false,
      flashFrame: mockFlashFrame,
    });

    const result = notifyChatCompletionIfBackground({} as Electron.WebContents, {
      preview: 'Hello there',
    });

    expect(result).toEqual({ notified: false });
    expect(mockNotificationShow).not.toHaveBeenCalled();
    expect(getUnreadChatCompletionCount()).toBe(0);
  });

  it('shows a branded notification with a short preview when app is unfocused', () => {
    const sender = {} as Electron.WebContents;

    const result = notifyChatCompletionIfBackground(sender, {
      modelName: 'anthropic/claude-sonnet-4',
      preview: 'Here is your answer with enough words to be trimmed later on purpose',
    });

    expect(result).toEqual({ notified: true });
    expect(getUnreadChatCompletionCount()).toBe(1);
    expect(mockSetBadgeCount).toHaveBeenCalledWith(1);
    expect(mockNotificationShow).toHaveBeenCalledTimes(1);
    expect(electron.__notificationCtor).toHaveBeenCalledWith(
      expect.objectContaining({
        title: AIGENIUS_NOTIFICATION_BRAND,
        subtitle: 'Reply ready · claude sonnet 4',
        body: 'Here is your answer with enough words to be trimmed…',
      }),
    );
  });

  it('clears badge count on focus', () => {
    notifyChatCompletionIfBackground({} as Electron.WebContents, { preview: 'Done' });
    clearChatCompletionBadge();
    expect(getUnreadChatCompletionCount()).toBe(0);
    expect(mockSetBadgeCount).toHaveBeenLastCalledWith(0);
  });

  it('truncates previews by word count', () => {
    const long = Array.from({ length: 20 }, (_, i) => `word${i}`).join(' ');
    expect(truncateNotificationPreview(long).split(' ')).toHaveLength(10);
    expect(truncateNotificationPreview(long).endsWith('…')).toBe(true);
  });

  it('formats a fallback body when preview is empty', () => {
    expect(formatChatCompletionNotification('gpt-4o', '')).toEqual({
      title: AIGENIUS_NOTIFICATION_BRAND,
      subtitle: 'Reply ready · gpt 4o',
      body: 'gpt 4o finished. Tap to open.',
    });
  });

  it('shortens provider-prefixed model names', () => {
    expect(shortenModelLabel('openai/gpt-4.1-mini')).toBe('gpt 4.1 mini');
  });

  it('reports focused state from BrowserWindow.getFocusedWindow', () => {
    expect(isAppWindowFocused()).toBe(false);
    electron.BrowserWindow.__setFocusedWindow({
      isDestroyed: () => false,
      flashFrame: mockFlashFrame,
    });
    expect(isAppWindowFocused()).toBe(true);
  });
});
