/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';
import {
    DEFAULT_BASE_URL,
    E2E_TOKEN,
    ensureChatHistorySidebarOpen,
    jsonResponse,
    openChat,
    seedAuthenticatedSession,
    stubChatShell,
} from './helpers/chatTestHarness';

type E2EMessage = {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
    modelId: string;
};

type E2ESession = {
    id: string;
    title: string;
    modelId: string;
    messages: E2EMessage[];
};

function buildResourcesBody(sessions: E2ESession[]) {
    return {
        data: true,
        dataReturned: {
            savedChats: [],
            savedFullChats: [],
            pinnedChats: [],
            chatHistory: sessions,
        },
    };
}

async function openTranscriptForChat(page: import('@playwright/test').Page, chatTitle: string) {
    await ensureChatHistorySidebarOpen(page);
    const row = page.getByRole('listitem').filter({ hasText: chatTitle }).first();
    await row.hover();
    await row.getByTitle('More actions').click();
    await page.getByRole('button', { name: 'Transcript', exact: true }).click();
    await expect(page.getByRole('dialog', { name: new RegExp(`Transcript: ${chatTitle}`) })).toBeVisible();
}

test.describe('Conversation transcript modal', () => {
    test.beforeEach(async ({ page }) => {
        await seedAuthenticatedSession(page, DEFAULT_BASE_URL);
    });

    test('opens preview with copy and download for inline sidebar messages', async ({ page }, testInfo) => {
        const session: E2ESession = {
            id: 'transcript-inline-1',
            title: 'Budget review',
            modelId: 'sao10k/llama-3b',
            messages: [
                {
                    id: 'm1',
                    role: 'user',
                    content: 'Summarize Q3 spend',
                    timestamp: 1,
                    modelId: 'sao10k/llama-3b',
                },
                {
                    id: 'm2',
                    role: 'assistant',
                    content: 'Q3 spend was down 12%.',
                    timestamp: 2,
                    modelId: 'sao10k/llama-3b',
                },
            ],
        };

        await stubChatShell(page, { resourcesBody: buildResourcesBody([session]) });
        await openChat(page);
        await openTranscriptForChat(page, 'Budget review');

        await expect(page.getByText('Summarize Q3 spend')).toBeVisible();
        await expect(page.getByText('Q3 spend was down 12%.')).toBeVisible();
        await expect(page.getByRole('button', { name: /^Copy$/ })).toBeEnabled();
        await expect(page.getByRole('button', { name: /^Download$/ })).toBeEnabled();

        await page.screenshot({
            path: testInfo.outputPath('transcript-modal-inline-txt.png'),
            fullPage: true,
        });

        await page.getByLabel('Format').selectOption('md');
        await expect(page.getByText('# Budget review')).toBeVisible();

        await page.screenshot({
            path: testInfo.outputPath('transcript-modal-inline-md.png'),
            fullPage: true,
        });
    });

    test('fetches messages when sidebar metadata is stripped', async ({ page }, testInfo) => {
        const session: E2ESession = {
            id: 'transcript-fetch-1',
            title: 'Lazy loaded chat',
            modelId: 'sao10k/llama-3b',
            messages: [],
        };

        await stubChatShell(page, { resourcesBody: buildResourcesBody([session]) });

        await page.route('**/gateway/*/model-chats/conversation/transcript-fetch-1', (route) =>
            route.fulfill(
                jsonResponse({
                    data: true,
                    dataReturned: {
                        id: 'transcript-fetch-1',
                        session: {
                            title: 'Lazy loaded chat',
                            modelId: 'sao10k/llama-3b',
                            messages: [
                                {
                                    role: 'user',
                                    content: 'Fetched from API',
                                    timestamp: 1,
                                    modelId: 'sao10k/llama-3b',
                                },
                                {
                                    role: 'assistant',
                                    content: 'Server body loaded.',
                                    timestamp: 2,
                                    modelId: 'sao10k/llama-3b',
                                },
                            ],
                        },
                    },
                }),
            ),
        );

        await openChat(page);
        await openTranscriptForChat(page, 'Lazy loaded chat');

        await expect(page.getByText('Fetched from API')).toBeVisible({ timeout: 15_000 });
        await expect(page.getByText('Server body loaded.')).toBeVisible();

        await page.screenshot({
            path: testInfo.outputPath('transcript-modal-fetched.png'),
            fullPage: true,
        });
    });

    test('shows empty state when only system messages exist', async ({ page }, testInfo) => {
        const session: E2ESession = {
            id: 'transcript-empty-1',
            title: 'System only',
            modelId: 'sao10k/llama-3b',
            messages: [
                {
                    id: 'sys',
                    role: 'system',
                    content: 'hidden instructions',
                    timestamp: 1,
                    modelId: 'sao10k/llama-3b',
                },
            ],
        };

        await stubChatShell(page, { resourcesBody: buildResourcesBody([session]) });
        await openChat(page);
        await openTranscriptForChat(page, 'System only');

        await expect(page.getByText(/no exportable messages/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /^Copy$/ })).toBeDisabled();
        await expect(page.getByRole('button', { name: /^Download$/ })).toBeDisabled();

        await page.screenshot({
            path: testInfo.outputPath('transcript-modal-empty.png'),
            fullPage: true,
        });
    });

    test('closes on Close button and does not switch chats', async ({ page }) => {
        const sessions: E2ESession[] = [
            {
                id: 'transcript-close-a',
                title: 'Chat A',
                modelId: 'sao10k/llama-3b',
                messages: [{ id: 'a1', role: 'user', content: 'A message', timestamp: 1, modelId: 'sao10k/llama-3b' }],
            },
            {
                id: 'transcript-close-b',
                title: 'Chat B',
                modelId: 'sao10k/llama-3b',
                messages: [{ id: 'b1', role: 'user', content: 'B message', timestamp: 1, modelId: 'sao10k/llama-3b' }],
            },
        ];

        await stubChatShell(page, { resourcesBody: buildResourcesBody(sessions) });
        await openChat(page);
        await openTranscriptForChat(page, 'Chat A');

        await page.getByRole('button', { name: 'Close' }).click();
        await expect(page.getByRole('dialog')).not.toBeVisible();
        await expect(page.getByText('A message')).not.toBeVisible();
    });

    test('shows load error when conversation fetch fails', async ({ page }, testInfo) => {
        const session: E2ESession = {
            id: 'transcript-error-1',
            title: 'Broken fetch',
            modelId: 'sao10k/llama-3b',
            messages: [],
        };

        await stubChatShell(page, { resourcesBody: buildResourcesBody([session]) });
        await page.route('**/gateway/*/model-chats/conversation/transcript-error-1', (route) =>
            route.abort('failed'),
        );

        await openChat(page);
        await openTranscriptForChat(page, 'Broken fetch');

        await expect(page.getByRole('alert')).toBeVisible({ timeout: 15_000 });
        await page.screenshot({
            path: testInfo.outputPath('transcript-modal-error.png'),
            fullPage: true,
        });
    });
});
