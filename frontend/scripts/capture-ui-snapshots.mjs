/**
 * One-off snapshot capture for UI redesign comparison.
 * Run from client/frontend: node scripts/capture-ui-snapshots.mjs
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../../docs/ui-redesign/snapshots');
const BASE = process.env.WEB_URL || 'http://localhost:23001';

const PAGES = [
  { name: 'homepage', path: '/', wait: 2000 },
  { name: 'login', path: '/login', wait: 1500 },
  { name: 'signup', path: '/signup', wait: 1500 },
  { name: 'docs', path: '/docs', wait: 1500 },
];

async function capture() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  for (const { name, path: route, wait } of PAGES) {
    const url = `${BASE}${route}`;
    console.log(`Capturing ${name} → ${url}`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(wait);
      await page.screenshot({
        path: path.join(OUT, `${name}-desktop.png`),
        fullPage: true,
      });
    } catch (err) {
      console.error(`  Failed ${name}:`, err.message);
    }
  }

  await page.setViewportSize({ width: 390, height: 844 });
  for (const { name, path: route, wait } of PAGES.slice(0, 2)) {
    const url = `${BASE}${route}`;
    console.log(`Capturing ${name}-mobile → ${url}`);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(wait);
      await page.screenshot({
        path: path.join(OUT, `${name}-mobile.png`),
        fullPage: false,
      });
    } catch (err) {
      console.error(`  Failed ${name}-mobile:`, err.message);
    }
  }

  await browser.close();
  console.log('Done. Snapshots saved to', OUT);
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});
