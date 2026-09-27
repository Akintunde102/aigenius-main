import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.WEB_URL || 'http://localhost:23001';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImVkYTg5NjRhLWQ2YTYtNDBiYS04OWNiLWI1MTQzYThlODQxMiIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImp0aSI6IjMyM2ZiM2Q3LWQxODctNGExZS05YTQwLWVlZjA2MWQyZjgxMiIsImlhdCI6MTc5MDQ2MTE3OSwiZXhwIjoxNzkwNTQ3MTc5fQ.2woctdCZLlpuAN2Y8lFxI7yboiVbOyGh6VuygqXotXY';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  page.on('pageerror', err => console.log('PAGE_ERROR:', err.message, err.stack));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE_ERROR:', msg.text());
    }
  });

  console.log('Navigating with token to', `${BASE}/?token=...`);
  await page.goto(`${BASE}/?token=${TOKEN}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('Looking for composer or chat container...');
  const textarea = page.locator('textarea, [contenteditable="true"], input[placeholder*="Type"]').first();
  await textarea.waitFor({ state: 'visible', timeout: 20000 });
  console.log('Composer is ready!');

  // Look for model button
  const modelBtn = page.locator('button[title*="Model:"], button[title="Select model"], button:has-text("Claude"), button:has-text("Gemini"), button:has-text("GPT"), button:has-text("Sol"), button:has-text("Astra"), button:has-text("Sao10K")').first();
  await modelBtn.waitFor({ state: 'visible', timeout: 10000 });
  console.log('Found model button! Text:', await modelBtn.innerText());
  await modelBtn.click();
  await page.waitForTimeout(600);

  const addModels = page.getByRole('button', { name: /Add models|Browse all/i }).first();
  if (await addModels.isVisible().catch(() => false)) {
    console.log('Clicking Add models / Browse all button...');
    await addModels.click();
    await page.waitForTimeout(1200);
  }

  // Check if modal opened
  const modalHeading = page.locator('h2').filter({ hasText: /Quick Models|All Models/i }).first();
  await modalHeading.waitFor({ state: 'visible', timeout: 10000 });
  console.log('Modal heading visible:', await modalHeading.innerText());

  const outDir = path.resolve(__dirname, '../../../docs/ui-redesign/snapshots');
  await page.screenshot({ path: path.join(outDir, 'model-modal-after-v1.png') });
  console.log('Captured after snapshot to docs/ui-redesign/snapshots/model-modal-after-v1.png');

  // Switch to All Models
  const allModelsTab = page.locator('aside button').filter({ hasText: 'All Models' });
  await allModelsTab.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'model-modal-after-all-v1.png') });
  console.log('Captured after All Models snapshot to docs/ui-redesign/snapshots/model-modal-after-all-v1.png');

  // Test typing in search
  const searchInput = page.locator('aside input[placeholder="Search models..."]');
  await searchInput.fill('claude');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'model-modal-after-search-v1.png') });
  console.log('Captured search snapshot to docs/ui-redesign/snapshots/model-modal-after-search-v1.png');

  // Clear search and test a capability filter (Files & Images)
  await searchInput.fill('');
  const filesImagesRow = page.locator('aside').getByText('Files & Images');
  await filesImagesRow.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'model-modal-after-filter-v1.png') });
  console.log('Captured filter snapshot to docs/ui-redesign/snapshots/model-modal-after-filter-v1.png');

  // Test empty state when search finds nothing
  await searchInput.fill('xyznotfound123');
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'model-modal-empty-state.png') });
  console.log('Captured empty state snapshot to docs/ui-redesign/snapshots/model-modal-empty-state.png');

  // Mobile test
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto(`${BASE}/?token=${TOKEN}`, { waitUntil: 'domcontentloaded' });
  await mobilePage.waitForTimeout(3000);
  const mobileModelBtn = mobilePage.locator('button[title*="Model:"], button[title="Select model"], button:has-text("Gemini"), button:has-text("Claude")').first();
  await mobileModelBtn.waitFor({ state: 'visible', timeout: 10000 });
  await mobileModelBtn.click();
  await mobilePage.waitForTimeout(600);
  const mobileAdd = mobilePage.getByRole('button', { name: /Add models|Browse all/i }).first();
  if (await mobileAdd.isVisible().catch(() => false)) {
    await mobileAdd.click();
    await mobilePage.waitForTimeout(1000);
  }
  await mobilePage.screenshot({ path: path.join(outDir, 'model-modal-mobile.png') });
  console.log('Captured mobile snapshot to docs/ui-redesign/snapshots/model-modal-mobile.png');
  await mobileContext.close();

  await browser.close();
  console.log('ALL SNAPSHOTS COMPLETED SUCCESSFULLY!');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
