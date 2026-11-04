import { expect, test, type Page } from '@playwright/test';

const collectErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  return errors;
};

test.describe('page', () => {
  test('loads with no console errors and the key content', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1, name: 'Alvi Hossain' })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Positioning' })).toContainText('Head of R&D at LearnThrive');
    await expect(page.getByRole('list', { name: 'Positioning' })).toContainText(
      'MSc Advanced Computer Science at QMUL',
    );
    await expect(page.getByRole('list', { name: 'Positioning' })).toContainText('First-Class BSc');
    await page.waitForLoadState('networkidle');
    expect(errors).toEqual([]);
  });

  test('hero CTAs link to the PDF, GitHub, LinkedIn and email only', async ({ page }) => {
    await page.goto('/');
    const hero = page.locator('#top');
    await expect(hero.getByRole('link', { name: 'Download CV (PDF)' })).toHaveAttribute('href', /\.pdf$/);
    await expect(hero.getByRole('link', { name: /GitHub/ })).toHaveAttribute(
      'href',
      'https://github.com/AlviHossain97',
    );
    await expect(hero.getByRole('link', { name: /LinkedIn/ })).toHaveAttribute(
      'href',
      'https://www.linkedin.com/in/alvihossain',
    );
    await expect(hero.getByRole('link', { name: 'Email' })).toHaveAttribute('href', 'mailto:alvi997@outlook.com');
  });

  test('every external link is email, LinkedIn or GitHub', async ({ page }) => {
    await page.goto('/');
    const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href') ?? ''));
    const external = hrefs.filter((h) => /^(https?:|mailto:)/.test(h));
    expect(external.length).toBeGreaterThan(0);
    for (const h of external) {
      expect(h, h).toMatch(
        /^(mailto:alvi997@outlook\.com|https:\/\/(www\.)?linkedin\.com\/in\/alvihossain|https:\/\/github\.com\/AlviHossain97)/,
      );
    }
  });

  test('page text contains no phone number, postcode or home town', async ({ page }) => {
    await page.goto('/');
    const text = await page.evaluate(() => document.documentElement.outerHTML);
    expect(text).not.toMatch(/(?<![\d.])(?:\+44\s?\(?0?\)?\s?|0)7\d{3}[\s-]?\d{6}(?!\d)/);
    expect(text).not.toMatch(/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/);
    expect(text).not.toMatch(new RegExp(['felt', 'ham'].join(''), 'i'));
    expect(text).not.toMatch(new RegExp(['production', 'ready'].join('[- ]'), 'i'));
  });
});

test.describe('navigation', () => {
  test('nav links jump to their sections', async ({ page }) => {
    await page.goto('/');
    for (const [name, id] of [
      ['Projects', 'projects'],
      ['Skills', 'skills'],
      ['Education', 'education'],
      ['Contact', 'contact'],
    ] as const) {
      await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name }).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport({ ratio: 0.1 });
    }
  });

  test('skip link is the first tab stop and targets main', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Skip to content' });
    await expect(skip).toBeFocused();
    await expect(skip).toHaveAttribute('href', '#main');
  });

  test('404 page renders with a way home', async ({ page }) => {
    const res = await page.goto('/this-does-not-exist');
    expect(res?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1, name: '404' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Back to the CV' })).toBeVisible();
  });
});

test.describe('timeline', () => {
  test('filters narrow the list and report counts', async ({ page }) => {
    await page.goto('/');
    const tl = page.locator('#timeline');
    const f = tl.locator('.filters');
    await expect(f.getByRole('button', { name: /^All/ })).toHaveAttribute('aria-pressed', 'true');
    const all = await tl.locator('.tl-item').count();
    expect(all).toBe(14);

    await f.getByRole('button', { name: /^Work/ }).click();
    await expect(f.getByRole('button', { name: /^Work/ })).toHaveAttribute('aria-pressed', 'true');
    expect(await tl.locator('.tl-item').count()).toBe(6);
    await expect(tl.locator('.tl-item:not([data-kind="work"])')).toHaveCount(0);

    await f.getByRole('button', { name: /^Education/ }).click();
    await expect(tl.locator('.tl-item')).toHaveCount(2);

    await f.getByRole('button', { name: /^Projects/ }).click();
    await expect(tl.locator('.tl-item')).toHaveCount(6);
    await expect(page).toHaveURL(/#timeline\/projects$/);

    await f.getByRole('button', { name: /^All/ }).click();
    await expect(tl.locator('.tl-item')).toHaveCount(14);
  });

  test('entries expand and collapse with the keyboard', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('#btn-learnthrive-rd');
    await btn.focus();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
    await page.keyboard.press('Enter');
    await expect(btn).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#panel-learnthrive-rd')).toContainText('Vitest and Playwright');
    await page.keyboard.press('Space');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  test('collapsed panels are not reachable by keyboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#panel-cirquon .panel-inner')).toHaveAttribute('inert', '');
  });

  test('deep link: #timeline/<filter> sets the filter', async ({ page }) => {
    await page.goto('/#timeline/education');
    await expect(page.locator('#timeline .filters').getByRole('button', { name: /^Education/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('#timeline .tl-item')).toHaveCount(2);
  });

  test('deep link: #<entry-id> expands and scrolls to the entry', async ({ page }) => {
    await page.goto('/#cirquon');
    await expect(page.locator('#btn-cirquon')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#cirquon')).toBeInViewport({ ratio: 0.3 });
  });

  test('deep link: an entry hidden by the filter resets the filter', async ({ page }) => {
    await page.goto('/#timeline/education');
    await page.evaluate(() => (location.hash = '#cirquon'));
    await expect(page.locator('#cirquon')).toBeVisible();
    await expect(page.locator('#timeline .filters').getByRole('button', { name: /^All/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

test.describe('projects', () => {
  test('case studies expand with what / role / stack / outcome', async ({ page }) => {
    await page.goto('/');
    const c = page.locator('#case-cirquon');
    await expect(c).not.toHaveAttribute('open', '');
    await c.locator('summary').click();
    await expect(c).toHaveAttribute('open', '');
    for (const t of ['What it is', 'My role', 'Stack', 'Outcome'])
      await expect(c.getByText(t, { exact: true })).toBeVisible();
  });

  test('featured projects appear in the briefed order', async ({ page }) => {
    await page.goto('/');
    const titles = await page.locator('#projects .case-title').allTextContents();
    expect(titles.slice(0, 3).map((t) => t.trim())).toEqual(['LearnThrive platform', 'Cirquon', 'PiStation']);
  });

  test('deep link: #case-<id> opens the case study', async ({ page }) => {
    await page.goto('/#case-pistation');
    await expect(page.locator('#case-pistation')).toHaveAttribute('open', '');
    await expect(page.locator('#case-pistation').getByRole('link', { name: /RetroWeb/ })).toHaveAttribute(
      'href',
      'https://github.com/AlviHossain97/RetroWeb',
    );
  });
});

test.describe('skills', () => {
  test('selecting a skill lists the roles and projects that use it', async ({ page }) => {
    await page.goto('/');
    const s = page.locator('#skills');
    await s.getByRole('button', { name: /^Python/ }).click();
    await expect(s.locator('.evidence')).toContainText('Cirquon');
    await expect(s.locator('.evidence')).toContainText('Student Lab Demonstrator');
  });

  test('group filter narrows the visible groups', async ({ page }) => {
    await page.goto('/');
    const s = page.locator('#skills');
    await s.getByRole('button', { name: 'Languages' }).click();
    await expect(s.locator('.skill-group')).toHaveCount(1);
    await s.getByRole('button', { name: 'All', exact: true }).click();
    await expect(s.locator('.skill-group')).toHaveCount(5);
  });

  test('deep link: #skills/<id> selects the skill', async ({ page }) => {
    await page.goto('/#skills/playwright');
    await expect(page.locator('#skills').getByRole('button', { name: /^Playwright/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('#skills .evidence')).toContainText('LearnThrive platform');
  });

  test('a skill tag in the timeline links through to the Skills section', async ({ page }) => {
    await page.goto('/#learnthrive-rd');
    await page.locator('#panel-learnthrive-rd').getByRole('link', { name: 'TypeScript' }).click();
    await expect(page.locator('#skills').getByRole('button', { name: /^TypeScript/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('uses no percentage bars or star ratings', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('progress, meter, [role="progressbar"], [role="meter"]')).toHaveCount(0);
    expect(await page.locator('#skills').innerText()).not.toMatch(/[★☆]|\d+\s?%/);
  });
});

test.describe('education', () => {
  test('module list is collapsed by default and opens on demand', async ({ page }) => {
    await page.goto('/');
    const d = page.locator('#education details.modules');
    await expect(d).not.toHaveAttribute('open', '');
    await expect(d.getByText('Machine Learning', { exact: true })).toBeHidden();
    await d.locator('summary').click();
    await expect(d.getByText('Machine Learning', { exact: true })).toBeVisible();
  });
});

test.describe('theme', () => {
  test('follows the OS preference, and the toggle overrides and persists', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'light' });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    const toggle = page.getByRole('button', { name: /Switch to dark theme/ });
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.getByRole('button', { name: /Switch to light theme/ })).toBeVisible();
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await ctx.close();
  });

  test('dark OS preference gives the dark theme', async ({ browser }) => {
    const ctx = await browser.newContext({ colorScheme: 'dark' });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await ctx.close();
  });
});

test.describe('motion', () => {
  test('reduced motion removes the hero entrance animation', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/');
    const opacity = await page.locator('#hero-title').evaluate((el) => getComputedStyle(el).opacity);
    expect(opacity).toBe('1');
    await ctx.close();
  });
});

test.describe('pdf', () => {
  test('the CV PDF is served, is a PDF, and the link downloads it', async ({ page, request }) => {
    await page.goto('/');
    const link = page.locator('#top').getByRole('link', { name: 'Download CV (PDF)' });
    const href = (await link.getAttribute('href')) ?? '';
    const res = await request.get(href);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('pdf');
    const body = await res.body();
    expect(body.subarray(0, 5).toString()).toBe('%PDF-');
    expect(body.length).toBeGreaterThan(20_000);
    const [download] = await Promise.all([page.waitForEvent('download'), link.click()]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});

test.describe('seo', () => {
  test('has title, description, canonical, Open Graph, JSON-LD and crawl files', async ({ page, request }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Alvi Hossain/);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /LearnThrive/);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://alvihossain97.github.io/');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      'https://alvihossain97.github.io/og.png',
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);

    const ld = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}');
    expect(ld['@type']).toBe('Person');
    expect(ld.name).toBe('Alvi Hossain');
    expect(ld.sameAs).toEqual(['https://www.linkedin.com/in/alvihossain', 'https://github.com/AlviHossain97']);
    expect(JSON.stringify(ld)).not.toMatch(/telephone|address|birthDate/i);

    const og = await request.get('/og.png');
    expect(og.status()).toBe(200);
    expect(og.headers()['content-type']).toContain('image/png');
    expect((await request.get('/robots.txt')).status()).toBe(200);
    const sm = await request.get('/sitemap-index.xml');
    expect(sm.status()).toBe(200);
    expect(await (await request.get('/sitemap-0.xml')).text()).not.toContain('og-card');
  });

  test('the og-card build helper is not shipped', async ({ request }) => {
    expect((await request.get('/og-card/')).status()).toBe(404);
  });
});

test.describe('print', () => {
  test('print media shows only the compact CV', async ({ page }) => {
    await page.goto('/');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.print-cv')).toBeVisible();
    await expect(page.locator('main')).toBeHidden();
    await expect(page.locator('.site-header')).toBeHidden();
    await expect(page.locator('.print-cv')).toContainText('Head of Research & Development');
  });
});
