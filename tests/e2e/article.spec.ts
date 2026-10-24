import { expect, test, type Page } from '@playwright/test';
import { GROUPS, SECTIONS } from '../../src/lib/nav';

/**
 * The home page: the article that builds a small next-word machine chapter by chapter.
 * Every number on it is computed by src/lib/math/story.ts; these checks pin the ones the
 * prose leans on, in both languages.
 */

const IDS = SECTIONS.map(s => s.id);
const probabilities = (page: Page, bars: string) =>
  page.locator(`[data-story-bars="${bars}"] [data-story-probability]`).allTextContents();

for (const locale of ['ko', 'en'] as const) {
  const ko = locale === 'ko';
  test.describe(`${locale}: the next-word machine article`, () => {
    test('seven chapters in three stages, each with a closed check', async ({ page }) => {
      await page.goto(`${locale}/`);
      await expect(page.locator('main h1')).toHaveText(ko ? '눈으로 이해하는 LLM 원리' : 'LLM Principles, Visually Explained');
      expect(await page.locator('[data-section]').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.section))).toEqual(IDS);
      const groups = page.locator('#doc-nav .toc__group');
      await expect(groups.locator('.toc__group-title')).toHaveText(GROUPS.map(g => g.title[locale]));
      await expect(groups.locator('.toc__count')).toHaveText(ko ? ['2 단원', '2 단원', '3 단원'] : ['2 units', '2 units', '3 units']);
      expect(await page.locator('#doc-nav [data-section-link]').evaluateAll(els => els.map(e => (e as HTMLElement).dataset.sectionLink))).toEqual(IDS);
      await expect(page.locator('#doc-nav [data-section-link] .toc__num')).toHaveText(IDS.map((_, i) => String(i + 1)));
      const checks = page.locator('[data-lesson-check]');
      await expect(checks).toHaveCount(IDS.length);
      expect(await checks.evaluateAll(els => els.filter(e => (e as HTMLDetailsElement).open).length)).toBe(0);
    });

    test('the opening game: the first word flips the favourite, appending recomputes, the end marker stops', async ({ page }) => {
      await page.goto(`${locale}/`);
      const game = page.locator('.lab--story-opening');
      const top = game.locator('li[data-top="true"]');
      await expect(game).toHaveAttribute('data-story-ids', '0,2');
      await expect(top).toHaveAttribute('data-word', '3');
      await expect(top.locator('[data-story-probability]')).toHaveText('88.1%');

      const first = game.getByRole('group', { name: ko ? '첫 단어' : 'First word' }).getByRole('button');
      await first.nth(1).click();
      await expect(first.nth(1)).toHaveAttribute('aria-pressed', 'true');
      await expect(game).toHaveAttribute('data-story-ids', '1,2');
      await expect(top).toHaveAttribute('data-word', '4');
      await expect(top.locator('[data-story-probability]')).toHaveText('88.1%');

      await game.locator('[data-story-advance]').click();
      await expect(game).toHaveAttribute('data-story-ids', '1,2,4');
      await expect(top).toHaveAttribute('data-word', '5');
      await expect(top.locator('[data-story-probability]')).toHaveText('97.1%');
      await expect(game.locator('[data-story-advance]')).toHaveText(ko ? '끝에서 멈추기' : 'Stop at the end marker');

      await game.locator('[data-story-advance]').click();
      await expect(game).toHaveAttribute('data-finished', 'true');
      await expect(game.getByRole('status')).toContainText('97.1%');
      await game.locator('[data-story-restart]').click();
      await expect(game).toHaveAttribute('data-finished', 'false');
      await expect(game).toHaveAttribute('data-story-ids', '1,2');
    });

    test('results stay in the text, calculations wait in closed folds', async ({ page }) => {
      await page.goto(`${locale}/`);
      const folds = page.locator('main details.expand');
      expect(await folds.evaluateAll(els => els.filter(e => (e as HTMLDetailsElement).open).length)).toBe(0);
      // The tie is said in words next to its bars; the arithmetic behind it is folded.
      await expect(page.locator('[data-story-verdict]')).toBeVisible();
      await expect(page.locator('[data-story-verdict]')).toContainText('31.7%');
      for (const calculation of ['[data-story-table="readout"]', '[data-story-score]', '[data-story-match]', '[data-story-table="untrained"]', '[data-story-gradient]']) {
        await expect(page.locator(calculation).first(), calculation).toBeHidden();
      }
      for (const result of ['[data-story-bars="last-word"]', '[data-story-attention="flow"]', '[data-story-bars="after-attention"]', '[data-story-bars="after-learning"]']) {
        await expect(page.locator(result).first(), result).toBeVisible();
      }
    });

    test('the numbers the prose relies on', async ({ page }) => {
      await page.goto(`${locale}/`);
      // Chapter 3: from the last word alone the two verbs tie, and both are marked.
      const lastWord = page.locator('[data-story-bars="last-word"]');
      await expect(lastWord).toHaveCount(2);
      for (const bars of await lastWord.all()) {
        await expect(bars.locator('li[data-top="true"]')).toHaveCount(2);
        await expect(bars.locator('li[data-word="3"] [data-story-probability]')).toHaveText('31.7%');
        await expect(bars.locator('li[data-word="4"] [data-story-probability]')).toHaveText('31.7%');
      }
      // Chapter 4: match scores, shares, the taken and the new values.
      await expect(page.locator('[data-story-match]')).toHaveText([/= 3$/, /= 0$/]);
      await expect(page.locator('[data-story-share]')).toHaveText(['89.3%', '10.7%']);
      await expect(page.locator('[data-story-vector="taken"] b')).toHaveText(['0.893', '0', '0.107', '0']);
      await expect(page.locator('[data-story-vector="mixed"] b')).toHaveText(['0.893', '0', '1.107', '0']);
      const after = page.locator('[data-story-bars="after-attention"]');
      await expect(after.nth(0).locator('li[data-top="true"]')).toHaveAttribute('data-word', '3');
      await expect(after.nth(1).locator('li[data-top="true"]')).toHaveAttribute('data-word', '4');
      await expect(after.locator('li[data-top="true"] [data-story-probability]')).toHaveText(['88.1%', '88.1%']);
      await expect(page.locator('[data-story-gain]')).toHaveText([/31\.7%.*88\.1%/, /31\.7%.*88\.1%/]);
      // Chapter 4, last part: each position reads only itself and earlier words.
      await expect(page.locator('[data-story-mask] [data-mask="hidden"]')).toHaveCount(3);
      // Chapter 5: greedy, the temperature table and the loop that stops at the end marker.
      await expect(page.locator('[data-story-expected]')).toHaveText([/88/, /5/, /2/]);
      await expect(page.locator('[data-temperature="1"] td')).toHaveText(['88.1%', '4.9%', '2.5%']);
      await expect(page.locator('[data-story-chosen]')).toHaveText(ko ? ['갔다', '끝'] : ['went', 'end']);
      // Chapter 6: training pairs, then one step on the untrained score table.
      await expect(page.locator('[data-story-pair-probability]')).toHaveText(['1.8%', '88.1%', '97.1%']);
      expect(await probabilities(page, 'before-learning')).toEqual(expect.arrayContaining(['37.9%']));
      await expect(page.locator('[data-story-bars="before-learning"] li[data-top="true"]')).toHaveCount(2);
      await expect(page.locator('[data-story-bars="after-learning"] li[data-word="3"] [data-story-probability]')).toHaveText('50.0%');
      await expect(page.locator('[data-story-loss]')).toContainText('0.970 → 0.692');
    });

    test('links to the walkthrough, lab and paper land on a real section', async ({ page }) => {
      await page.goto(`${locale}/`);
      const links = await page.locator('.lesson-more a').evaluateAll(els => els.map(e => (e as HTMLAnchorElement).href));
      expect(links.length).toBeGreaterThanOrEqual(IDS.length);
      const byPage = new Map<string, string[]>();
      for (const href of links) {
        const url = new URL(href);
        byPage.set(url.pathname, [...(byPage.get(url.pathname) ?? []), decodeURIComponent(url.hash.slice(1))]);
      }
      expect([...byPage.keys()].map(path => path.split('/').at(-2)).sort()).toEqual(['lab', 'paper', 'walkthrough']);
      for (const [path, ids] of byPage) {
        await page.goto(new URL(path, page.url()).href);
        for (const id of ids) await expect(page.locator(`[id="${id}"]`), `${path}#${id}`).toHaveCount(1);
      }
    });

    test('old anchors forward to the page that now holds them', async ({ page }) => {
      for (const [id, doc] of [['problem', 'paper'], ['math-sum', 'lab'], ['numbers', 'walkthrough'], ['multi-head', 'walkthrough'], ['big-picture', 'walkthrough']]) {
        await page.goto(`${locale}/#${id}`);
        await page.waitForURL(new RegExp(`/${locale}/${doc}/#${id}$`));
        await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
      }
      // Anchors the article still has stay on it, including the two former chapters it absorbed.
      for (const id of ['similarity', 'positions', 'blocks']) {
        await page.goto(`${locale}/#${id}`);
        await expect(page).toHaveURL(new RegExp(`/${locale}/#${id}$`));
        await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
      }
    });

    test('no figure is wider than the page, at 390px or at 280px with 200% text', async ({ page }) => {
      for (const [width, scale] of [[390, 1], [280, 2]]) {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(`${locale}/`);
        await page.evaluate(s => {
          document.documentElement.style.fontSize = `${s * 100}%`;
          // The folded calculations have to fit as well.
          for (const fold of document.querySelectorAll('main details')) (fold as HTMLDetailsElement).open = true;
        }, scale);
        const scroll = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(scroll, `${width}px × ${scale}`).toBeLessThanOrEqual(1);
        // Tables may scroll inside their own region; nothing else may stick out of its figure.
        const sticking = await page.locator('.story').evaluateAll(stories => stories.flatMap(story => {
          const right = story.getBoundingClientRect().right + 1;
          return [...story.querySelectorAll('*')]
            .filter(el => !el.closest('.story-table-wrap') && el.getBoundingClientRect().right > right)
            .map(el => `${el.tagName}.${el.className}: ${el.textContent?.slice(0, 20)}`);
        }));
        expect(sticking, `${width}px × ${scale}`).toEqual([]);
      }
    });
  });
}

test.describe('the article without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('every figure and the opening probabilities are already in the page', async ({ page }) => {
    await page.goto('ko/');
    const game = page.locator('.lab--story-opening');
    await expect(game.locator('li[data-top="true"] [data-story-probability]')).toHaveText('88.1%');
    await expect(page.locator('[data-story-share]')).toHaveText(['89.3%', '10.7%']);
    await expect(page.locator('[data-story-pair-probability]')).toHaveText(['1.8%', '88.1%', '97.1%']);
    const text = await page.locator('main').evaluate(el => (el as HTMLElement).innerText);
    expect(text).not.toContain('**');
    expect(text).not.toContain('$$');
  });
});

test('both languages show the same numbers', async ({ page }) => {
  const numbers = async (locale: string) => {
    await page.goto(`${locale}/`);
    return page.locator([
      '[data-story-probability]', '[data-story-share]', '.story-vector b', '[data-story-table] td', '[data-story-words] td',
      '[data-story-temperature] td', '[data-story-pair-probability]', '[data-story-pair-loss]', '.story__eq',
    ].join(', ')).allTextContents().then(texts => texts.map(text => (text.match(/[−-]?\d+(?:\.\d+)?%?/g) ?? []).join(' ')));
  };
  const ko = await numbers('ko');
  expect(ko.length).toBeGreaterThan(100);
  expect(await numbers('en')).toEqual(ko);
});
