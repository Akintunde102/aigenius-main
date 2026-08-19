import { expect, test } from '@playwright/test';
import {
  openChat,
  seedAuthenticatedSession,
  sendPrompt,
  stubChatShell,
} from './helpers/chatTestHarness';

type DesktopToolPayload = {
  tool: string;
  arguments: {
    payload: {
      model: string;
      messages: Array<{ role: string; content: string }>;
      stream: boolean;
    };
  };
};

type DesktopToolOptions = {
  onShellStreamChunk?: (chunk: { stream: 'stdout' | 'stderr'; text: string }) => void;
};

type DesktopWindow = Omit<Window, 'aigeniusDesktop'> & {
  __desktopToolCalls: DesktopToolPayload[];
  aigeniusDesktop: {
    isDesktop: true;
    runLocalDesktopTool: (
      payload: DesktopToolPayload,
      options?: DesktopToolOptions,
    ) => Promise<{ ok: true; result: string }>;
  };
};

test.describe('Desktop Ollama Cloud online', () => {
  test('chats an Ollama Cloud catalog model through the local desktop tool', async ({ page }) => {
    await seedAuthenticatedSession(page);
    await page.addInitScript(() => {
      const desktopWindow = window as unknown as DesktopWindow;
      desktopWindow.__desktopToolCalls = [];
      desktopWindow.aigeniusDesktop = {
        isDesktop: true,
        runLocalDesktopTool: async (payload, options) => {
          desktopWindow.__desktopToolCalls.push(payload);
          options?.onShellStreamChunk?.({
            stream: 'stdout',
            text: '{"message":{"content":"Cloud path OK"}}\n',
          });
          return { ok: true, result: 'Cloud path OK' };
        },
      };
    });

    await stubChatShell(page, {
      modelsBody: {
        data: [{ id: 'ollama:glm-5.1:cloud', name: 'Ollama Cloud: GLM-5.1' }],
      },
    });

    await page.route('**/openai/v1/chat/completions**', async (route) => {
      throw new Error(`Unexpected network chat request: ${route.request().url()}`);
    });

    await openChat(page);
    await sendPrompt(page, 'Hello cloud');

    await expect(page.getByText('Cloud path OK')).toBeVisible({ timeout: 30_000 });

    const toolCalls = await page.evaluate(() => (window as unknown as DesktopWindow).__desktopToolCalls);
    expect(toolCalls[0]).toEqual({
      tool: 'local_ollama_chat',
      arguments: {
        payload: {
          model: 'glm-5.1:cloud',
          messages: [{ role: 'user', content: 'Hello cloud' }],
          stream: true,
        },
      },
    });
  });
});
