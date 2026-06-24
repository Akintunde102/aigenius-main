/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';

test('Personality_2025-09-09', async ({ page, context }) => {

    // Navigate to URL
    await page.goto('http://localhost:3001/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0M2MyMDkzLTQxYzEtYTU5NS01YTJiLTg0ZDEwMDAwMDAwMCIsImlhdCI6MTc1NTUwMjcwMSwiZXhwIjoxNzU1NjMyMzAxfQ.XY8Lcp-RyMPuY_uhXCPwnobVIdqpLxcpmZJ_RwqkKw4', { waitUntil: 'domcontentloaded' });

    // Take screenshot
    await page.screenshot({ path: 'home-empty.png', fullPage: true });

    // Take screenshot
    await page.screenshot({ path: 'chat-ui.png', fullPage: true });

    // Navigate to URL
    await page.goto('http://localhost:3001/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0M2MyMDkzLTQxYzEtYTU5NS01YTJiLTg0ZDEwMDAwMDAwMCIsImlhdCI6MTc1NTUwMjcwMSwiZXhwIjoxNzU1NjMyMzAxfQ.XY8Lcp-RyMPuY_uhXCPwnobVIdqpLxcpmZJ_RwqkKw4');

    // Click element
    await page.click("css=[aria-label='Sidebar menu']");

    // Navigate to URL
    await page.goto('http://localhost:3001/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0M2MyMDkzLTQxYzEtYTU5NS01YTJiLTg0ZDEwMDAwMDAwMCIsImlhdCI6MTc1NTUwMjcwMSwiZXhwIjoxNzU1NjMyMzAxfQ.XY8Lcp-RyMPuY_uhXCPwnobVIdqpLxcpmZJ_RwqkKw4', { waitUntil: 'domcontentloaded' });

    // Navigate to URL
    await page.goto('http://localhost:3001/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0M2MyMDkzLTQxYzEtYTU5NS01YTJiLTg0ZDEwMDAwMDAwMCIsImlhdCI6MTc1NTUwMjcwMSwiZXhwIjoxNzU1NjMyMzAxfQ.XY8Lcp-RyMPuY_uhXCPwnobVIdqpLxcpmZJ_RwqkKw4');

    // Click element
    await page.click("css=[aria-label='Sidebar menu']");

    // Navigate to URL
    await page.goto('http://localhost:3001/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY0M2MyMDkzLTQxYzEtYTU5NS01YTJiLTg0ZDEwMDAwMDAwMCIsImlhdCI6MTc1NTUwMjcwMSwiZXhwIjoxNzU1NjMyMzAxfQ.XY8Lcp-RyMPuY_uhXCPwnobVIdqpLxcpmZJ_RwqkKw4', { waitUntil: 'domcontentloaded' });

    // Take screenshot
    await page.screenshot({ path: 'chat-ui-loaded.png', fullPage: true });
});