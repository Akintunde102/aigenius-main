import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  seedAuthenticatedSession,
  stubChatShell,
  waitForChatComposerReady,
  DEFAULT_BASE_URL,
} from '../e2e/tests/helpers/chatTestHarness.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.WEB_URL || 'http://localhost:23001';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // Route mocking or direct load
  console.log('Seeding authenticated session...');
  await seedAuthenticatedSession(page, BASE);
  await stubChatShell(page, { baseUrl: BASE });

  console.log('Navigating to', BASE);
  await page.goto(`${BASE}/?token=e2e-fake-token`, { waitUntil: 'domcontentloaded' });
  await waitForChatComposerReady(page);

  console.log('Composer ready. Finding model picker button...');
  // The quick pick dropdown or model button
  const modelBtn = page.locator('button[title*="Model:"], button[title="Select model"], button:has-text("Sao10K"), button:has-text("Select model")').first();
  await modelBtn.waitFor({ state: 'visible', timeout: 10000 });
  await modelBtn.click();

  // If it's a dropdown, look for "Browse all models" or similar, or if it opens modal directly
  const browseAll = page.getByRole('button', { name: /Browse all|All models|More models/i });
  if (await browseAll.isVisible().catch(() => false)) {
    console.log('Clicking browse all...');
    await browseAll.click();
  }

  // Wait for modal
  const modalHeader = page.getByRole('heading', { name: /Quick Models|All Models/i });
  await modalHeader.waitFor({ state: 'visible', timeout: 10000 });
  console.log('Model selection modal opened!');

  const outDir = path.resolve(__dirname, '../../../docs/ui-redesign/snapshots');
  await page.screenshot({ path: path.join(outDir, 'model-modal-before.png') });
  console.log('Saved snapshot to docs/ui-redesign/snapshots/model-modal-before.png');

  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
