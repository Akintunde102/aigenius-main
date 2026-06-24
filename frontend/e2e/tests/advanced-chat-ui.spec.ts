/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';
import {
    DEFAULT_BASE_URL,
    seedAuthenticatedSession,
    stubChatShell,
    stubStreamingCompletion,
    openChat,
    sendPrompt,
    ensureChatHistorySidebarOpen,
} from './helpers/chatTestHarness';

test.describe('Advanced chat UI scenarios', () => {
    test.beforeEach(async ({ page }) => {
        await seedAuthenticatedSession(page, DEFAULT_BASE_URL);
        await stubChatShell(page);
    });

    test('markdown-bold file message renders as a file preview card', async ({ page }, testInfo) => {
        await stubStreamingCompletion(page, [
            { choices: [{ delta: { content: '**Quarterly Report.pdf:** https://example.com/files/quarterly-report.pdf' } }] },
            { usage: { prompt_tokens: 4, completion_tokens: 12, total_tokens: 16 }, cost: 0.00012 },
            '[DONE]',
        ]);

        await openChat(page);
        await sendPrompt(page, 'Send the quarterly report');

        await expect(page.getByRole('link', { name: 'Quarterly Report.pdf' })).toBeVisible({ timeout: 10000 });
        await page.screenshot({ path: testInfo.outputPath('bold-file-preview.png'), fullPage: true });
    });

    test('html anchor file message renders as a file preview card', async ({ page }, testInfo) => {
        await stubStreamingCompletion(page, [
            { choices: [{ delta: { content: "<a href='https://example.com/files/offer-letter.pdf'>Offer Letter.pdf</a>" } }] },
            { usage: { prompt_tokens: 3, completion_tokens: 9, total_tokens: 12 }, cost: 0.00008 },
            '[DONE]',
        ]);

        await openChat(page);
        await sendPrompt(page, 'Send the offer letter');

        await expect(page.getByRole('link', { name: 'Offer Letter.pdf' })).toBeVisible({ timeout: 10000 });
        await page.screenshot({ path: testInfo.outputPath('html-file-preview.png'), fullPage: true });
    });

    test('tool streaming card shows activity logs during a tool-assisted response', async ({ page }, testInfo) => {
        await stubStreamingCompletion(page, [
            { choices: [{ delta: { content: 'I am sending that now.' } }] },
            { choices: [{ delta: { tool_stream_event: { type: 'start', tool: 'gmail_send', displayName: 'Send Email' } } }] },
            { choices: [{ delta: { tool_stream_event: { type: 'log', tool: 'gmail_send', tag: 'args', message: 'Preparing email payload' } } }] },
            { choices: [{ delta: { tool_stream_event: { type: 'end', tool: 'gmail_send', displayName: 'Send Email', success: true } } }] },
            { choices: [{ delta: { content: 'Done.' } }] },
            { usage: { prompt_tokens: 6, completion_tokens: 18, total_tokens: 24 }, cost: 0.00021 },
            '[DONE]',
        ]);

        await openChat(page);
        await sendPrompt(page, 'Email the report');

        await expect(page.getByText('Send Email')).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: /Activity \(1\)/ }).click();
        await expect(page.getByText('Preparing email payload')).toBeVisible({ timeout: 5000 });
        await page.screenshot({ path: testInfo.outputPath('tool-streaming-activity.png'), fullPage: true });
    });

    test('usage details modal shows token and cost metadata', async ({ page }, testInfo) => {
        await stubStreamingCompletion(page, [
            { choices: [{ delta: { content: 'Here is the answer.' } }] },
            { usage: { prompt_tokens: 11, completion_tokens: 22, total_tokens: 33 }, cost: 0.00123 },
            '[DONE]',
        ]);

        await openChat(page);
        await sendPrompt(page, 'Give me a costed answer');

        await page.getByRole('button', { name: /Tokens: 11 prompt \+ 22 completion = 33 total/ }).click();
        await expect(page.getByText('Token Usage Details')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Prompt Tokens')).toBeVisible();
        await expect(page.getByText('Completion Tokens')).toBeVisible();
        await expect(page.getByText('Total Tokens')).toBeVisible();
        await expect(page.locator('span').filter({ hasText: '₦1.94' }).last()).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath('usage-details-modal.png'), fullPage: true });
    });

    test('create new chat clears the current transcript after a completed response', async ({ page }, testInfo) => {
        await stubStreamingCompletion(page, [
            { choices: [{ delta: { content: 'This is the first session reply.' } }] },
            { usage: { prompt_tokens: 2, completion_tokens: 7, total_tokens: 9 }, cost: 0.00007 },
            '[DONE]',
        ]);

        await openChat(page);
        await sendPrompt(page, 'Start a session');

        await expect(page.getByText('This is the first session reply.')).toBeVisible({ timeout: 10000 });
        await ensureChatHistorySidebarOpen(page);
        await page.getByText('Create New Chat').first().click();

        await expect(page.getByText('Start a conversation with the model...')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('This is the first session reply.')).toHaveCount(0);
        await page.screenshot({ path: testInfo.outputPath('create-new-chat-clears-transcript.png'), fullPage: true });
    });
});
