import { expect, test } from '@playwright/test';

/**
 * The animated field now sits behind the whole page. This samples the real pixels behind body text
 * (text hidden, field running) at several scroll positions, and compares the worst case with the text's own colour.
 */
const TARGETS: { sel: string; min: number; note: string }[] = [
  { sel: '#glance h2', min: 3, note: 'large heading just below the hero' },
  { sel: '#timeline .section-head h2', min: 3, note: 'section heading' },
  { sel: '#timeline .section-head p', min: 4.5, note: 'section intro' },
  { sel: '#timeline .tl-item:nth-child(5) .tl-org', min: 4.5, note: 'timeline row on bare background' },
  { sel: '#projects .section-head p', min: 4.5, note: 'section intro' },
  { sel: '#skills .section-head p', min: 4.5, note: 'section intro' },
  { sel: '#skills .skill-group h3', min: 4.5, note: 'skill group label' },
  { sel: '#education .edu-note', min: 4.5, note: 'note on bare background' },
  { sel: '.site-footer p', min: 4.5, note: 'footer text' },
];

for (const scheme of ['dark', 'light'] as const) {
  test(`body text stays legible over the page-wide field, ${scheme}`, async ({ browser }) => {
    test.setTimeout(150_000);
    const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('.page-field')).toHaveAttribute('data-ready', 'true', { timeout: 10_000 });
    const dark = scheme === 'dark';
    const failures: string[] = [];

    for (const t of TARGETS) {
      const el = page.locator(t.sel).first();
      await el.scrollIntoViewIfNeeded();
      await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'center' }), t.sel);
      await page.waitForTimeout(1200); // reveal animation and the scroll-driven field strength

      // Text rectangle and the text's own luminance, read before the text is hidden.
      const info = await page.evaluate((sel) => {
        const lin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
        const node = document.querySelector(sel)!;
        const range = document.createRange();
        range.selectNodeContents(node);
        const b = range.getBoundingClientRect();
        const probe = document.createElement('canvas');
        probe.width = probe.height = 1;
        const g = probe.getContext('2d')!;
        g.fillStyle = getComputedStyle(node).color;
        g.fillRect(0, 0, 1, 1);
        const [R, G, B] = g.getImageData(0, 0, 1, 1).data;
        return {
          box: { x: b.x, y: b.y, width: b.width, height: b.height },
          textL: 0.2126 * lin(R!) + 0.7152 * lin(G!) + 0.0722 * lin(B!),
        };
      }, t.sel);

      await page.evaluate(() => {
        const s = document.createElement('style');
        s.id = 'hide-text';
        s.textContent = 'body *{color:transparent!important;text-shadow:none!important}';
        document.head.append(s);
      });
      let worst = dark ? 0 : 1;
      for (let frame = 0; frame < 5; frame++) {
        const png = await page.screenshot({ clip: info.box });
        const l = await page.evaluate(
          async ({ b64, isDark }) => {
            const img = new Image();
            img.src = `data:image/png;base64,${b64}`;
            await img.decode();
            const c = document.createElement('canvas');
            c.width = img.width;
            c.height = img.height;
            const g = c.getContext('2d')!;
            g.drawImage(img, 0, 0);
            const d = g.getImageData(0, 0, c.width, c.height).data;
            const lin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
            let ext = isDark ? 0 : 1;
            for (let i = 0; i < d.length; i += 4) {
              const L = 0.2126 * lin(d[i]!) + 0.7152 * lin(d[i + 1]!) + 0.0722 * lin(d[i + 2]!);
              ext = isDark ? Math.max(ext, L) : Math.min(ext, L);
            }
            return ext;
          },
          { b64: png.toString('base64'), isDark: dark },
        );
        worst = dark ? Math.max(worst, l) : Math.min(worst, l);
        await page.waitForTimeout(250);
      }
      await page.evaluate(() => document.getElementById('hide-text')?.remove());

      const ratio = dark ? (info.textL + 0.05) / (worst + 0.05) : (worst + 0.05) / (info.textL + 0.05);
      if (ratio < t.min) failures.push(`${t.sel} (${t.note}): ${ratio.toFixed(2)} < ${t.min}`);
    }
    expect(failures, failures.join('\n')).toEqual([]);
    await ctx.close();
  });
}

test('the Pause animation button stays reachable and visible after scrolling', async ({ page }) => {
  await page.goto('/');
  const btn = page.getByRole('button', { name: /Pause animation/ });
  await page.locator('#contact').scrollIntoViewIfNeeded();
  await expect(btn).toBeInViewport({ ratio: 1 });
  await btn.click();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
  await expect(page.locator('.page-field')).toHaveAttribute('data-ready', 'false');
});

test('the field covers the viewport at every scroll position and strength falls off below the hero', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('.page-field')).toHaveAttribute('data-ready', 'true', { timeout: 10_000 });
  const read = () =>
    page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('.page-field')!;
      const r = el.getBoundingClientRect();
      return {
        covers: r.width >= innerWidth - 1 && r.height >= innerHeight - 1 && r.top === 0 && r.left === 0,
        o: Number(el.style.getPropertyValue('--field-o')),
      };
    });
  const top = await read();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(500);
  const bottom = await read();
  expect(top.covers && bottom.covers).toBe(true);
  expect(top.o).toBeGreaterThan(0.95);
  expect(bottom.o).toBeLessThanOrEqual(0.45);
});
