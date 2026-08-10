import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';

const MAX_NOTIFY_PREVIEW_WORDS = 10;

export function buildChatCompletionNotifyPreview(text: string): string {
  const normalized = text
    .replace(/[#*_`>[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) {
    return '';
  }

  const words = normalized.split(' ');
  if (words.length <= MAX_NOTIFY_PREVIEW_WORDS) {
    return normalized;
  }
  return `${words.slice(0, MAX_NOTIFY_PREVIEW_WORDS).join(' ')}…`;
}

/**
 * Ask the Electron shell to badge the dock/taskbar and show an OS notification when the
 * app window is not focused. No-op on web.
 */
export async function notifyDesktopChatCompletionIfBackground(options: {
  body: string;
  modelName?: string;
}): Promise<void> {
  if (!isAigeniusDesktopRuntime()) {
    return;
  }

  const preview = buildChatCompletionNotifyPreview(options.body);

  const notify = window.aigeniusDesktop?.notifyChatCompletion;
  if (!notify) {
    return;
  }

  try {
    await notify({
      modelName: options.modelName,
      preview,
    });
  } catch {
    /* ignore */
  }
}
