import { expect, test, type Page } from '@playwright/test';
import { findIssues } from '../../scripts/privacy-rules.mjs';

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
    await expect(page.locator('.hero-role')).toHaveText('Head of Research & Development');
    const glance = page.locator('#glance');
    await expect(glance).toContainText('MSc Advanced Computer Science');
    await expect(glance).toContainText('First-Class BSc (Hons) Computer Science');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500); // lazy hero field
    expect(errors).toEqual([]);
  });

  test('the CV block is not duplicated on the main page', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.print-cv')).toHaveCount(0);
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
    for (const path of ['/', '/cv/']) {
      await page.goto(path);
      const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href') ?? ''));
      const external = hrefs.filter((h) => /^(https?:|mailto:)/.test(h));
      expect(external.length, path).toBeGreaterThan(0);
      for (const h of external) {
        expect(h, `${path} ${h}`).toMatch(
          /^(mailto:alvi997@outlook\.com|https:\/\/(www\.)?linkedin\.com\/in\/alvihossain|https:\/\/github\.com\/AlviHossain97)/,
        );
      }
    }
  });

  test('every in-page link resolves to a real element id', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const broken = await page.evaluate(() => {
      const bad: string[] = [];
      for (const a of document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]')) {
        const id = decodeURIComponent((a.getAttribute('href') ?? '').slice(1));
        if (!id || /^timeline\/\w+$/.test(id)) continue; // timeline filter links are handled by the island
        if (!document.getElementById(id)) bad.push(id);
      }
      return bad;
    });
    expect(broken).toEqual([]);
  });

  test('no skill is labelled as "not linked yet"', async ({ page }) => {
    await page.goto('/');
    expect((await page.content()).toLowerCase()).not.toContain('not linked yet');
    expect((await page.content()).toLowerCase()).not.toContain('not yet tied');
  });

  test('page HTML passes the shared privacy rules', async ({ page }) => {
    for (const path of ['/', '/cv/']) {
      await page.goto(path);
      const html = await page.evaluate(() => document.documentElement.outerHTML);
      expect(findIssues(html), path).toEqual([]);
    }
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

  test('the CV link opens the /cv route', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('navigation', { name: 'Sections' }).getByRole('link', { name: 'CV' }).click();
    await expect(page).toHaveURL(/\/cv\/$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Alvi Hossain' })).toBeVisible();
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
    expect(await tl.locator('.tl-item').count()).toBe(14);

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
    await expect(page.locator('#panel-learnthrive-rd')).toContainText('Claude Code');
    await page.keyboard.press('Space');
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  test('collapsed panels are not reachable by keyboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#panel-data-pipeline .panel-inner')).toHaveAttribute('inert', '');
  });

  test('featured projects link to their case study instead of repeating it', async ({ page }) => {
    await page.goto('/');
    for (const id of ['learnthrive-platform', 'cirquon', 'pistation']) {
      const item = page.locator(`#timeline #${id}`);
      await expect(item.getByRole('link', { name: 'Read the case study' })).toHaveAttribute('href', `#case-${id}`);
      await expect(item.locator('.tl-toggle[aria-expanded]')).toHaveCount(0);
    }
  });

  test('the same sentence is not printed in both the timeline and a case study', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const dupes = await page.evaluate(() => {
      const text = (sel: string) =>
        [...document.querySelectorAll(sel)].map((n) => (n.textContent ?? '').trim().replace(/\s+/g, ' '));
      const timeline = new Set(text('#timeline .tl-summary, #timeline .bullets li'));
      return text('#projects .case-sum, #projects .bullets li, #projects .case-more dd').filter(
        (t) => t.length > 20 && timeline.has(t),
      );
    });
    expect(dupes).toEqual([]);
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
    await page.goto('/#data-pipeline');
    await expect(page.locator('#btn-data-pipeline')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#data-pipeline')).toBeInViewport({ ratio: 0.3 });
  });

  test('deep link: an entry hidden by the filter resets the filter', async ({ page }) => {
    await page.goto('/#timeline/education');
    await page.evaluate(() => (location.hash = '#data-pipeline'));
    await expect(page.locator('#data-pipeline')).toBeVisible();
    await expect(page.locator('#timeline .filters').getByRole('button', { name: /^All/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

test.describe('projects', () => {
  test('each case study has a diagram and a "more detail" disclosure', async ({ page }) => {
    await page.goto('/');
    const c = page.locator('#case-learnthrive-platform');
    await expect(c.locator('.diagram')).toHaveCount(1);
    await expect(c.locator('details')).not.toHaveAttribute('open', '');
    await c.locator('summary').click();
    await expect(c.locator('details')).toHaveAttribute('open', '');
    for (const t of ['My role', 'Outcome']) await expect(c.getByText(t, { exact: true })).toBeVisible();
  });

  test('diagrams have an accessible description', async ({ page }) => {
    await page.goto('/');
    for (const id of ['learnthrive-platform', 'cirquon', 'pistation']) {
      const group = page.locator(`#case-${id} .diagram`);
      await expect(group).toHaveAttribute('aria-labelledby', `dg-${id}-t`);
      expect(((await page.locator(`#dg-${id}-t`).textContent()) ?? '').length).toBeGreaterThan(80);
    }
  });

  test('featured projects appear in the briefed order', async ({ page }) => {
    await page.goto('/');
    const titles = await page.locator('#projects .case h3').allTextContents();
    expect(titles.map((t) => t.trim())).toEqual(['LearnThrive platform', 'Cirquon', 'PiStation']);
  });

  test('deep link: #case-<id> opens the case study', async ({ page }) => {
    await page.goto('/#case-pistation');
    await expect(page.locator('#case-pistation details')).toHaveAttribute('open', '');
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

  test('every skill has a real element id, and linked skills are buttons', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const bad = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('#skills [id^="skill-"]')].map((e) => e.id);
      const tagLinks = [...document.querySelectorAll<HTMLAnchorElement>('a[href^="#skill-"]')].map((a) =>
        a.getAttribute('href')!.slice(1),
      );
      return {
        count: ids.length,
        missing: tagLinks.filter((id) => !ids.includes(id) && id !== 'skill-evidence-title'),
      };
    });
    expect(bad.count).toBeGreaterThan(20);
    expect(bad.missing).toEqual([]);
  });

  test('deep link: #skill-<id> selects the skill', async ({ page }) => {
    await page.goto('/#skill-playwright');
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
    await page.getByRole('button', { name: /Switch to dark theme/ }).click();
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
  test('reduced motion: fully static, nothing hidden, no WebGL field, control explains why', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    await expect(page.locator('.hero-field')).toHaveAttribute('data-ready', 'false');
    await expect(page.locator('.hero-field *')).toHaveCount(0);
    const style = await page.evaluate(() => {
      const c = document.querySelector('.hero-name .c')!;
      const tile = document.querySelector('.tile')!;
      return {
        anim: getComputedStyle(c).animationName,
        transform: getComputedStyle(c).transform,
        tileOpacity: getComputedStyle(tile).opacity,
        counter: document.querySelector('[data-count="75"]')?.textContent,
      };
    });
    expect(style.anim).toBe('none');
    expect(style.transform).toBe('none');
    expect(style.tileOpacity).toBe('1');
    expect(style.counter).toBe('75');
    const toggle = page.locator('[data-motion-toggle]');
    await expect(toggle).toBeDisabled();
    await expect(toggle).toContainText('Animation off');
    await ctx.close();
  });

  test('Pause animation stops the field and the page animation, and the choice persists', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'on');
    await expect(page.locator('.hero-field')).toHaveAttribute('data-ready', 'true', { timeout: 10_000 });
    const toggle = page.getByRole('button', { name: 'Pause animation' });
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    await expect(page.locator('.hero-field')).toHaveAttribute('data-ready', 'false');
    await expect(page.getByRole('button', { name: 'Play animation' })).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    await expect(page.locator('.hero-field *')).toHaveCount(0);
  });

  test('the 3D chunk is requested only after the page has loaded', async ({ page }) => {
    let loaded = false;
    const early: string[] = [];
    const later: string[] = [];
    page.on('request', (r) => {
      if (!/StreamConvergenceBackground/.test(r.url())) return;
      (loaded ? later : early).push(r.url());
    });
    page.once('load', () => (loaded = true));
    await page.goto('/');
    await expect(page.locator('.hero-field')).toHaveAttribute('data-ready', 'true', { timeout: 10_000 });
    expect(early, 'requested before the load event').toEqual([]);
    expect(later.length).toBeGreaterThan(0);
  });

  test('the hero field makes no third-party requests (no CDN, no iframe)', async ({ page, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    const foreign: string[] = [];
    page.on('request', (r) => {
      const url = r.url();
      if (/^(data|blob|about):/.test(url) || url.startsWith(origin)) return;
      foreign.push(url);
    });
    await page.goto('/');
    await expect(page.locator('.hero-field')).toHaveAttribute('data-ready', 'true', { timeout: 10_000 });
    await page.waitForTimeout(2500);
    await expect(page.locator('iframe')).toHaveCount(0);
    expect(foreign).toEqual([]);
  });

  test('Save-Data keeps the static poster', async ({ browser }) => {
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => {
      Object.defineProperty(navigator, 'connection', { value: { saveData: true }, configurable: true });
    });
    const page = await ctx.newPage();
    await page.goto('/');
    await page.waitForTimeout(1500);
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');
    await expect(page.locator('.hero-field *')).toHaveCount(0);
    await ctx.close();
  });

  test('without WebGL the poster stays and the page works', async ({ browser }) => {
    const ctx = await browser.newContext();
    await ctx.addInitScript(() => {
      const orig = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        return /webgl/.test(type) ? null : (orig as (...a: unknown[]) => unknown).call(this, type, ...rest);
      } as typeof orig;
    });
    const page = await ctx.newPage();
    const errors = collectErrors(page);
    await page.goto('/');
    await page.waitForTimeout(1800);
    await expect(page.locator('.hero-field *')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: 'Alvi Hossain' })).toBeVisible();
    expect(errors).toEqual([]);
    await ctx.close();
  });

  test('counters finish on the real numbers', async ({ page }) => {
    await page.goto('/');
    await page.locator('#glance').scrollIntoViewIfNeeded();
    await page.waitForTimeout(1900);
    await expect(page.locator('[data-count="75"]')).toHaveText('75');
    await expect(page.locator('[data-count="20"]')).toHaveText('20');
    await expect(page.locator('[data-count="5"]')).toHaveText('5');
  });

  test('the timeline rail is drawn as you scroll, and fully drawn with reduced motion', async ({ page, browser }) => {
    await page.goto('/');
    const read = () =>
      page
        .locator('#timeline .tl-list')
        .first()
        .evaluate((el) => (el as HTMLElement).style.getPropertyValue('--progress'));
    await page.locator('#timeline').scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -400));
    await page.waitForTimeout(300);
    const early = Number(await read());
    await page.evaluate(() => window.scrollBy(0, 1400));
    await page.waitForTimeout(300);
    const late = Number(await read());
    expect(late).toBeGreaterThan(early);
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const p2 = await ctx.newPage();
    await p2.goto('/');
    await p2.waitForTimeout(500);
    expect(
      await p2
        .locator('#timeline .tl-list')
        .first()
        .evaluate((el) => (el as HTMLElement).style.getPropertyValue('--progress')),
    ).toBe('1');
    await ctx.close();
  });
});

test.describe('hero legibility over the animated field', () => {
  // Samples the real pixels behind each piece of hero text (text hidden, field running) over several frames,
  // then compares the brightest (dark theme) or darkest (light theme) background pixel with the text's own colour.
  for (const scheme of ['dark', 'light'] as const) {
    test(`text contrast over the field, ${scheme}`, async ({ browser }) => {
      const ctx = await browser.newContext({ colorScheme: scheme, viewport: { width: 1280, height: 800 } });
      const page = await ctx.newPage();
      await page.goto('/');
      await expect(page.locator('.hero-field')).toHaveAttribute('data-ready', 'true', { timeout: 10_000 });
      await page.waitForTimeout(1500);
      const targets = [
        { sel: '.hero-name', min: 3 },
        { sel: '.hero-role', min: 3 },
        { sel: '.hero-lede', min: 4.5 },
      ];
      // Collect each target's text rectangle and real text luminance before hiding the text.
      const info = await page.evaluate(
        (sels) => {
          const lin = (v: number) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
          const probe = document.createElement('canvas');
          probe.width = probe.height = 1;
          const g = probe.getContext('2d')!;
          return sels.map((sel) => {
            const el = document.querySelector(sel)!;
            const r = document.createRange();
            r.selectNodeContents(el);
            const b = r.getBoundingClientRect();
            g.clearRect(0, 0, 1, 1);
            g.fillStyle = getComputedStyle(el).color;
            g.fillRect(0, 0, 1, 1);
            const [R, G, B] = g.getImageData(0, 0, 1, 1).data;
            return {
              sel,
              box: { x: b.x, y: b.y, width: b.width, height: b.height },
              textL: 0.2126 * lin(R!) + 0.7152 * lin(G!) + 0.0722 * lin(B!),
            };
          });
        },
        targets.map((t) => t.sel),
      );
      await page.addStyleTag({ content: '.hero .container *{color:transparent!important;text-shadow:none!important}' });
      const dark = scheme === 'dark';
      for (const t of targets) {
        const { box, textL } = info.find((i) => i.sel === t.sel)!;
        let worst = dark ? 0 : 1;
        for (let frame = 0; frame < 6; frame++) {
          const png = await page.screenshot({ clip: box });
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
          await page.waitForTimeout(300);
        }
        const ratio = dark ? (textL + 0.05) / (worst + 0.05) : (worst + 0.05) / (textL + 0.05);
        expect(ratio, `${t.sel} (${scheme}) worst-case contrast ${ratio.toFixed(2)}`).toBeGreaterThanOrEqual(t.min);
      }
      await ctx.close();
    });
  }
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
    expect((await request.get('/sitemap-index.xml')).status()).toBe(200);
    const sitemap = await (await request.get('/sitemap-0.xml')).text();
    expect(sitemap).not.toContain('og-card');
    expect(sitemap).not.toContain('/cv');
  });

  test('/cv is a separate, noindex, printable route', async ({ page }) => {
    await page.goto('/cv/');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    await expect(page.locator('.print-cv')).toContainText('Head of Research & Development');
    await expect(page.locator('.print-cv')).toContainText('Technical skills');
  });

  test('the og-card build helper is not shipped', async ({ request }) => {
    expect((await request.get('/og-card/')).status()).toBe(404);
  });
});

test.describe('print', () => {
  test('printing /cv shows only the CV, without the toolbar', async ({ page }) => {
    await page.goto('/cv/');
    await page.emulateMedia({ media: 'print' });
    await expect(page.locator('.print-cv')).toBeVisible();
    await expect(page.locator('.cv-bar')).toBeHidden();
  });
});
