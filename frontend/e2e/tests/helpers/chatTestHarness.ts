import type { Page, Route } from '@playwright/test';

/**
 * Stubbed tests need no credits. For Playwright against a real API, set E2E_WALLET_BYPASS_SECRET (backend)
 * and NEXT_PUBLIC_E2E_WALLET_BYPASS_SECRET (frontend) to the same value — the app sends X-E2E-Wallet-Bypass
 * when NODE_ENV is `test` (Jest) or when the dev server runs with E2E_WALLET_BYPASS_TEST_CLIENT=1 (browser E2E).
 * Normal `yarn dev` keeps NODE_ENV=development in the bundle — bypass stays off.
 */

export const DEFAULT_BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001';
export const E2E_TOKEN = 'e2e-fake-token';
export const TEST_MODEL_ID = 'sao10k/llama-3b';
export const TEST_MODEL_NAME = 'Sao10K Llama 3B';

export const defaultLoggedUserDetails = {
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

export const defaultModelsResponse = {
    data: [{ id: TEST_MODEL_ID, name: TEST_MODEL_NAME }],
};

export const emptyResourcesResponse = {
    data: true,
    dataReturned: {
        savedChats: [],
        savedFullChats: [],
        pinnedChats: [],
        chatHistory: [],
    },
};

type StubOptions = {
    baseUrl?: string;
    resourcesBody?: unknown;
    modelsBody?: unknown;
    personalitiesBody?: unknown;
    loggedUserBody?: unknown;
};

export async function seedAuthenticatedSession(page: Page, baseUrl = DEFAULT_BASE_URL) {
    await page.context().addCookies([
        { name: 'nobox_client_token', value: E2E_TOKEN, url: baseUrl },
        { name: 'nobox_token', value: E2E_TOKEN, url: baseUrl },
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
}

export async function stubChatShell(page: Page, options: StubOptions = {}) {
    const {
        resourcesBody = emptyResourcesResponse,
        modelsBody = defaultModelsResponse,
        personalitiesBody = { data: true, dataReturned: [] },
        loggedUserBody = defaultLoggedUserDetails,
    } = options;

    await page.route('**/gateway/*/logged-user-details**', (route) =>
        route.fulfill(jsonResponse(loggedUserBody)),
    );

    await page.route('**/auth/_/connection_token', (route) =>
        route.fulfill(jsonResponse({ token: E2E_TOKEN })),
    );

    await page.route('**/auth/_/refresh', (route) =>
        route.fulfill(jsonResponse({ token: E2E_TOKEN })),
    );

    await page.route('**/model-chats/resources**', (route) =>
        route.fulfill(jsonResponse(resourcesBody)),
    );

    await page.route('**/model-chats/models**', (route) =>
        route.fulfill(jsonResponse(modelsBody)),
    );

    await page.route('**/model-chats/personalities**', (route) =>
        route.fulfill(jsonResponse(personalitiesBody)),
    );

    await page.route('**/gateway/*/admin/status**', (route) =>
        route.fulfill(jsonResponse({ data: true, dataReturned: { isMaster: false } })),
    );

    await page.route('**/conversation-events**', (route) =>
        route.fulfill({
            status: 200,
            contentType: 'text/event-stream',
            body: '',
        }),
    );
}

export function jsonResponse(body: unknown) {
    return {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
    };
}

type StreamChunk =
    | '[DONE]'
    | Record<string, unknown>;

export async function stubStreamingCompletion(page: Page, chunks: StreamChunk[], extraHeaders?: Record<string, string>) {
    await page.route('**/openai/v1/chat/completions**', async (route: Route) => {
        const body = chunks
            .map((chunk) => chunk === '[DONE]' ? 'data: [DONE]' : `data: ${JSON.stringify(chunk)}`)
            .concat('')
            .join('\n');

        await route.fulfill({
            status: 200,
            headers: {
                'Content-Type': 'text/event-stream',
                'X-Conversation-Id': 'e2e-stream-conversation-id',
                ...(extraHeaders || {}),
            },
            body,
        });
    });
}

/** Chat shell ready when the composer is interactive (avoids slow networkidle). */
export async function waitForChatComposerReady(page: Page) {
    await page.getByPlaceholder('Type...').waitFor({ state: 'visible', timeout: 20_000 });
}

/**
 * On desktop the chat history rail is closed by default; open it when a test needs
 * "Create New Chat" or conversation titles. No-op when the rail is already open.
 */
export async function ensureChatHistorySidebarOpen(page: Page) {
    const createNew = page.getByText('Create New Chat').first();
    if (await createNew.isVisible().catch(() => false)) {
        return;
    }
    await page.getByRole('button', { name: 'Open sidebar' }).click();
    await createNew.waitFor({ state: 'visible', timeout: 15_000 });
}

export async function openChat(page: Page) {
    await page.goto(`/?token=${E2E_TOKEN}`, { waitUntil: 'domcontentloaded' });
    await waitForChatComposerReady(page);
}

export async function sendPrompt(page: Page, prompt: string) {
    const input = page.getByPlaceholder('Type...');
    await input.fill(prompt);
    await page.getByRole('button', { name: /Send message/ }).click();
}

/**
 * Stub authenticated GET for model-chats agent-run by id (workflow-intent transcript expand).
 * Fulfill with a raw JSON body (Nest returns the row directly; the client reads `response.data`).
 */
export async function stubAgentRunGet(
    page: Page,
    runId: string,
    body: Record<string, unknown> | 'network-error',
) {
    await page.route(`**/model-chats/agent-run/${runId}`, async (route) => {
        if (body === 'network-error') {
            await route.abort('failed');
            return;
        }
        await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(body),
        });
    });
}

export async function stubAgentRunGetNotFound(page: Page, runId: string) {
    await page.route(`**/model-chats/agent-run/${runId}`, async (route) => {
        await route.fulfill({
            status: 404,
            contentType: 'application/json',
            body: JSON.stringify({
                statusCode: 404,
                message: 'Agent run not found',
                error: 'Not Found',
            }),
        });
    });
}

export async function seedChatHistoryStore(page: Page, sessions: unknown[]) {
    await page.evaluate(async (seedSessions) => {
        const request = indexedDB.open('ChatStorageDB', 3);

        await new Promise<void>((resolve, reject) => {
            request.onupgradeneeded = () => {
                const db = request.result;
                for (const storeName of ['savedChats', 'savedFullChats', 'chatHistory', 'pinnedChats', 'lastSync']) {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName, { keyPath: storeName === 'lastSync' ? 'type' : 'id' });
                    }
                }
            };
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        const db = request.result;
        const transaction = db.transaction(
            ['savedChats', 'savedFullChats', 'chatHistory', 'pinnedChats', 'lastSync'],
            'readwrite',
        );

        const clearStore = async (storeName: string) => {
            await new Promise<void>((resolve, reject) => {
                const clearRequest = transaction.objectStore(storeName).clear();
                clearRequest.onsuccess = () => resolve();
                clearRequest.onerror = () => reject(clearRequest.error);
            });
        };

        for (const storeName of ['savedChats', 'savedFullChats', 'chatHistory', 'pinnedChats', 'lastSync']) {
            await clearStore(storeName);
        }

        for (const session of seedSessions as Record<string, unknown>[]) {
            await new Promise<void>((resolve, reject) => {
                const addRequest = transaction.objectStore('chatHistory').add(session);
                addRequest.onsuccess = () => resolve();
                addRequest.onerror = () => reject(addRequest.error);
            });
        }

        await new Promise<void>((resolve, reject) => {
            const putRequest = transaction.objectStore('lastSync').put({
                type: 'chatHistory',
                timestamp: Date.now(),
            });
            putRequest.onsuccess = () => resolve();
            putRequest.onerror = () => reject(putRequest.error);
        });

        await new Promise<void>((resolve, reject) => {
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () => reject(transaction.error);
        });

        db.close();
    }, sessions);
}
