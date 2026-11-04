// Runs after `astro build`. Generates, from the built site (and so from src/data/cv.ts):
//   dist/<pdfFile>  the CV PDF (the page's print stylesheet, rendered by headless Chromium)
//   dist/og.png     the 1200x630 social card
// Then removes dist/og-card, which exists only to be screenshotted.
import { createServer } from 'node:http';
import { readFile, rm, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { findIssues } from './privacy-rules.mjs';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const TYPES = {
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.ico': 'image/x-icon',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.woff2': 'font/woff2',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
};

const server = createServer(async (req, res) => {
  try {
    let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '');
    let file = join(dist, p);
    if (!file.startsWith(dist)) throw new Error('outside dist');
    if ((await stat(file).catch(() => null))?.isDirectory()) file = join(file, 'index.html');
    else if (!(await stat(file).catch(() => null))) file = join(dist, p, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
try {
  const html = await readFile(join(dist, 'index.html'), 'utf8');
  // The PDF name comes from cv.site.pdfFile via the download link the page renders.
  const PDF_FILE = /href="\/([^"/]+\.pdf)"/.exec(html)?.[1];
  if (!PDF_FILE) throw new Error('index.html has no PDF download link');

  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  // Any failed or 4xx/5xx request (missing font, CSS, page) would silently degrade the PDF / OG image: fail instead.
  const bad = [];
  page.on('response', (r) => r.status() >= 400 && bad.push(`${r.status()} ${r.url()}`));
  page.on('requestfailed', (r) => bad.push(`failed ${r.url()}`));
  const open = async (path) => {
    const res = await page.goto(`${origin}${path}`, { waitUntil: 'networkidle' });
    if (!res?.ok()) throw new Error(`postbuild: ${path} returned ${res?.status()}`);
    await page.evaluate(() => document.fonts.ready);
  };

  await open('/og-card/');
  await page.screenshot({ path: join(dist, 'og.png') });

  await page.setViewportSize({ width: 1280, height: 900 });
  await open('/cv/');
  await page.emulateMedia({ media: 'print' });
  await page.pdf({
    path: join(dist, PDF_FILE),
    preferCSSPageSize: true,
    printBackground: false,
    tagged: true,
    outline: true,
  });
  if (bad.length) throw new Error(`postbuild: assets failed to load: ${bad.join(', ')}`);

  // The PDF is the .print-cv block: run the privacy / content rules over exactly that text.
  const printed = await page.locator('.print-cv').evaluate((el) => el.textContent ?? '');
  const issues = findIssues(printed);
  if (issues.length)
    throw new Error(`postbuild: privacy rules matched the CV text: ${issues.map((i) => i.rule).join(', ')}`);

  const raw = await readFile(join(dist, PDF_FILE), 'latin1');
  const count = /\/Type\s*\/Pages\b[^>]*?\/Count\s+(\d+)/.exec(raw)?.[1];
  const pages = count ? Number(count) : (raw.match(/\/Type\s*\/Page\b(?!s)/g)?.length ?? 0);
  if (pages < 1 || pages > 2) throw new Error(`CV PDF has ${pages} pages; the print stylesheet should give 1-2`);
  console.log(`postbuild: ${pages}-page PDF`);
  console.log(`postbuild: wrote dist/${PDF_FILE} and dist/og.png`);
} finally {
  await browser.close();
  server.close();
  await rm(join(dist, 'og-card'), { recursive: true, force: true });
}
