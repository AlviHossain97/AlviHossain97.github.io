import { defineConfig, devices } from '@playwright/test';

const PORT = 4321;

// Tests run against the built site (`npm run build` first; `npm test` does both).
export default defineConfig({
  testDir: 'tests/e2e',
  // The animated field runs behind every scroll position; software WebGL under parallel workers is slow.
  timeout: 90_000,
  // One browser at a time on a developer machine (the WebGL field is drawn on the CPU in headless Chromium, so
  // parallel workers can freeze a laptop). CI runners are dedicated, so they use two.
  workers: process.env.CI ? 2 : 1,
  fullyParallel: !!process.env.CI,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: { baseURL: `http://127.0.0.1:${PORT}`, trace: 'on-first-retry' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
    { name: 'mobile', use: { ...devices['Desktop Chrome'], viewport: { width: 360, height: 740 } } },
  ],
  webServer: {
    command: `npx astro preview --port ${PORT} --host 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
