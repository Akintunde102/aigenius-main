import { attachShowWindowWhenReady, revealShowableWindow } from './show-window-when-ready';
import type { ShowableBrowserWindow } from './show-window-when-ready';

function createMockWindow(opts?: {
  loading?: boolean;
  destroyed?: boolean;
  visible?: boolean;
  showMapsWindow?: boolean;
  showImpl?: () => void;
}): {
  win: ShowableBrowserWindow;
  emit: (event: 'ready-to-show' | 'did-finish-load' | 'did-fail-load') => void;
  show: jest.Mock;
  focus: jest.Mock;
} {
  const listeners: Record<string, Array<() => void>> = {
    'ready-to-show': [],
    'did-finish-load': [],
    'did-fail-load': [],
  };
  let visible = opts?.visible === true;
  const mapsWindow = opts?.showMapsWindow !== false;
  const show = jest.fn(() => {
    opts?.showImpl?.();
    if (mapsWindow) {
      visible = true;
    }
  });
  const focus = jest.fn();
  const win: ShowableBrowserWindow = {
    isDestroyed: () => opts?.destroyed === true,
    isVisible: () => visible,
    show,
    focus,
    once(event, listener) {
      listeners[event].push(listener);
    },
    webContents: {
      isLoading: () => opts?.loading !== false,
      once(event, listener) {
        listeners[event].push(listener);
      },
    },
  };
  return {
    win,
    emit(event) {
      for (const listener of listeners[event] ?? []) {
        listener();
      }
    },
    show,
    focus,
  };
}

describe('revealShowableWindow', () => {
  it('returns false when the window is already destroyed', () => {
    const { win, show } = createMockWindow({ destroyed: true });
    expect(revealShowableWindow(win)).toBe(false);
    expect(show).not.toHaveBeenCalled();
  });

  it('swallows show() throwing so a compositor error cannot kill the process', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { win, focus } = createMockWindow({
      showImpl: () => {
        throw new Error('WidgetHost rejected');
      },
    });
    expect(revealShowableWindow(win)).toBe(false);
    expect(focus).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('attachShowWindowWhenReady', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows on did-finish-load when ready-to-show never fires (Windows overlay)', () => {
    const { win, emit, show, focus } = createMockWindow({ loading: true });
    attachShowWindowWhenReady(win);
    expect(show).not.toHaveBeenCalled();
    emit('did-finish-load');
    expect(show).toHaveBeenCalledTimes(1);
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it('does not show twice if both ready-to-show and did-finish-load fire', () => {
    const { win, emit, show } = createMockWindow({ loading: true });
    attachShowWindowWhenReady(win);
    emit('ready-to-show');
    emit('did-finish-load');
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('shows after the fallback timer when Chromium never paints', () => {
    const { win, show } = createMockWindow({ loading: true });
    attachShowWindowWhenReady(win, { fallbackMs: 1000 });
    jest.advanceTimersByTime(999);
    expect(show).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(show).toHaveBeenCalledTimes(1);
  });

  it('retries did-finish-load when an early show() did not map a window', () => {
    const { win, emit, show } = createMockWindow({ loading: true, showMapsWindow: false });
    attachShowWindowWhenReady(win, { fallbackMs: 60_000 });
    emit('ready-to-show');
    expect(show).toHaveBeenCalledTimes(1);
    emit('did-finish-load');
    expect(show).toHaveBeenCalledTimes(2);
  });
});
