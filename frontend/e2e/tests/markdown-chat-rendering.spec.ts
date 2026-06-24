/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';
import {
    DEFAULT_BASE_URL,
    seedAuthenticatedSession,
    stubChatShell,
    stubStreamingCompletion,
    openChat,
    sendPrompt,
} from './helpers/chatTestHarness';

/**
 * Browser E2E: real react-markdown + remark-gfm + rehype-highlight in chat bubbles.
 * Content must be multiline (or otherwise not match single-line file-preview heuristics).
 */
test.describe('Chat markdown rendering (browser)', () => {
    test.beforeEach(async ({ page }) => {
        await seedAuthenticatedSession(page, DEFAULT_BASE_URL);
        await stubChatShell(page);
    });

    test('streams GFM markdown: headings, emphasis, table, and fenced code with highlighting', async ({
        page,
    }, testInfo) => {
        const md = [
            '## Section title',
            '',
            '**Bold** and *italic*.',
            '',
            '| ColA | ColB |',
            '| --- | --- |',
            '| v1 | v2 |',
            '',
            '```javascript',
            'const answer = 42;',
            '```',
            '',
        ].join('\n');

        await stubStreamingCompletion(page, [
            { choices: [{ delta: { content: md } }] },
            { usage: { prompt_tokens: 2, completion_tokens: 40, total_tokens: 42 }, cost: 0.0001 },
            '[DONE]',
        ]);

        await openChat(page);
        if (page.url().includes('/login')) {
            test.skip(true, 'App redirected to login; authenticated shell required.');
        }

        await sendPrompt(page, 'Render markdown sample');

        const body = page.locator('.markdown-body').last();
        await expect(body.locator('h2')).toHaveText('Section title', { timeout: 15_000 });
        await expect(body.locator('strong')).toHaveText('Bold');
        await expect(body.locator('em')).toHaveText('italic');
        await expect(body.locator('th').filter({ hasText: 'ColA' })).toBeVisible();
        await expect(body.locator('td').filter({ hasText: 'v1' })).toBeVisible();

        const code = body.locator('pre code').first();
        await expect(code).toBeVisible();
        await expect(code).toContainText('const answer = 42;');
        const cls = await code.getAttribute('class');
        expect(cls).toMatch(/hljs|language-javascript|language-js/);

        await page.screenshot({ path: testInfo.outputPath('markdown-gfm-stream.png'), fullPage: true });
    });

    test('incremental stream completes partial emphasis without crashing', async ({ page }) => {
        await stubStreamingCompletion(page, [
            { choices: [{ delta: { content: '## A\n\n**hel' } }] },
            { choices: [{ delta: { content: 'lo**' } }] },
            { usage: { prompt_tokens: 1, completion_tokens: 5, total_tokens: 6 }, cost: 0.00001 },
            '[DONE]',
        ]);

        await openChat(page);
        if (page.url().includes('/login')) {
            test.skip(true, 'App redirected to login; authenticated shell required.');
        }

        await sendPrompt(page, 'Stream partial markdown');

        const body = page.locator('.markdown-body').last();
        await expect(body.locator('h2')).toHaveText('A', { timeout: 15_000 });
        await expect(body.locator('strong')).toHaveText('hello');
    });

    test('GFM strikethrough and task list render in assistant message', async ({ page }) => {
        const md = ['Line one', '', '- [x] Done item', '- [ ] Todo item', '', '~~removed~~', ''].join('\n');

        await stubStreamingCompletion(page, [
            { choices: [{ delta: { content: md } }] },
            { usage: { prompt_tokens: 1, completion_tokens: 20, total_tokens: 21 }, cost: 0.00005 },
            '[DONE]',
        ]);

        await openChat(page);
        if (page.url().includes('/login')) {
            test.skip(true, 'App redirected to login; authenticated shell required.');
        }

        await sendPrompt(page, 'GFM extras');

        const body = page.locator('.markdown-body').last();
        await expect(body.getByText('Line one')).toBeVisible({ timeout: 15_000 });
        const checks = body.locator('input[type="checkbox"]');
        await expect(checks).toHaveCount(2);
        await expect(body.locator('del, s').filter({ hasText: 'removed' })).toBeVisible();
    });
});
