/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';

test.describe('Chat response locking', () => {
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

    async function stubAuthenticatedShell(page: import('@playwright/test').Page) {
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
            }),
        );

        await page.route('**/model-chats/resources**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(emptyResources),
            }),
        );

        await page.route('**/model-chats/models**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(minimalModels),
            }),
        );

        await page.route('**/conversation-events**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'text/event-stream',
                body: '',
            }),
        );

        await page.route('**/model-chats/personalities**', (route) =>
            route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: true, dataReturned: [] }),
            }),
        );
    }

    test('composer stays locked while a response request is still in flight', async ({ page }, testInfo) => {
        await stubAuthenticatedShell(page);

        const releaseCompletionRef: { current: (() => void) | null } = { current: null };
        const completionStarted = new Promise<void>((resolve) => {
            releaseCompletionRef.current = () => {
                resolve();
            };
        });

        await page.route('**/openai/v1/chat/completions**', async (route) => {
            await completionStarted;
            await route.fulfill({
                status: 200,
                headers: {
                    'Content-Type': 'text/event-stream',
                    'X-Conversation-Id': 'e2e-test-uuid-123',
                },
                body: 'data: [DONE]\n\n',
            });
        });

        await page.goto('/', { waitUntil: 'domcontentloaded' });
        if (page.url().includes('/login')) {
            test.skip(true, 'App redirected to login; authenticated shell is required for composer lock test.');
        }

        const input = page.getByPlaceholder('Type...');
        await expect(input).toBeVisible({ timeout: 15000 });

        await input.fill('Lock the composer');
        await page.getByRole('button', { name: 'Send message' }).click();

        await expect(input).toBeDisabled({ timeout: 5000 });
        await expect(page.getByRole('button', { name: 'Send message' })).toBeDisabled();
        await page.screenshot({ path: testInfo.outputPath('composer-locked.png'), fullPage: true });

        releaseCompletionRef.current?.();

        await expect(input).toBeEnabled({ timeout: 10000 });
    });
});
