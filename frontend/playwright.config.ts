import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E for AIGenius frontend.
 * Local: start with `yarn dev:e2e` (or `E2E_WALLET_BYPASS_TEST_CLIENT=1 yarn dev`) on http://localhost:3001
 * so wallet bypass + test-mode code sees NODE_ENV=test in the browser. Normal local dev omits this.
 *
 * Speed tips:
 * - Avoid waitForLoadState('networkidle') in specs (slow); prefer domcontentloaded/load + UI assertions.
 * - Parallelism: default workers ~50% of CPUs. Limit: PW_WORKERS=2 npx playwright test
 * - Reuse dev server on :3001: CI=1 uses reuseExistingServer so a running `yarn dev` is not restarted.
 */
export default defineConfig({
    testDir: './e2e/tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    // Default parallel workers (~50% CPU). Override: PW_WORKERS=4 npx playwright test
    workers: process.env.PW_WORKERS
        ? parseInt(process.env.PW_WORKERS, 10)
        : undefined,
    reporter: 'html',
    use: {
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3001',
        trace: 'on-first-retry',
        video: 'on-first-retry',
    },
    timeout: 30_000,
    expect: { timeout: 10_000 },
    projects: [
        { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
        /** Chromium-based mobile profiles for responsive / sidebar snapshot coverage (no WebKit install required). */
        { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
        { name: 'mobile-chrome-small', use: { ...devices['Galaxy S9+'] } },
    ],
    // When CI is set, start dev unless something already listens on 3001 (local agent / parallel dev).
    webServer: process.env.CI
        ? {
              command: 'yarn dev',
              url: 'http://localhost:3001',
              reuseExistingServer: true,
              env: {
                  ...process.env,
                  E2E_WALLET_BYPASS_TEST_CLIENT: '1',
              },
          }
        : undefined,
});
