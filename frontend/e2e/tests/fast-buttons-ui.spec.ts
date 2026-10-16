/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';
import {
    DEFAULT_BASE_URL,
    seedAuthenticatedSession,
    stubChatShell,
} from './helpers/chatTestHarness';

const sampleButtons = {
    buttons: [
        {
            id: 'btn-1',
            label: 'List processes',
            kind: 'shell_command',
            config: { command: 'ps aux | head' },
            sortOrder: 1,
        },
        {
            id: 'btn-2',
            label: 'Open home folder',
            kind: 'agent_instruction',
            config: { instruction: 'Open my home directory using local_shell if on desktop.' },
            sortOrder: 2,
        },
    ],
};

const sampleProposals = {
    proposals: [
        {
            proposalId: 'prop-1',
            label: 'ps aux | head',
            kind: 'shell_command',
            config: { command: 'ps aux | head' },
            rationale: 'Repeated shell command (3×) in your project chats.',
        },
    ],
};

async function stubChatBootstrapExtras(page: import('@playwright/test').Page) {
    await page.route('**/gateway/*/code-projects**', (route) =>
        route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ projects: [] }) }),
    );
    await page.route('**/gateway/*/user-favorites**', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ favorites: [], hasSeededFavorites: true }),
        }),
    );
    await page.route('**/gateway/*/model-chats/**', (route) => {
        const url = route.request().url();
        if (url.includes('/resources')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    data: true,
                    dataReturned: {
                        savedChats: [],
                        savedFullChats: [],
                        pinnedChats: [],
                        chatHistory: [],
                    },
                }),
            });
        }
        if (url.includes('/models')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: [{ id: 'sao10k/llama-3b', name: 'Sao10K Llama 3B' }] }),
            });
        }
        if (url.includes('/personalities')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ data: true, dataReturned: [] }),
            });
        }
        return route.continue();
    });
}

async function openChatSeeded(page: import('@playwright/test').Page) {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.getByPlaceholder('Type...').waitFor({ state: 'visible', timeout: 45_000 });
}

async function stubFastButtonsApi(page: import('@playwright/test').Page) {
    await page.route('**/gateway/*/fast-buttons**', async (route) => {
        const url = route.request().url();
        const method = route.request().method();

        if (url.includes('/suggestions/generate') && method === 'POST') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(sampleProposals),
            });
            return;
        }
        if (url.includes('/suggestions/accept') && method === 'POST') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({ buttons: sampleButtons.buttons }),
            });
            return;
        }
        if (url.match(/\/fast-buttons\/[^/]+\/run$/) && method === 'POST') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    runId: 'run-1',
                    conversationId: '11111111-1111-4111-8111-111111111111',
                    status: 'pending_client',
                    kind: 'agent_instruction',
                    label: 'Open home folder',
                    config: sampleButtons.buttons[1].config,
                }),
            });
            return;
        }
        if (url.includes('/runs/') && method === 'PATCH') {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    run: { id: 'run-1', status: 'succeeded', summary: 'Done (stub)' },
                }),
            });
            return;
        }
        if (method === 'GET' && !url.includes('/runs/')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(sampleButtons),
            });
            return;
        }
        await route.continue();
    });
}

async function openFastButtonsModal(page: import('@playwright/test').Page) {
    const accountMenu = page.getByRole('button', { name: 'Open account menu' }).first();
    await accountMenu.waitFor({ state: 'visible', timeout: 45_000 });
    await accountMenu.click({ force: true });
    await page.getByRole('button', { name: 'Fast buttons' }).click({ force: true });
    await expect(page.getByRole('heading', { name: 'Fast buttons' })).toBeVisible({ timeout: 15_000 });
}

test.describe('Fast buttons UI', () => {
    test.use({ viewport: { width: 1440, height: 900 } });
    test.setTimeout(90_000);

    test.beforeEach(async ({ page }) => {
        await seedAuthenticatedSession(page, DEFAULT_BASE_URL);
        await stubChatShell(page);
        await stubChatBootstrapExtras(page);
        await stubFastButtonsApi(page);
    });

    test('opens modal from account menu and lists buttons', async ({ page }, testInfo) => {
        await openChatSeeded(page);
        await openFastButtonsModal(page);

        await expect(page.getByText('List processes')).toBeVisible();
        await expect(page.getByText('Open home folder')).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath('fast-buttons-grid.png'), fullPage: true });
    });

    test('suggest from project chats shows review list (no LLM — stubbed)', async ({ page }, testInfo) => {
        await openChatSeeded(page);
        await openFastButtonsModal(page);

        await page.getByRole('button', { name: 'Suggest from project chats' }).click();
        await expect(page.getByText('Review suggestions')).toBeVisible({ timeout: 10_000 });
        await expect(page.getByText('Repeated shell command')).toBeVisible();

        await page.screenshot({ path: testInfo.outputPath('fast-buttons-suggestions.png'), fullPage: true });

        await page.getByRole('button', { name: 'Add selected' }).click();
        await expect(page.getByText('List processes')).toBeVisible();
    });

    test('clicking a button shows run panel', async ({ page }, testInfo) => {
        await openChatSeeded(page);
        await openFastButtonsModal(page);

        await page.getByRole('button', { name: 'Open home folder' }).click();
        await expect(page.getByText(/starting|running|succeeded/i)).toBeVisible({ timeout: 15_000 });
        await page.screenshot({ path: testInfo.outputPath('fast-buttons-run-panel.png'), fullPage: true });
    });
});
