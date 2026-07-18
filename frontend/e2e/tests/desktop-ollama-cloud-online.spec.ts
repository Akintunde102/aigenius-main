import { expect, test } from '@playwright/test';
import {
  openChat,
  seedAuthenticatedSession,
  sendPrompt,
  stubChatShell,
} from './helpers/chatTestHarness';

type DesktopToolCall = {
  tool: string;
  arguments: Record<string, unknown>;
};

type DesktopWindow = Omit<Window, 'aigeniusDesktop'> & {
  __desktopToolCalls: DesktopToolCall[];
  __chatRequests: number;
  aigeniusDesktop: {
    isDesktop: true;
    runLocalDesktopTool: (payload: DesktopToolCall) => Promise<{ ok: true; result: string }>;
  };
};

test.describe('Desktop Ollama Cloud online', () => {
  test('connects the relay before gateway chat for a cloud catalog model', async ({ page }) => {
    await seedAuthenticatedSession(page);
    await page.addInitScript(() => {
      const desktopWindow = window as unknown as DesktopWindow;
      desktopWindow.__desktopToolCalls = [];
      desktopWindow.__chatRequests = 0;
      desktopWindow.aigeniusDesktop = {
        isDesktop: true,
        runLocalDesktopTool: async (payload) => {
          desktopWindow.__desktopToolCalls.push(payload);
          return { ok: true, result: 'relay-connected' };
        },
      };
    });

    await stubChatShell(page, {
      modelsBody: {
        data: [{ id: 'ollama:glm-5.1:cloud', name: 'Ollama Cloud: GLM-5.1' }],
      },
    });

    let chatRequestCount = 0;
    await page.route('**/openai/v1/chat/completions**', async (route) => {
      chatRequestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        headers: { 'X-Conversation-Id': 'conv-ollama-cloud-live-e2e' },
        body: [
          'data: {"choices":[{"delta":{"content":"Cloud path OK"}}]}\n\n',
          'data: [DONE]\n\n',
        ].join(''),
      });
    });

    await openChat(page);
    await sendPrompt(page, 'Hello cloud');

    await expect(page.getByText('Cloud path OK')).toBeVisible({ timeout: 30_000 });

    const toolCalls = await page.evaluate(() => (window as unknown as DesktopWindow).__desktopToolCalls);
    expect(toolCalls[0]).toEqual({
      tool: 'local_ollama_connect',
      arguments: { token: expect.any(String) },
    });
    expect(chatRequestCount).toBeGreaterThan(0);
  });
});
