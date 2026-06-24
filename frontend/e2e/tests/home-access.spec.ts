/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';
import { DEFAULT_BASE_URL } from './helpers/chatTestHarness';

test.describe('Home Page Unauthenticated Access', () => {
    test('should allow access to home page without being redirected to login', async ({ page }) => {
        // Go to the home page without seeding a session
        await page.goto(DEFAULT_BASE_URL, { waitUntil: 'load' });

        // Check that we are still on the home page and NOT redirected to /login
        const url = page.url();
        expect(url).toBe(DEFAULT_BASE_URL + '/');

        // Verify the presence of the logo/branding
        await expect(page.getByText('AIGenius', { exact: true })).toBeVisible();
    });

    test('should display marketing copy and primary CTA', async ({ page }) => {
        await page.goto(DEFAULT_BASE_URL, { waitUntil: 'load' });

        await expect(
            page.getByRole('heading', { name: /evaluate, compare, and deploy the right AI model/i }),
        ).toBeVisible();
        await expect(page.getByText(/enterprise buyers, technical founders, and marketers/i)).toBeVisible();
        await expect(page.getByRole('link', { name: /Sign up/i }).first()).toBeVisible();
    });
});
