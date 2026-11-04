// Captures full-page screenshots at mobile/tablet/desktop in both themes into ./screenshots.
// Usage: npm run build && node scripts/screenshots.mjs   (serves dist via `astro preview` on :4321)
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const base = process.env.BASE_URL ?? 'http://127.0.0.1:4321';
const sizes = { mobile: [360, 800], tablet: [768, 1024], desktop: [1440, 900] };
const out = process.env.OUT ?? 'screenshots';
await mkdir(out, { recursive: true });
// Software WebGL so the hero field renders in headless Chromium.
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
for (const [name, [width, height]] of Object.entries(sizes)) {
  for (const theme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: theme });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1800); // hero entrance and the lazy WebGL field
    // Scroll the whole page once so scroll-triggered reveals fire, then return to the top.
    const pageH = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < pageH; y += Math.round(page.viewportSize().height * 0.7)) {
      await page.evaluate((top) => window.scrollTo(0, top), y);
      await page.waitForTimeout(160);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${out}/${name}-${theme}.png`, fullPage: true });
    console.log(name, theme, errors.length ? `ERRORS: ${errors.join(' | ')}` : 'no console errors');
    await ctx.close();
  }
}
await browser.close();
