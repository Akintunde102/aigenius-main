/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';
import { E2E_TOKEN, ensureChatHistorySidebarOpen, seedChatHistoryStore } from './helpers/chatTestHarness';

/**
 * Conversation save UI: "Create New Chat" and first message send.
 * Verifies that the UI sends no conversationId for a new chat (so the backend creates one).
 *
 * Run with frontend up: yarn dev (http://localhost:3001).
 * Auth: the app redirects to /login when not logged in. To run these tests you must either:
 * - Use a real JWT: goto('/?token=YOUR_JWT') and stub auth/_/connection_token to return { token },
 * - Or run with a Playwright storageState that has nobox_client_token / nobox_token in localStorage.
 * This spec seeds localStorage and reloads; if the app still shows login, tests are skipped.
 */
test.describe('Conversation save UI', () => {
    const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';
    const emptyResources = {
        data: true,
        dataReturned: {
            savedChats: [],
            savedFullChats: [],
            pinnedChats: [],
            chatHistory: [],
        },
    };

    const minimalModels = {
        data: [{ id: 'sao10k/llama-3b', name: 'Sao10K Llama 3B' }],
    };

    const loggedUserDetails = {
        data: true,
        dataReturned: {
            id: 'e2e-user-id',
            email: 'e2e@example.com',
            firstName: 'E2E',
            lastName: 'User',
            config: { wallet: 1000, integrations: {} },
            gmailConnected: false,
        },
    };

    const E2E_TOKEN = 'e2e-fake-token';

    async function stubAuthAndResources(page: import('@playwright/test').Page) {
        await page.context().addCookies([
            { name: 'nobox_client_token', value: E2E_TOKEN, url: BASE_URL },
            { name: 'nobox_token', value: E2E_TOKEN, url: BASE_URL },
        ]);
        await page.addInitScript((token: string) => {
            localStorage.setItem('nobox_client_token', token);
            localStorage.setItem('nobox_token', token);
            localStorage.setItem('logged_user_details', JSON.stringify({
                id: 'e2e-user-id',
                email: 'e2e@example.com',
                firstName: 'E2E',
                lastName: 'User',
                config: { wallet: 1000, integrations: {} },
                gmailConnected: false,
            }));
        }, E2E_TOKEN);
        await page.route('**/gateway/*/logged-user-details**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(loggedUserDetails),
            })
        );
        await page.route('**/auth/_/connection_token', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ token: E2E_TOKEN }),
            })
        );
        await page.route('**/auth/_/refresh', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ token: E2E_TOKEN }),
            })
        );
        await page.route('**/model-chats/resources**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(emptyResources),
            })
        );
        await page.route('**/model-chats/models**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(minimalModels),
            })
        );
        await page.route('**/conversation-events**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'text/event-stream',
                body: '',
            })
        );
        await page.route('**/model-chats/personalities**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: true, dataReturned: [] }),
            })
        );
        await page.route('**/gateway/*/admin/status**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: true, dataReturned: { isMaster: false } }),
            })
        );
    }

    test('Create New Chat and chat input are visible', async ({ page }, testInfo) => {
        await stubAuthAndResources(page);

        await page.goto(`/?token=${E2E_TOKEN}`, { waitUntil: 'domcontentloaded' });
        if (page.url().includes('/login')) {
            test.skip(true, 'App redirected to login; run with auth (token in URL or storageState) to test chat UI');
        }
        await ensureChatHistorySidebarOpen(page);
        await expect(page.getByText('Create New Chat').first()).toBeVisible({ timeout: 15000 });
        await expect(page.getByPlaceholder('Type...')).toBeVisible({ timeout: 5000 });
        await page.screenshot({ path: testInfo.outputPath('conversation-ui-visible.png'), fullPage: true });
    });

    test('sending first message calls completions without conversationId', async ({ page }, testInfo) => {
        await stubAuthAndResources(page);

        let completionsBody: string | null = null;
        await page.route('**/openai/v1/chat/completions**', async (route) => {
            if (route.request().method() === 'POST') {
                completionsBody = route.request().postData();
            }
            await route.fulfill({
                status: 200,
                headers: {
                    'Content-Type': 'text/event-stream',
                    'X-Conversation-Id': 'e2e-test-uuid-123',
                },
                body: 'data: [DONE]\n\n',
            });
        });

        await page.goto(`/?token=${E2E_TOKEN}`, { waitUntil: 'domcontentloaded' });
        if (page.url().includes('/login')) {
            test.skip(true, 'App redirected to login; run with auth to test conversation save UI');
        }
        await ensureChatHistorySidebarOpen(page);
        await expect(page.getByText('Create New Chat').first()).toBeVisible({ timeout: 15000 });

        // Start new chat (sidebar control is a div with "Create New Chat" text)
        await page.getByText('Create New Chat').first().click();

        const input = page.getByPlaceholder('Type...');
        await input.fill('E2E new chat message');
        await page.getByRole('button', { name: 'Send message' }).click();

        await expect.poll(() => completionsBody, { timeout: 10_000 }).not.toBeNull();
        const parsed = JSON.parse(completionsBody!);
        // New chat: must not send conversationId (or send null); backend will create UUID
        expect(parsed.conversationId == null).toBe(true);
        await page.screenshot({ path: testInfo.outputPath('conversation-send-no-id.png'), fullPage: true });
    });

    test('Create New Chat leaves the user on a fresh draft instead of reopening the previous conversation', async ({ page }, testInfo) => {
        await stubAuthAndResources(page);

        await page.route('**/model-chats/resources**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    data: true,
                    dataReturned: {
                        savedChats: [],
                        savedFullChats: [],
                        pinnedChats: [],
                        chatHistory: [
                            {
                                id: 'existing-conversation',
                                title: 'Existing Conversation',
                                modelId: 'sao10k/llama-3b',
                                messages: [
                                    {
                                        id: 'user-1',
                                        role: 'user',
                                        content: 'Existing prompt',
                                        timestamp: 1,
                                        modelId: 'sao10k/llama-3b',
                                    },
                                    {
                                        id: 'assistant-1',
                                        role: 'assistant',
                                        content: 'Existing response',
                                        timestamp: 2,
                                        modelId: 'sao10k/llama-3b',
                                    },
                                ],
                            },
                        ],
                    },
                }),
            })
        );

        await page.goto(`/?token=${E2E_TOKEN}`, { waitUntil: 'load' });
        if (page.url().includes('/login')) {
            test.skip(true, 'App redirected to login; run with auth to test draft chat flow');
        }

        await seedChatHistoryStore(page, [
            {
                id: 'existing-conversation',
                title: 'Existing Conversation',
                modelId: 'sao10k/llama-3b',
                messages: [
                    {
                        id: 'user-1',
                        role: 'user',
                        content: 'Existing prompt',
                        timestamp: 1,
                        modelId: 'sao10k/llama-3b',
                    },
                    {
                        id: 'assistant-1',
                        role: 'assistant',
                        content: 'Existing response',
                        timestamp: 2,
                        modelId: 'sao10k/llama-3b',
                    },
                ],
            },
        ]);
        await page.goto(page.url(), { waitUntil: 'load' });

        await ensureChatHistorySidebarOpen(page);
        await expect(page.getByText('Existing Conversation').first()).toBeVisible({ timeout: 15000 });
        await page.getByText('Existing Conversation').first().click();
        await expect(page).toHaveURL(/\/chat\/existing-conversation$/);
        await expect(page.getByText('Existing response').first()).toBeVisible({ timeout: 5000 });

        await page.getByText('Create New Chat').first().click();

        await expect(page).toHaveURL(/\/$/);
        await expect(page.getByText('Start a conversation with the model...')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Existing response')).toHaveCount(0);
        await page.screenshot({ path: testInfo.outputPath('create-new-chat-stays-draft.png'), fullPage: true });
    });
});
