// Runs after `astro build`. Generates, from the built site (and so from src/data/cv.ts):
//   dist/<pdfFile>  the CV PDF (the page's print stylesheet, rendered by headless Chromium)
//   dist/og.png     the 1200x630 social card
// Then removes dist/og-card, which exists only to be screenshotted.
import { createServer } from 'node:http';
import { readFile, rm, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

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
  await page.goto(`${origin}/og-card/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(dist, 'og.png') });

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${origin}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: join(dist, PDF_FILE), preferCSSPageSize: true, printBackground: false, tagged: true, outline: true });
  console.log(`postbuild: wrote dist/${PDF_FILE} and dist/og.png`);
} finally {
  await browser.close();
  server.close();
  await rm(join(dist, 'og-card'), { recursive: true, force: true });
}
