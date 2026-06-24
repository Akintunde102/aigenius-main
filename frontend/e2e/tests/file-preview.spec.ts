/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';

/**
 * File preview in chat: messages with "fileName: https://..." (or "**fileName:** https://...")
 * must render as a file preview card (extension badge + link), not as plain text.
 *
 * This test stubs a chat completion that returns a file-style message,
 * then asserts the file preview is visible in the active chat.
 */
test.describe('File message preview in chat', () => {
    const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';
    const E2E_TOKEN = 'e2e-fake-token';
    const fileMessageContent = 'Cover Letter.pdf: https://res.cloudinary.com/example/raw/upload/doc.pdf';
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

    test('chat shows file preview card for file message (not plain link)', async ({ page }, testInfo) => {
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

        await page.route('**/openai/v1/chat/completions**', async (route) => {
            await route.fulfill({
                status: 200,
                headers: {
                    'Content-Type': 'text/event-stream',
                    'X-Conversation-Id': 'file-preview-e2e-conversation',
                },
                body: [
                    `data: ${JSON.stringify({ choices: [{ delta: { content: fileMessageContent } }] })}`,
                    `data: ${JSON.stringify({ usage: { prompt_tokens: 1, completion_tokens: 8, total_tokens: 9 }, cost: 0.0001 })}`,
                    'data: [DONE]',
                    '',
                ].join('\n'),
            });
        });

        await page.goto('/', { waitUntil: 'domcontentloaded' });

        const input = page.getByPlaceholder('Type...');
        await expect(input).toBeVisible({ timeout: 10000 });
        await input.fill('Send me the generated file');
        await page.getByRole('button', { name: 'Send message' }).click();

        // File preview: FileMessage card shows extension badge (PDF) and clickable filename
        const fileLink = page.getByRole('link', { name: /Cover Letter\.pdf/i });
        const pdfBadge = page.getByText('PDF').first();
        await expect(fileLink).toBeVisible({ timeout: 10000 });
        await expect(pdfBadge).toBeVisible({ timeout: 5000 });
        await page.screenshot({ path: testInfo.outputPath('file-preview-card.png'), fullPage: true });
    });
});
