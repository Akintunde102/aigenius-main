import {
  buildChatCompletionNotifyPreview,
  notifyDesktopChatCompletionIfBackground,
} from '../desktop-chat-completion-notify';

describe('desktop-chat-completion-notify', () => {
  afterEach(() => {
    delete (window as Window & { aigeniusDesktop?: unknown }).aigeniusDesktop;
    jest.restoreAllMocks();
  });

  it('normalizes and truncates previews to a short word count', () => {
    expect(buildChatCompletionNotifyPreview('  hello\n\n**world**  ')).toBe('hello world');
    const long = Array.from({ length: 20 }, (_, i) => `word${i}`).join(' ');
    expect(buildChatCompletionNotifyPreview(long).split(' ')).toHaveLength(10);
  });

  it('invokes the desktop bridge with preview and model name', async () => {
    const notifyChatCompletion = jest.fn().mockResolvedValue({ notified: true });
    (window as Window & { aigeniusDesktop?: unknown }).aigeniusDesktop = {
      isDesktop: true,
      notifyChatCompletion,
    };

    await notifyDesktopChatCompletionIfBackground({
      body: 'Your answer is ready',
      modelName: 'GPT-4',
    });

    expect(notifyChatCompletion).toHaveBeenCalledWith({
      modelName: 'GPT-4',
      preview: 'Your answer is ready',
    });
  });

  it('no-ops outside the desktop shell', async () => {
    const notifyChatCompletion = jest.fn();
    await notifyDesktopChatCompletionIfBackground({
      body: 'ignored',
      modelName: 'GPT-4',
    });
    expect(notifyChatCompletion).not.toHaveBeenCalled();
  });
});
