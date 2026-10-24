import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './browser-tests', fullyParallel: false, workers: 1, timeout: 45_000,
  use: { browserName: 'chromium', channel: process.env.OPENLAB_BROWSER_CHANNEL ?? 'chrome', headless: true, viewport: { width: 1440, height: 1000 }, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: { command: 'node scripts/browser-fixture.mjs', url: 'http://127.0.0.1:4321', reuseExistingServer: false, timeout: 30_000 },
});
