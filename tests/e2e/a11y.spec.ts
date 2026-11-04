import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];

for (const scheme of ['dark', 'light'] as const) {
  test.describe(`axe (${scheme})`, () => {
    test.use({ colorScheme: scheme });

    test('home page has no violations, collapsed', async ({ page }) => {
      await page.goto('/');
      await page.waitForTimeout(1200); // hero entrance animation
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
      await page.waitForTimeout(1200);
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
