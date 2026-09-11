/**
 * Captures screen evidence.
 * Start the server first: `npm run build && npm run preview -- --port 4321`.
 *
 *   node scripts/screenshots.mjs <output directory>
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const OUT = process.argv[2] ?? 'screenshots';
const BASE = 'http://localhost:4321/llm-visual-lab';

// The article is the home page.
const PAGES = [
  ['article', '/ko/'],
  ['article-en', '/en/'],
];

/** The article is one page, so each section gets a shot of its own too */
const SECTIONS = [
  'problem', 'big-picture', 'numbers', 'similarity', 'proportion', 'attention',
  'multi-head', 'positions', 'blocks', 'training', 'generation', 'results',
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();

for (const [theme, dark] of [
  ['light', false],
  ['dark', true],
]) {
  for (const [width, label] of [
    [1440, 'desktop'],
    [390, 'mobile'],
  ]) {
    const ctx = await browser.newContext({
      viewport: { width, height: 1000 },
      colorScheme: dark ? 'dark' : 'light',
      deviceScaleFactor: 2,
    });
    const page = await ctx.newPage();
    for (const [name, path] of PAGES) {
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${OUT}/${name}-${label}-${theme}.png` });
    }
    // One shot per section, from the Korean article
    await page.goto(BASE + '/ko/', { waitUntil: 'networkidle' });
    for (const id of SECTIONS) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      await page.waitForTimeout(350);
      await page.screenshot({ path: `${OUT}/sec-${id}-${label}-${theme}.png` });
    }
    await ctx.close();
  }
}

await browser.close();
console.log(`saved to ${OUT}`);
