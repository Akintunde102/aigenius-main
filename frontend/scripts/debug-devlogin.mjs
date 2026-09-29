import { chromium } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.WEB_URL || 'http://localhost:23001';

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  page.on('console', msg => console.log('LOG:', msg.type(), msg.text().slice(0, 120)));
  page.on('pageerror', err => console.log('ERROR:', err.message));

  console.log('Navigating to', `${BASE}/login`);
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const devLogin = page.getByRole('button', { name: /Developer Login/i });
  if (await devLogin.isVisible().catch(() => false)) {
    console.log('Clicking Developer Login...');
    await devLogin.click();
    await page.waitForTimeout(5000);
  }

  console.log('URL:', page.url());
  const bodyText = await page.evaluate(() => document.body.innerText);
  console.log('Body:', bodyText.slice(0, 200));

  await page.screenshot({ path: path.resolve(__dirname, '../../../docs/ui-redesign/snapshots/post-devlogin.png') });
  await browser.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
