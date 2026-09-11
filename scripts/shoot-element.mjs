import { chromium } from '@playwright/test';
const [out, url, selector, ...steps] = process.argv.slice(2);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: Number(process.env.W || 1440), height: 1200 }, colorScheme: process.env.THEME === 'dark' ? 'dark' : 'light', deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
for (const s of steps) {
  const [action, target] = s.split('::');
  if (action === 'click') await page.locator(target).first().click();
  if (action === 'wait') await page.waitForTimeout(Number(target));
}
await page.waitForTimeout(300);
await page.locator(selector).first().screenshot({ path: out });
await browser.close();
console.log('ok', out);
