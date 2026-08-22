/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';
import { DEFAULT_BASE_URL } from './helpers/chatTestHarness';

test.describe('Home Page Unauthenticated Access', () => {
    test('should allow access to home page without being redirected to login', async ({ page }) => {
        await page.goto(DEFAULT_BASE_URL, { waitUntil: 'load' });

        const url = page.url();
        expect(url).toBe(DEFAULT_BASE_URL + '/');

        await expect(page.getByRole('navigation', { name: 'Home navigation' })).toBeVisible();
    });

    test('should display marketing copy and primary CTA', async ({ page }) => {
        await page.goto(DEFAULT_BASE_URL, { waitUntil: 'load' });

        await expect(
            page.getByText(/Chat with GPT, Claude, Gemini, and more/i),
        ).toBeVisible();
        await expect(page.getByText(/Pay only for what you use/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /Download desktop app/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /Sign in/i })).toBeVisible();
    });
});
