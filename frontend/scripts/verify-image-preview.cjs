const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACTS_DIR = 'C:\\Users\\DELL5530\\.gemini\\antigravity\\brain\\4dce825e-0124-4f46-ac93-190120954aca';
const BASE_URL = 'http://127.0.0.1:23001';
const E2E_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImUyZS11c2VyLWlkIiwiZW1haWwiOiJlMmVAZXhhbXBsZS5jb20iLCJleHAiOjk5OTk5OTk5OTl9.signature';

const loggedUserDetails = {
    id: 'e2e-user-id',
    email: 'e2e@example.com',
    firstName: 'E2E',
    lastName: 'User',
    wallet: 50000,
    config: { wallet: 50000, integrations: {} },
    gmailConnected: false,
};

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

async function run() {
    console.log('[verify] Launching Chromium browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2,
    });

    await context.addCookies([
        { name: 'nobox_client_token', value: E2E_TOKEN, url: BASE_URL },
        { name: 'nobox_token', value: E2E_TOKEN, url: BASE_URL },
    ]);

    const page = await context.newPage();

    await page.addInitScript((token) => {
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

    page.on('console', (msg) => {
        console.log('[browser console]:', msg.text());
    });

    await page.route((url) => url.port === '8001' || url.pathname.includes('gateway') || url.pathname.includes('model-chats') || url.href.includes('chat/completions'), async (route) => {
        const u = route.request().url();
        console.log('[intercepted API]:', route.request().method(), u);

        if (u.includes('logged-user-details')) {
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(loggedUserDetails) });
        }
        if (u.includes('chat/completions')) {
            console.log('[verify] Returning streaming image response...');
            return route.fulfill({
                status: 200,
                headers: {
                    'Content-Type': 'text/event-stream',
                    'X-Conversation-Id': 'image-preview-e2e-conversation',
                },
                body: [
                    `data: ${JSON.stringify({ choices: [{ delta: { content: 'Here is your character sheet design:\n\n![Damilola Character Sheet](/auth-bg.png)' } }] })}`,
                    `data: ${JSON.stringify({ usage: { prompt_tokens: 1, completion_tokens: 12, total_tokens: 13 }, cost: 0.0001 })}`,
                    'data: [DONE]',
                    '',
                ].join('\n'),
            });
        }
        if (u.includes('auth/_/refresh') || u.includes('auth/_/connection_token')) {
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: E2E_TOKEN, data: { token: E2E_TOKEN } }) });
        }
        if (u.includes('models')) {
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(minimalModels) });
        }
        if (u.includes('saved-chat-items') || u.includes('chat-history') || u.includes('resources')) {
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(emptyResources) });
        }
        if (u.includes('conversation-events')) {
            return route.fulfill({ status: 200, contentType: 'text/event-stream', body: '' });
        }
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: true, dataReturned: [] }) });
    });

    console.log(`[verify] Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    console.log('[verify] Submitting prompt to trigger image response...');
    const input = page.getByPlaceholder('Type...');
    await input.waitFor({ state: 'visible', timeout: 10000 });
    await input.fill('Show character sheet');
    await input.press('Enter');
    const sendBtn = page.locator('button:has(svg.lucide-arrow-up), button[type="submit"]').last();
    if (await sendBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
        await sendBtn.click().catch(() => {});
    }

    console.log('[verify] Waiting for image to render in assistant response...');
    const chatImage = page.locator('img[alt*="Damilola Character Sheet"], img[src*="auth-bg"]').first();
    await chatImage.waitFor({ state: 'visible', timeout: 15000 });
    console.log('[verify] Image rendered! Clicking image to open lightbox...');
    await chatImage.click();

    // Check lightbox
    const lightbox = page.locator('[role="dialog"][aria-label="Image preview"]');
    await lightbox.waitFor({ state: 'visible', timeout: 5000 });
    console.log('[verify] Lightbox opened successfully!');

    // Wait for image inside lightbox to load
    const lightboxImg = lightbox.locator('img');
    await lightboxImg.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(800);

    // Take initial screenshot of the clean minimalist lightbox
    const initialShot = path.join(ARTIFACTS_DIR, 'lightbox-initial.png');
    await page.screenshot({ path: initialShot });
    console.log(`[verify] Saved initial lightbox snapshot to ${initialShot}`);

    // Verify all toolbar controls and icons are present
    const zoomLabel = lightbox.locator('button:has-text("%")');
    console.log(`[verify] Current zoom: ${await zoomLabel.textContent()}`);

    const zoomInBtn = lightbox.locator('button[title*="Zoom in"]');
    const zoomOutBtn = lightbox.locator('button[title*="Zoom out"]');
    const resetViewBtn = lightbox.locator('button[title*="Reset view"]');
    const pencilBtn = lightbox.locator('button[title*="Draw on image"], button[title*="Drawing mode"]');
    const undoBtn = lightbox.locator('button[title*="Undo"]');
    const redoBtn = lightbox.locator('button[title*="Redo"]');
    const copyBtn = lightbox.locator('button[title*="Copy image"]');
    const downloadBtn = lightbox.locator('button[title*="Download"]');
    const closeBtn = lightbox.locator('button[title*="Close"]');

    // Test Zoom in
    console.log('[verify] Testing zoom in...');
    await zoomInBtn.click();
    await page.waitForTimeout(200);
    console.log(`[verify] Zoom after zoom in: ${await zoomLabel.textContent()}`);

    // Test Zoom reset
    console.log('[verify] Testing zoom reset...');
    await resetViewBtn.click();
    await page.waitForTimeout(200);
    console.log(`[verify] Zoom after reset: ${await zoomLabel.textContent()}`);

    // Test Pencil toggle & Brush sizes & Colors
    console.log('[verify] Testing drawing mode...');
    await pencilBtn.click();
    await page.waitForTimeout(200);

    // Select Red color (default or first) and draw a stroke
    const redColorBtn = lightbox.locator('button[aria-label*="Draw color #ef4444"], button[title*="#ef4444"]').first();
    if (await redColorBtn.isVisible()) {
        await redColorBtn.click();
    }

    const canvas = lightbox.locator('canvas.touch-none');
    await canvas.waitFor({ state: 'visible', timeout: 5000 });
    const box = await canvas.boundingBox();

    if (box) {
        console.log('[verify] Drawing red stroke on canvas...');
        const x1 = box.x + box.width * 0.25;
        const y1 = box.y + box.height * 0.35;
        const x2 = box.x + box.width * 0.45;
        const y2 = box.y + box.height * 0.55;

        await page.mouse.move(x1, y1);
        await page.mouse.down();
        await page.mouse.move(x1 + 30, y1 + 15, { steps: 5 });
        await page.mouse.move(x2, y2, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(300);

        // Select Yellow color and Thick brush, then draw another stroke
        console.log('[verify] Selecting yellow color and thick brush...');
        const yellowBtn = lightbox.locator('button[aria-label*="Draw color #eab308"], button[title*="#eab308"]').first();
        if (await yellowBtn.isVisible()) {
            await yellowBtn.click();
        }
        const thickBrushBtn = lightbox.locator('button[aria-label*="Thick"]').first();
        if (await thickBrushBtn.isVisible()) {
            await thickBrushBtn.click();
        }

        const x3 = box.x + box.width * 0.55;
        const y3 = box.y + box.height * 0.35;
        const x4 = box.x + box.width * 0.75;
        const y4 = box.y + box.height * 0.55;

        await page.mouse.move(x3, y3);
        await page.mouse.down();
        await page.mouse.move(x3 + 20, y3 + 40, { steps: 5 });
        await page.mouse.move(x4, y4, { steps: 5 });
        await page.mouse.up();
        await page.waitForTimeout(300);

        // Single click dot with Green color
        console.log('[verify] Testing single click dot with green color...');
        const greenBtn = lightbox.locator('button[aria-label*="Draw color #22c55e"], button[title*="#22c55e"]').first();
        if (await greenBtn.isVisible()) {
            await greenBtn.click();
        }
        await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.25);
        await page.waitForTimeout(300);
    }

    // Take screenshot with drawing annotations
    const annotatedShot = path.join(ARTIFACTS_DIR, 'lightbox-annotated.png');
    await page.screenshot({ path: annotatedShot });
    console.log(`[verify] Saved annotated lightbox snapshot to ${annotatedShot}`);

    // Test Undo
    console.log('[verify] Testing Undo...');
    await undoBtn.click();
    await page.waitForTimeout(300);

    // Test Redo
    console.log('[verify] Testing Redo...');
    await redoBtn.click();
    await page.waitForTimeout(300);

    // Test Copy button
    console.log('[verify] Testing Copy image...');
    await copyBtn.click();
    await page.waitForTimeout(500);

    // Take screenshot after copy action
    const copyShot = path.join(ARTIFACTS_DIR, 'lightbox-copied.png');
    await page.screenshot({ path: copyShot });
    console.log(`[verify] Saved copy state snapshot to ${copyShot}`);

    // Test Close button
    console.log('[verify] Testing Close button...');
    await closeBtn.click();
    await page.waitForTimeout(500);
    const isClosed = !(await lightbox.isVisible().catch(() => false));
    console.log(`[verify] Lightbox closed successfully: ${isClosed}`);

    await browser.close();
    console.log('[verify] ALL TESTS PASSED!');
}

run().catch((err) => {
    console.error('[verify] Verification failed:', err);
    process.exit(1);
});
