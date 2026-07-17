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
  __ollamaToolCalls: DesktopToolPayload[];
  aigeniusDesktop: {
    isDesktop: true;
    runLocalDesktopTool: (
      payload: DesktopToolPayload,
      options?: DesktopToolOptions,
    ) => Promise<{ ok: true; result: string }>;
  };
};

test.describe('Desktop Ollama bridge', () => {
  test('routes an offline Ollama chat from the desktop bridge back into the transcript', async ({ page }) => {
    await seedAuthenticatedSession(page);
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => false,
      });

      const desktopWindow = window as unknown as DesktopWindow;
      desktopWindow.__ollamaToolCalls = [];
      desktopWindow.aigeniusDesktop = {
        isDesktop: true,
        runLocalDesktopTool: async (payload, options) => {
          desktopWindow.__ollamaToolCalls.push(payload);
          options?.onShellStreamChunk?.({
            stream: 'stdout',
            text: '{"message":{"content":"Desktop Ollama "}}\n',
          });
          options?.onShellStreamChunk?.({
            stream: 'stdout',
            text: '{"message":{"content":"says hello."}}\n',
          });
          return { ok: true, result: 'Desktop Ollama says hello.' };
        },
      };
    });

    await stubChatShell(page, {
      modelsBody: {
        data: [{ id: 'ollama:llama3', name: 'Ollama Llama 3' }],
      },
    });

    await page.route('**/openai/v1/chat/completions**', async (route) => {
      throw new Error(`Unexpected network chat request: ${route.request().url()}`);
    });

    await openChat(page);
    await sendPrompt(page, 'Use local Ollama');

    await expect(page.getByText('Desktop Ollama says hello.')).toBeVisible();

    const chatToolCalls = await page.evaluate(() =>
      (window as unknown as DesktopWindow).__ollamaToolCalls.filter(
        (call) => call.tool === 'local_ollama_chat',
      ),
    );
    expect(chatToolCalls).toEqual([
      {
        tool: 'local_ollama_chat',
        arguments: {
          payload: {
            model: 'llama3',
            messages: [{ role: 'user', content: 'Use local Ollama' }],
            stream: true,
          },
        },
      },
    ]);
  });
});
