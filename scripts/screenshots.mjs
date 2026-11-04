// Captures full-page screenshots at mobile/tablet/desktop in both themes into ./screenshots.
// Usage: npm run build && node scripts/screenshots.mjs   (serves dist via `astro preview` on :4321)
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.env.BASE_URL ?? 'http://127.0.0.1:4321';
const sizes = { mobile: [360, 800], tablet: [768, 1024], desktop: [1440, 900] };
await mkdir('screenshots', { recursive: true });
const browser = await chromium.launch();
for (const [name, [width, height]] of Object.entries(sizes)) {
  for (const theme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: theme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1300); // let the hero animation finish
    await page.screenshot({ path: `screenshots/${name}-${theme}.png`, fullPage: true });
    console.log(name, theme, errors.length ? `ERRORS: ${errors.join(' | ')}` : 'no console errors');
    await ctx.close();
  }
}
await browser.close();
