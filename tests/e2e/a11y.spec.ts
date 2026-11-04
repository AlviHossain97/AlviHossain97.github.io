import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

/** Scroll the whole page once so scroll-triggered reveals have finished before axe measures contrast. */
const settle = async (page: Page) => {
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = Math.round((page.viewportSize()?.height ?? 800) * 0.7);
  for (let y = 0; y < total; y += step) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(1500);
};

for (const scheme of ['dark', 'light'] as const) {
  test.describe(`axe (${scheme})`, () => {
    test.use({ colorScheme: scheme });

    test('home page has no violations, collapsed', async ({ page }) => {
      await page.goto('/');
      await settle(page); // entrance animation, reveals and the lazy field
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(
        results.violations,
        JSON.stringify(
          results.violations.map((v) => [v.id, v.nodes.map((n) => n.target)]),
          null,
          1,
        ),
      ).toEqual([]);
    });

    test('home page has no violations with everything expanded', async ({ page }) => {
      await page.goto('/');
      await settle(page);
      for (const b of await page.locator('#timeline button.tl-toggle').all()) await b.click();
      for (const d of await page.locator('details').all()) await d.locator('summary').click();
      await page
        .locator('#skills')
        .getByRole('button', { name: /^Python/ })
        .click();
      await page.waitForTimeout(600);
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(
        results.violations,
        JSON.stringify(
          results.violations.map((v) => [v.id, v.nodes.map((n) => n.target)]),
          null,
          1,
        ),
      ).toEqual([]);
    });

    test('home page has no violations with reduced motion (fully static)', async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: scheme, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      await page.goto('/');
      await page.waitForTimeout(600);
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(results.violations.map((v) => [v.id, v.nodes.map((n) => n.target)])).toEqual([]);
      await ctx.close();
    });

    test('CV page has no violations', async ({ page }) => {
      await page.goto('/cv/');
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(results.violations.map((v) => [v.id, v.nodes.map((n) => n.target)])).toEqual([]);
    });

    test('404 page has no violations', async ({ page }) => {
      await page.goto('/nope');
      const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      expect(results.violations).toEqual([]);
    });
  });
}

test('every interactive control has a visible focus indicator', async ({ page }) => {
  await page.goto('/');
  const btn = page.locator('.filter-btn').first();
  await btn.focus();
  const outline = await btn.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});

test('page is usable at 320px with no horizontal scroll', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test('no horizontal scroll at 360px and 1920px', async ({ page }) => {
  for (const width of [360, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `width ${width}`).toBeLessThanOrEqual(0);
  }
});
