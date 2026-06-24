/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';
import {
    DEFAULT_BASE_URL,
    seedAuthenticatedSession,
    stubChatShell,
    openChat,
    ensureChatHistorySidebarOpen,
} from './helpers/chatTestHarness';

/**
 * Full-page screenshots of the chat shell with history sidebar open across Playwright device projects
 * (desktop + two mobile Chromium profiles). Artifacts: test-results/.../chat-sidebar-<project>.png
 *
 * Run: CI=1 npx playwright test e2e/tests/chat-history-sidebar-devices.spec.ts
 * (CI starts dev:e2e on :3001 per webServer config.)
 */
test.describe('Chat history sidebar — device snapshots', () => {
    test.beforeEach(async ({ page }) => {
        await seedAuthenticatedSession(page, DEFAULT_BASE_URL);
        await stubChatShell(page);
    });

    test('chat shell with sidebar open (full-page screenshot)', async ({ page }, testInfo) => {
        await openChat(page);
        await ensureChatHistorySidebarOpen(page);

        await expect(page.getByText('Create New Chat').first()).toBeVisible({ timeout: 15_000 });

        await page.screenshot({
            path: testInfo.outputPath(`chat-sidebar-${testInfo.project.name}.png`),
            fullPage: true,
        });
    });
});
