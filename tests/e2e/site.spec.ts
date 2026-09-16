import { expect, test, type Page } from '@playwright/test';
import { READY_COUNT } from '../../src/lib/curriculum';

/**
 * Browser checks.
 *
 * These run against the build, served under `/llm-visual-lab/` exactly as
 * GitHub Pages does — not against the dev server. That is what catches the
 * problems which only appear after deployment: links missing the base path,
 * assets that 404.
 *
 * The whole article is one page, so four labs share a single DOM. Every
 * lab selector **must** therefore be scoped under `.lab--*`; without that it
 * picks up the identically named element in a different lab.
 *
 * Note: assertions that match on-screen text keep the Korean wording, because
 * that is what the Korean page actually renders.
 */

// The article is the home page. There is no separate landing page.
const ARTICLE_KO = 'ko/';
const ARTICLE_EN = 'en/';
const ALL_PAGES = [ARTICLE_KO, ARTICLE_EN];
const BASE = 'http://localhost:4321/llm-visual-lab/';

/** Must be in the same order as src/lib/nav.ts */
const SECTION_IDS = [
  'problem',
  'big-picture',
  'numbers',
  'similarity',
  'proportion',
  'attention',
  'multi-head',
  'positions',
  'blocks',
  'training',
  'generation',
  'results',
];
// Every section is written now. These stay so that adding a placeholder later
// only means moving the split, not rewriting the checks.
const WRITTEN_IDS = SECTION_IDS;
const PLANNED_IDS: string[] = [];

/** Collects failed requests and console errors for a page. */
function watchFailures(page: Page) {
  const failures: string[] = [];
  page.on('response', (r) => {
    if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
  });
  page.on('console', (m) => {
    if (m.type() === 'error') failures.push(`console: ${m.text()}`);
  });
  page.on('pageerror', (e) => failures.push(`pageerror: ${e.message}`));
  return failures;
}

test.describe('deployment paths and assets', () => {
  for (const path of ALL_PAGES) {
    test(`opens directly with no 404s: /${path}`, async ({ page }) => {
      const failures = watchFailures(page);
      const res = await page.goto(path, { waitUntil: 'networkidle' });
      expect(res?.status(), `/${path} status code`).toBe(200);
      await expect(page.locator('main h1')).toBeVisible();
      expect(failures, `failed requests on /${path}`).toEqual([]);
    });
  }

  test('the root path sends you to the default language', async ({ page }) => {
    await page.goto('./');
    await page.waitForURL(/\/llm-visual-lab\/ko\/$/, { timeout: 10_000 });
    await expect(page.locator('main h1')).toContainText('Attention Is All You Need');
  });

  test('the KaTeX fonts and styles all load', async ({ page }) => {
    const failures = watchFailures(page);
    await page.goto(ARTICLE_KO, { waitUntil: 'networkidle' });

    // KaTeX keeps the original TeX in a MathML annotation, for accessibility
    // and for copying. Finding TeX in textContent is normal, so check what is
    // actually rendered instead.
    await expect(page.locator('.katex-display').first()).toBeVisible();
    await expect(page.locator('.katex-display .katex-html').first()).toBeVisible();

    const visibleText = await page.locator('main').evaluate((el) => (el as HTMLElement).innerText);
    expect(visibleText, 'the $$ delimiters must not show in the prose').not.toContain('$$');

    const fontsLoaded = await page.evaluate(() =>
      document.fonts ? document.fonts.check('16px KaTeX_Math') : true,
    );
    expect(fontsLoaded, 'the KaTeX math font has to be loaded').toBe(true);

    expect(failures).toEqual([]);
  });

  test('every internal link resolves', async ({ page, request }) => {
    const seen = new Set<string>();
    for (const path of ALL_PAGES) {
      await page.goto(path);
      const hrefs = await page
        .locator('a[href]')
        .evaluateAll((els) =>
          els.map((e) => (e as HTMLAnchorElement).href).filter((h) => h.startsWith('http://localhost')),
        );
      for (const h of hrefs) seen.add(h.split('#')[0]);
    }
    // The article is the home page, so the only internal targets are the two
    // language versions of it. The menu, the masthead and the language switch
    // all have to lead here.
    expect([...seen].sort()).toEqual([`${BASE}en/`, `${BASE}ko/`]);
    for (const url of seen) {
      const res = await request.get(url);
      expect(res.status(), `${url} has to resolve`).toBe(200);
      expect(url, `${url} has to carry the base path`).toContain('/llm-visual-lab/');
    }
  });

  test('the anchors in the contents lead to real sections', async ({ page }) => {
    await page.goto(ARTICLE_KO, { waitUntil: 'networkidle' });

    const sectionIds = await page
      .locator('#doc-nav [data-section-link]')
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.sectionLink));
    expect(sectionIds, 'one anchor per written section').toEqual(WRITTEN_IDS);

    // Every link in the contents, sub-headings included, has to point at
    // something that exists. Hangul slugs are percent-encoded in the href, so
    // decode before looking them up.
    const hashes = await page
      .locator('#doc-nav a[href*="#"]')
      .evaluateAll((els) =>
        els.map((e) => decodeURIComponent(new URL((e as HTMLAnchorElement).href).hash.slice(1))),
      );
    expect(hashes.length, 'the sub-heading anchors have to be there too').toBeGreaterThan(WRITTEN_IDS.length);
    for (const id of hashes) {
      const found = await page.evaluate((x) => !!document.getElementById(x), id);
      expect(found, `#${id} has to exist`).toBe(true);
    }
  });
});

test.describe('the single-page structure', () => {
  test('all twelve sections are present, in order', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const ids = await page
      .locator('[data-section]')
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.section));
    expect(ids).toEqual(SECTION_IDS);
  });

  test('every section is written, and none is left marked as planned', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    for (const id of PLANNED_IDS) {
      const section = page.locator(`#${id}`);
      await expect(section, `#${id} has to be marked planned`).toHaveClass(/doc-section--planned/);
      await expect(section.locator('.doc-section__pending')).toBeVisible();
    }
    for (const id of WRITTEN_IDS) {
      await expect(page.locator(`#${id}`)).not.toHaveClass(/doc-section--planned/);
    }
    // A planned section must not be a link in the contents — never send anyone nowhere.
    await expect(page.locator('#doc-nav .toc__pending')).toHaveCount(PLANNED_IDS.length);
  });

  test('no section is a stub', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    // A placeholder used to be three lines of "this will be written later". Every
    // section should now carry real prose, sub-headings and at least one figure
    // or lab — otherwise it is a stub wearing a finished section's clothes.
    const report = await page.evaluate(() =>
      [...document.querySelectorAll('[data-section]')].map((el) => ({
        id: (el as HTMLElement).dataset.section,
        words: (el.textContent ?? '').trim().length,
        subHeadings: el.querySelectorAll('h3[id]').length,
        visuals: el.querySelectorAll('.figure__frame svg, .lab').length,
      })),
    );
    for (const s of report) {
      expect(s.words, `#${s.id} is too short: ${JSON.stringify(s)}`).toBeGreaterThan(900);
      expect(s.subHeadings, `#${s.id} has no sub-headings`).toBeGreaterThan(1);
      expect(s.visuals, `#${s.id} has nothing to look at`).toBeGreaterThan(0);
    }
  });

  test('there is exactly one page title', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('main h1')).toContainText('Attention Is All You Need');
  });

  test('scrolling moves the current-section mark in the contents', async ({ page }) => {
    await page.goto(ARTICLE_KO, { waitUntil: 'networkidle' });
    const marked = () =>
      page
        .locator('#doc-nav [data-section-link][aria-current="true"]')
        .getAttribute('data-section-link');

    await page.locator('#similarity').scrollIntoViewIfNeeded();
    await expect.poll(marked, { timeout: 6000 }).toBe('similarity');

    await page.locator('#numbers').scrollIntoViewIfNeeded();
    await expect.poll(marked, { timeout: 6000 }).toBe('numbers');
  });
});

test.describe('learning path on the left, contents on the right', () => {
  test('the left rail lists only what can be read, and says the rest is in preparation', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const nav = page.locator('#course-nav');
    await expect(nav).toContainText('Attention Is All You Need');
    await expect(nav.locator('a')).toHaveCount(READY_COUNT);
    await expect(nav.locator('a[aria-current="page"]')).toHaveCount(1);

    // The follow-up topics were never scoped, ordered or scheduled, so they are
    // not listed. The group says it is in preparation instead.
    await expect(nav.locator('.sidebar__flag')).toHaveText(['준비중']);
    for (const title of ['자기회귀 언어 모델', '규모와 일반화', '최신 모델 해부']) {
      await expect(nav, `"${title}" must not be listed as if it were coming`).not.toContainText(title);
    }
    await expect(nav).not.toContainText('예정');

    await page.goto(ARTICLE_EN);
    const chip = page.locator('#course-nav .sidebar__flag');
    await expect(chip).toHaveText(['in preparation']);
    // The English label is long enough to split inside the chip; it must not.
    expect(await chip.evaluate((el) => el.getClientRects().length), 'the chip is one line').toBe(1);
    // A real space separates it from the heading, so it is not read as one word.
    expect(await page.locator('#course-nav').innerText()).toContain('WHERE IT GOES in preparation');
  });

  test('the contents opens the sub-headings of the section being read', async ({ page }) => {
    await page.goto(ARTICLE_KO, { waitUntil: 'networkidle' });

    // Only one section's sub-headings are open at a time
    await expect(page.locator('#doc-nav .toc__sublist')).toHaveCount(1);

    await page.locator('#numbers').scrollIntoViewIfNeeded();
    await expect
      .poll(() => page.locator('#doc-nav .toc__sublist').getAttribute('data-toc-sublist'), {
        timeout: 6000,
      })
      .toBe('numbers');

    const subs = await page.locator('#doc-nav .toc__sublist a').allTextContents();
    const inSection = await page
      .locator('#numbers h3[id]')
      .evaluateAll((els) => els.map((e) => e.textContent!.trim()));
    expect(subs, 'the open sub-headings must match that section\'s h3s').toEqual(inSection);

    // The sub-heading link really goes there
    const href = await page.locator('#doc-nav .toc__sublist a').last().getAttribute('href');
    const id = decodeURIComponent(href!.slice(1));
    expect(await page.evaluate((x) => !!document.getElementById(x), id)).toBe(true);

    await page.locator('#similarity').scrollIntoViewIfNeeded();
    await expect
      .poll(() => page.locator('#doc-nav .toc__sublist').getAttribute('data-toc-sublist'), {
        timeout: 6000,
      })
      .toBe('similarity');
  });

  test('without JavaScript the whole contents list remains', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(BASE + ARTICLE_KO);
    await expect(page.locator('#doc-nav .toc__link')).toHaveCount(WRITTEN_IDS.length);
    await expect(page.locator('#doc-nav .toc__pending')).toHaveCount(PLANNED_IDS.length);
    await ctx.close();
  });
});

/**
 * Figure checks.
 *
 * Seven figures share one DOM, so no two id prefixes may collide. If they do,
 * aria-labelledby points at somebody else's title and nothing on screen says so.
 */
const FIGURES = [
  { id: 'aa', section: 'problem' },
  { id: 'pld', section: 'problem' },
  { id: 'sw', section: 'problem' },
  { id: 'tmap', section: 'big-picture' },
  { id: 'sf', section: 'numbers' },
  { id: 'tf', section: 'numbers' },
  { id: 'qkv', section: 'attention' },
  { id: 'as', section: 'attention' },
  { id: 'mhs', section: 'multi-head' },
  { id: 'cs', section: 'multi-head' },
  { id: 'hb', section: 'multi-head' },
  { id: 'ffs', section: 'blocks' },
  { id: 'rp', section: 'blocks' },
  { id: 'lrc', section: 'training' },
  { id: 'gl', section: 'generation' },
  { id: 'gs', section: 'generation' },
  { id: 'pr', section: 'positions' },
  { id: 'xs', section: 'attention' },
  { id: 'be', section: 'results' },
];

/**
 * Guards against styling disappearing quietly.
 *
 * This has happened: a block of CSS rules was deleted outright and all 94
 * behaviour checks still passed, because the text still read and the buttons
 * still worked. So "is it still styled" is checked separately.
 * These assert only that a property is **not at its unstyled default**, never
 * an exact value.
 */
test.describe('the styling is still attached', () => {
  test('the key parts are not left at their unstyled defaults', async ({ page }) => {
    await page.goto(ARTICLE_KO, { waitUntil: 'networkidle' });

    const check = async (selector: string, prop: string, initial: string[]) => {
      const el = page.locator(selector).first();
      await expect(el, `${selector} has to exist`).toHaveCount(1);
      const value = await el.evaluate(
        (node, p) => getComputedStyle(node as Element).getPropertyValue(p).trim(),
        prop,
      );
      expect(initial, `${selector} should have ${prop} styled (it is ${value})`).not.toContain(
        value,
      );
      return value;
    };

    await check('.prose', 'display', ['block', 'inline']);
    await check('.doc-header__meta', 'border-top-width', ['0px']);
    expect(
      await check('.doc-header__updated', 'font-family', ['']),
      'the date has to be set in a monospaced face',
    ).toMatch(/Mono/i);
    await check('.badge__dot', 'background-color', ['rgba(0, 0, 0, 0)', 'transparent']);
    await check('.note', 'border-left-width', ['0px']);
    await check('.note__title', 'font-weight', ['400', 'normal']);
    await check('.prose blockquote', 'border-left-width', ['0px']);
    await check('.prose pre', 'background-color', ['rgba(0, 0, 0, 0)', 'transparent']);
    await check('.doc-section > table th', 'border-bottom-width', ['0px']);
    await check('.expand', 'border-left-width', ['0px']);
    await check('.site-footer', 'border-top-width', ['0px']);
    await check('.lab--attention .btn', 'border-radius', ['0px']);
    await check('.segmented', 'border-radius', ['0px']);
    await check('.toc__link', 'text-decoration-line', ['underline']);
    await check('.sidebar__link', 'text-decoration-line', ['underline']);
    await check('.figure__frame', 'border-radius', ['0px']);
  });

  test('the chosen side looks different from the unchosen one', async ({ page }) => {
    await page.goto(ARTICLE_KO, { waitUntil: 'networkidle' });
    const group = page.locator('.lab--attention .segmented').first();
    const read = (pressed: boolean) =>
      group
        .locator(`button[aria-pressed="${pressed}"]`)
        .first()
        .evaluate((el) => {
          const cs = getComputedStyle(el);
          return `${cs.backgroundColor}|${cs.fontWeight}`;
        });
    expect(await read(true), 'the chosen side must differ from the other').not.toBe(await read(false));
  });

  /**
   * Prose, figures and labs are meant to share one right edge.
   * They used to differ — the prose was held to a narrow measure while figures
   * broke out of it — and the mismatch read as an accident.
   */
  for (const width of [1440, 1280, 900]) {
    test(`the article has a single right edge at ${width}px`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(BASE + ARTICLE_KO, { waitUntil: 'networkidle' });

      const widths = await page.evaluate(() => {
        const round = (el: Element | null) =>
          el ? Math.round(el.getBoundingClientRect().width) : null;
        const para = [...document.querySelectorAll('.doc-section p')].find(
          (e) => (e.textContent ?? '').trim().length > 60,
        );
        return {
          paragraph: round(para ?? null),
          note: round(document.querySelector('.note')),
          lead: round(document.querySelector('.doc-header__lead')),
          caption: round(document.querySelector('.figure__caption')),
          figure: round(document.querySelector('.figure__frame')),
          table: round(document.querySelector('.doc-section > table')),
          lab: round(document.querySelector('.lab--attention')),
        };
      });

      const values = Object.values(widths);
      expect(values.every((v) => v !== null), `something was missing: ${JSON.stringify(widths)}`).toBe(
        true,
      );
      expect(
        new Set(values).size,
        `every one of these should be the same width: ${JSON.stringify(widths)}`,
      ).toBe(1);
      await ctx.close();
    });
  }

  test('the column never grows past its cap, however the rails fall away', async ({ browser }) => {
    // Below 60rem the rails drop and the column would otherwise get *wider* on a
    // *narrower* window, giving the longest lines on the smallest screen.
    const cap = 52.5 * 16;
    for (const width of [1440, 1100, 959, 900]) {
      const ctx = await browser.newContext({ viewport: { width, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(BASE + ARTICLE_KO);
      const main = await page.locator('.main').evaluate((el) => el.getBoundingClientRect().width);
      expect(Math.round(main), `main at ${width}px`).toBeLessThanOrEqual(cap + 1);
      await ctx.close();
    }
  });

  test('every CSS variable referenced is defined', async ({ page }) => {
    await page.goto(ARTICLE_KO, { waitUntil: 'networkidle' });
    // Rename a token without fixing its references and the value silently becomes
    // an empty string. Nothing on screen says so.
    const dangling = await page.evaluate(() => {
      const names = new Set<string>();
      for (const sheet of [...document.styleSheets]) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue;
        }
        const walk = (list: CSSRuleList) => {
          for (const rule of [...list]) {
            if ('cssRules' in rule) walk((rule as CSSGroupingRule).cssRules);
            const text = rule.cssText ?? '';
            for (const m of text.matchAll(/var\(\s*(--[\w-]+)/g)) names.add(m[1]);
          }
        };
        walk(rules);
      }
      const root = getComputedStyle(document.documentElement);
      // The ones components set inline are correctly absent from :root
      const inline = ['--heat', '--heat-ink', '--cell-w', '--cell-h', '--grid-line'];
      return [...names].filter(
        (n) => !inline.includes(n) && root.getPropertyValue(n).trim() === '',
      );
    });
    expect(dangling, 'no CSS variable may be referenced without a definition').toEqual([]);
  });
});

test.describe('figures', () => {
  for (const path of ALL_PAGES) {
    test(`figures sit in the right section and carry alt text: /${path}`, async ({ page }) => {
      await page.goto(path);
      for (const f of FIGURES) {
        const svg = page.locator(`svg[aria-labelledby="${f.id}-t ${f.id}-d"]`);
        await expect(svg, `there has to be exactly one ${f.id} figure`).toHaveCount(1);

        // A figure belongs inside the section it explains
        const inSection = await svg.evaluate(
          (el, id) => el.closest('[data-section]')?.getAttribute('data-section') === id,
          f.section,
        );
        expect(inSection, `${f.id} has to sit inside #${f.section}`).toBe(true);

        const title = (await svg.locator(`#${f.id}-t`).textContent()) ?? '';
        const desc = (await svg.locator(`#${f.id}-d`).textContent()) ?? '';
        expect(title.trim().length, `the ${f.id} title must not be empty`).toBeGreaterThan(4);
        expect(desc.trim().length, `the ${f.id} alt text is too short`).toBeGreaterThan(60);
      }
    });
  }

  test('no figure overflows its frame', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    for (const f of FIGURES) {
      const svg = page.locator(`svg[aria-labelledby="${f.id}-t ${f.id}-d"]`);
      await svg.scrollIntoViewIfNeeded();
      const over = await svg.evaluate((el) => {
        const frame = el.closest('.figure__frame') as HTMLElement;
        return el.getBoundingClientRect().width - frame.clientWidth;
      });
      expect(over, `${f.id} must not be wider than its frame`).toBeLessThanOrEqual(1);
    }
  });

  test('the figures read their numbers from the example, not from a copy', async ({ page }) => {
    await page.goto(ARTICLE_KO);

    // The two heads must really differ, or the multi-head section makes no point.
    const weights = await page.locator('.lab--heads .hp__value').allTextContents();
    expect(weights.length, 'two 3x3 grids').toBe(18);
    expect(weights.slice(0, 9).join(' '), 'the heads must not be identical').not.toBe(
      weights.slice(9).join(' '),
    );

    // Position 0 of the sinusoids is exactly 0, 1, 0, 1.
    const pe = await page.locator('.lab--position .hp__value').allTextContents();
    expect(pe.slice(0, 4)).toEqual(['0.00', '1.00', '0.00', '1.00']);

    // The BLEU scatter is the paper's own table, not a redrawing of it.
    await expect(page.locator('.lab--bleucost')).toContainText('28.4');
  });

  test('the dimensions in the figures match the worked example', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    // ShapeFlow takes its dimensions from examples.ts, so they have to agree
    // with the 3 × 4 · 4 × 2 = 3 × 2 in the prose.
    const sf = await page.locator('#sf-d').textContent();
    expect(sf).toContain('3행 4열');
    expect(sf).toContain('4행 2열');
    expect(sf).toContain('3행 2열');

    // The step names in AttentionSteps come from the same place as the rail below
    const stepNames = await page
      .locator('.lab--attention .stepper__name')
      .allTextContents()
      .catch(() => []);
    const diagram = await page.locator('#as-d').textContent();
    for (const name of ['점수', '나누기', '확률', '가중합']) {
      expect(diagram, `the figure has to use "${name}"`).toContain(name);
      if (stepNames.length > 0) {
        expect(stepNames.join(' '), `the rail has to use "${name}" too`).toContain(name);
      }
    }
  });
});

test.describe('switching between Korean and English', () => {
  test('lands on the other language version of the same document', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    await page.locator('.lang-switch').click();
    await page.waitForURL(/\/llm-visual-lab\/en\/$/);
    await expect(page.locator('#doc-nav')).toContainText('Computing it yourself');

    await page.locator('.lang-switch').click();
    await page.waitForURL(/\/llm-visual-lab\/ko\/$/);
    await expect(page.locator('#doc-nav')).toContainText('직접 계산해 보기');
  });

  test('both languages compute the same numbers', async ({ page }) => {
    const read = async (path: string) => {
      await page.goto(path);
      await page.locator('.lab--attention .stepper__chip').nth(5).click();
      return page.locator('.lab--attention .mgrid--weight .mgrid__value').allInnerTexts();
    };
    const ko = await read(ARTICLE_KO);
    const en = await read(ARTICLE_EN);
    expect(ko).toEqual(en);
    expect(ko.slice(0, 3)).toEqual(['0.045', '0.768', '0.187']);
  });

  test('both languages have the same sections', async ({ page }) => {
    const ids = async (path: string) => {
      await page.goto(path);
      return page
        .locator('[data-section]')
        .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.section));
    };
    expect(await ids(ARTICLE_KO)).toEqual(await ids(ARTICLE_EN));
  });
});

test.describe('the masthead star', () => {
  for (const path of ALL_PAGES) {
    test(`${path}: links to the repository in a new tab`, async ({ page }) => {
      await page.goto(path);
      const star = page.locator('.star-link');
      await expect(star).toBeVisible();
      await expect(star).toHaveAttribute('href', /^https:\/\/github\.com\//);
      await expect(star).toHaveAttribute('target', '_blank');
      await expect(star).toHaveAttribute('aria-label', /GitHub/);
    });
  }
});

test.describe('the big-picture walk', () => {
  // The walk is a stepped figure, not a calculation: what it must get right is
  // that the reader can move through all seven frames and that the last frame
  // shows the two kinds of probability side by side.
  const WALK = '.lab--walk';

  for (const path of ALL_PAGES) {
    test(`${path}: moves through the seven frames and ends on the two charts`, async ({ page }) => {
      await page.goto(path);
      const walk = page.locator(WALK);
      await expect(walk).toHaveCount(1);
      const chips = walk.locator('.stepper__chip');
      await expect(chips).toHaveCount(7);
      await expect(chips.nth(0)).toHaveAttribute('aria-current', 'step');

      const frameOn = walk.locator('.walk__frame[data-on="true"]');
      await expect(frameOn).toHaveCount(1);

      const next = walk.getByRole('button', { name: /다음 단계|Next step/ });
      for (let i = 1; i < 7; i++) {
        await next.click();
        await expect(chips.nth(i)).toHaveAttribute('aria-current', 'step');
      }
      await expect(next).toBeDisabled();

      // Frame 7: the vocabulary chart and the attention chart, both visible
      await expect(frameOn.locator('.walk__chart')).toHaveCount(2);
      await expect(frameOn.locator('.walk__chart[data-kind="vocab"]')).toHaveCount(1);
      await expect(frameOn.locator('.walk__chart[data-kind="attention"]')).toHaveCount(1);

      // The map lights exactly one part per frame
      await expect(walk.locator('.walk__map .walk__lit')).toHaveCount(1);

      await walk.getByRole('button', { name: /이전 단계|Previous step/ }).click();
      await expect(chips.nth(5)).toHaveAttribute('aria-current', 'step');
    });
  }
});

test.describe('the attention lab', () => {
  // Four labs share this page, so every selector is scoped under .lab--attention.
  const LAB = '.lab--attention';

  test('moves back and forth through the seven steps', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator(LAB);
    const chips = lab.locator('.stepper__chip');
    await expect(chips).toHaveCount(7);
    await expect(chips.nth(0)).toHaveAttribute('aria-current', 'step');

    for (let i = 1; i < 7; i++) {
      await lab.getByRole('button', { name: /다음 단계/ }).click();
      await expect(chips.nth(i)).toHaveAttribute('aria-current', 'step');
    }
    await expect(lab.getByRole('button', { name: /다음 단계/ })).toBeDisabled();

    await lab.getByRole('button', { name: /이전 단계/ }).click();
    await expect(chips.nth(5)).toHaveAttribute('aria-current', 'step');
  });

  test('selecting a cell opens the working for it', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator(LAB);
    await lab.locator('.stepper__chip').nth(2).click();

    // S(1,2) = 4 is 2×2 + 0×0
    await lab.locator('.mgrid--score button.mgrid__cell').nth(1).click();
    await expect(lab.locator('.terms__result')).toContainText('S(1, 2)');
    const products = await lab.locator('.terms__table tbody td:nth-child(4)').allInnerTexts();
    expect(products).toEqual(['4', '0']);
    await expect(lab.locator('.terms__running').last()).toHaveText('4');

    await lab.locator('.mgrid--score button.mgrid__cell').nth(0).click();
    await expect(lab.locator('.terms__result')).toContainText('S(1, 1)');
    await expect(lab.locator('.terms__running').last()).toHaveText('0');
  });

  test('on a wide screen, connectors are drawn to where the cell came from', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + ARTICLE_KO, { waitUntil: 'networkidle' });
    const lab = page.locator(LAB);
    await lab.locator('.stepper__chip').nth(2).click();
    await lab.locator('.mgrid--score button.mgrid__cell').nth(1).click();
    // One for the row, one for the column
    await expect(lab.locator('.connectors__line')).toHaveCount(2);
    await ctx.close();
  });

  test('on a narrow screen no connectors are drawn', async ({ browser }) => {
    // Once the matrices stack vertically a line would cut across the text, so it is suppressed.
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE + ARTICLE_KO, { waitUntil: 'networkidle' });
    const lab = page.locator(LAB);
    await lab.locator('.stepper__chip').nth(2).click();
    await lab.locator('.mgrid--score button.mgrid__cell').nth(1).click();
    await expect(lab.locator('.connectors__line')).toHaveCount(0);
    // Without the lines, the row and column highlight still has to be there
    await expect(lab.locator('.mgrid--q .mgrid__cell.is-in-row').first()).toBeVisible();
    await ctx.close();
  });

  test('changing an input moves every result with it', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator(LAB);
    await lab.locator('.stepper__chip').nth(2).click();
    const scores = () => lab.locator('.mgrid--score .mgrid__value').allInnerTexts();
    expect(await scores()).toEqual(['0', '4', '2', '4', '0', '2', '2', '2', '2']);

    await lab.locator('.lab__inputs > summary').click();
    const cell = lab.locator('.lab__inputs .emat--input input').first();
    await cell.fill('3');
    await cell.blur();

    // Setting X(1,1) to 3 makes q₁ = (4, 0), so S(1,2) goes from 4 to 8
    expect((await scores())[1]).toBe('8');
  });

  test('resetting returns to the starting values and the first step', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator(LAB);
    await lab.locator('.stepper__chip').nth(3).click();
    await lab.getByRole('button', { name: '끔', exact: true }).click();

    await lab.getByRole('button', { name: '처음 값으로 되돌리기' }).click();

    await expect(lab.locator('.stepper__chip').nth(0)).toHaveAttribute('aria-current', 'step');
    await lab.locator('.stepper__chip').nth(2).click();
    expect(await lab.locator('.mgrid--score .mgrid__value').allInnerTexts()).toEqual([
      '0', '4', '2', '4', '0', '2', '2', '2', '2',
    ]);
  });

  test('with the causal mask on, the first row sees only itself', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator(LAB);
    await lab.getByRole('button', { name: /켬 \(decoder/ }).click();
    await lab.locator('.stepper__chip').nth(5).click();

    const weights = await lab.locator('.mgrid--weight .mgrid__value').allInnerTexts();
    expect(weights.slice(0, 3)).toEqual(['1.000', '−∞', '−∞']);
    expect(weights.slice(6)).toEqual(['0.333', '0.333', '0.333']);
    await expect(lab.locator('.mgrid--weight .mgrid__cell.is-blocked').first()).toBeVisible();

    await lab.locator('.stepper__chip').nth(6).click();
    const out = await lab.locator('.mgrid--score .mgrid__value').allInnerTexts();
    expect(out.slice(0, 2)).toEqual(['3.000', '0.000']);
  });

  test('switching the division off makes the probabilities more lopsided', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator(LAB);
    await lab.locator('.stepper__chip').nth(5).click();
    const on = await lab.locator('.mgrid--weight .mgrid__value').allInnerTexts();
    expect(on.slice(0, 3)).toEqual(['0.045', '0.768', '0.187']);

    await lab.getByRole('button', { name: '끔', exact: true }).click();
    const off = await lab.locator('.mgrid--weight .mgrid__value').allInnerTexts();
    expect(off.slice(0, 3)).toEqual(['0.016', '0.867', '0.117']);
  });
});

test.describe('keyboard access', () => {
  const LAB = '.lab--attention';

  test('the arrow keys move between matrix cells', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator(LAB);
    await lab.locator('.stepper__chip').nth(2).click();

    const first = lab.locator('.mgrid--score button.mgrid__cell').first();
    await first.focus();
    await expect(first).toBeFocused();

    await page.keyboard.press('ArrowRight');
    await expect(lab.locator('.terms__result')).toContainText('S(1, 2)');
    await page.keyboard.press('ArrowDown');
    await expect(lab.locator('.terms__result')).toContainText('S(2, 2)');
    await page.keyboard.press('ArrowLeft');
    await expect(lab.locator('.terms__result')).toContainText('S(2, 1)');
    await page.keyboard.press('End');
    await expect(lab.locator('.terms__result')).toContainText('S(2, 3)');
  });

  test('the skip-to-content link works from the keyboard', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    await page.keyboard.press('Tab');
    const skip = page.locator('.skip-link');
    await expect(skip).toBeFocused();
    await expect(skip).toBeInViewport();
    await page.keyboard.press('Enter');
    expect(page.url()).toContain('#main');
  });

  test('tab stops only at the selected cell (roving tabindex)', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator(LAB);
    await lab.locator('.stepper__chip').nth(2).click();
    const tabbable = await lab
      .locator('.mgrid--score button.mgrid__cell')
      .evaluateAll((els) => els.filter((e) => e.getAttribute('tabindex') === '0').length);
    expect(tabbable).toBe(1);
  });
});

test.describe('responsiveness and reading', () => {
  for (const path of ALL_PAGES) {
    test(`the page never scrolls sideways: /${path}`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'networkidle' });
      const { scroll, client } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(scroll, `${path}: the document must not be wider than the viewport`).toBeLessThanOrEqual(client + 1);
    });
  }

  test('no sideways scroll at a 768px tablet width either', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const page = await ctx.newPage();
    for (const path of [ARTICLE_KO, ARTICLE_EN]) {
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      const { scroll, client } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(scroll, `${path} at 768px`).toBeLessThanOrEqual(client + 1);
    }
    await ctx.close();
  });

  test('the screen updates within 100ms of an interaction', async ({ page }) => {
    await page.goto(ARTICLE_KO, { waitUntil: 'networkidle' });
    const lab = page.locator('.lab--attention');
    await lab.locator('.stepper__chip').nth(2).click();

    const timings: number[] = [];
    for (let i = 0; i < 8; i++) {
      const t = await page.evaluate(async (n) => {
        const root = document.querySelector('.lab--attention');
        const btn = root?.querySelectorAll('.mgrid--score button.mgrid__cell')[n] as HTMLElement;
        const start = performance.now();
        btn.click();
        await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
        return performance.now() - start;
      }, i % 9);
      timings.push(t);
    }
    const worst = Math.max(...timings);
    expect(worst, `slowest update ${worst.toFixed(1)}ms`).toBeLessThan(100);
    console.log(`  update time: ${worst.toFixed(1)}ms at worst`);
  });

  test('no sideways scroll at 200% zoom', async ({ browser }) => {
    // Zooming a browser to 200% halves the viewport measured in CSS pixels.
    const ctx = await browser.newContext({ viewport: { width: 720, height: 450 } });
    const page = await ctx.newPage();
    for (const path of [ARTICLE_KO, ARTICLE_EN]) {
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      const { scroll, client } = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(scroll, `${path} at 200%`).toBeLessThanOrEqual(client + 1);
      const box = await page.locator('main p').first().boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(client + 1);
    }
    await ctx.close();
  });

  test('transitions are switched off under reduced motion', async ({ browser }) => {
    const ctx = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(BASE + ARTICLE_KO);
    const duration = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--motion').trim(),
    );
    expect(['0ms', '0s']).toContain(duration);
    await ctx.close();
  });

  test('on a narrow screen the article comes before the contents', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(BASE + ARTICLE_KO);
    const main = await page.locator('main').boundingBox();
    const nav = await page.locator('#doc-nav').boundingBox();
    expect(main!.y, 'the article has to sit above the contents').toBeLessThan(nav!.y);
    await expect(page.locator('.masthead__contents')).toBeVisible();

    for (const sel of ['.masthead__contents', '.lang-switch', '.theme-toggle button >> nth=2']) {
      const box = await page.locator(sel).boundingBox();
      expect(box!.x + box!.width, `${sel} must not be clipped on the right`).toBeLessThanOrEqual(390);
      expect(box!.x, `${sel} must not be clipped on the left`).toBeGreaterThanOrEqual(0);
    }
    await ctx.close();
  });

  test('on a wide screen the path sits left and the contents right', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + ARTICLE_KO);
    const main = await page.locator('main').boundingBox();
    const course = await page.locator('#course-nav').boundingBox();
    const toc = await page.locator('#doc-nav').boundingBox();
    expect(course!.x, 'the learning path has to be left of the article').toBeLessThan(main!.x);
    expect(toc!.x, 'the contents has to be right of the article').toBeGreaterThan(main!.x);
    await expect(page.locator('.masthead__contents')).toBeHidden();
    await ctx.close();
  });

  test('narrower still, the contents drops below the article', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(BASE + ARTICLE_KO);
    const main = await page.locator('main').boundingBox();
    const toc = await page.locator('#doc-nav').boundingBox();
    expect(toc!.y, 'the contents has to sit below the article').toBeGreaterThan(main!.y);
    // It does not disappear, though: there is always a way to move within the piece.
    await expect(page.locator('#doc-nav')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    );
    expect(overflow, 'there must be no sideways scroll').toBe(true);
    await ctx.close();
  });

  test('without JavaScript the prose and the default results are still readable', async ({ browser }) => {
    const ctx = await browser.newContext({ javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(BASE + ARTICLE_KO);

    await expect(page.locator('main h1')).toContainText('Attention Is All You Need');
    await expect(page.locator('.katex').first()).toBeVisible();

    // The sections and the labs have to be in the static HTML already
    await expect(page.locator('[data-section]')).toHaveCount(SECTION_IDS.length);
    expect(await page.locator('.lab--attention .emat__input').count()).toBeGreaterThan(0);
    await expect(page.locator('.lab--attention .terms__table')).toBeVisible();
    await expect(page.locator('.lab--attention .lab__what')).not.toBeEmpty();

    await ctx.close();
  });
});

test.describe('the labs inside the article', () => {
  test('matrix product: choosing a cell highlights the row and column and opens the terms', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator('.lab--matmul');

    // Q(2,2) = row 2 of X · column 2 of W_Q = 0×0 + 1×1 + 0×0 + 1×1 = 2
    await lab.locator('.mgrid--score button.mgrid__cell').nth(3).click();
    await expect(lab.locator('.terms__result')).toContainText('Q(2, 2)');
    await expect(lab.locator('.terms__running').last()).toHaveText('2');

    // The highlight belongs on the editable input matrix, not on a copy of it
    await expect(lab.locator('.emat--q input.is-in-row')).toHaveCount(4);
    await expect(lab.locator('.emat--k input.is-in-col')).toHaveCount(4);
    await expect(page.locator('.lab__mirror')).toHaveCount(0);
  });

  test('matrix product: editing the inputs updates the result, and reset works', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator('.lab--matmul');
    const result = () => lab.locator('.mgrid--score .mgrid__value').allInnerTexts();
    expect(await result()).toEqual(['2', '0', '0', '2', '1', '1']);

    for (let r = 0; r < 4; r++) {
      await lab.locator('.emat--k input').nth(r * 2).fill('0');
    }
    const after = await result();
    expect([after[0], after[2], after[4]]).toEqual(['0', '0', '0']);

    await lab.getByRole('button', { name: '처음 값으로 되돌리기' }).click();
    expect(await result()).toEqual(['2', '0', '0', '2', '1', '1']);
  });

  test('dot product: changing a coordinate moves the value and cos θ with it', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator('.lab--dot');
    const total = () => lab.locator('.terms__running').last();
    const cos = () => lab.locator('.lab__stats dd').nth(2);

    await expect(total()).toHaveText('4');
    await expect(cos()).toHaveText('1.000');

    const kFields = lab.locator('.vecinput--k input');
    await kFields.nth(0).fill('0');
    await kFields.nth(1).fill('2');
    await expect(total()).toHaveText('0');
    await expect(cos()).toHaveText('0.000');

    await kFields.nth(0).fill('4');
    await kFields.nth(1).fill('0');
    await expect(total()).toHaveText('8');
    await expect(cos()).toHaveText('1.000');

    await kFields.nth(0).fill('-2');
    await expect(total()).toHaveText('−4');

    await lab.getByRole('button', { name: '처음 값으로 되돌리기' }).click();
    await expect(total()).toHaveText('4');
  });

  test('dot product: the two arrows stay distinguishable when they coincide', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const widths = await page
      .locator('.lab--dot svg g line')
      .evaluateAll((els) => els.map((e) => e.getAttribute('stroke-width')));
    expect(new Set(widths).size, 'the two arrows must differ in thickness').toBeGreaterThan(1);
  });

  test('softmax: raising one score lowers the others', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator('.lab--softmax');
    const probs = () =>
      lab.locator('.terms__table tbody tr:not(.terms__sumrow) .terms__running').allInnerTexts();

    expect(await probs()).toEqual(['0.016', '0.867', '0.117']);

    const plus = lab.locator('.softmax__row').first().getByRole('button', { name: /올리기/ });
    await plus.click();
    await plus.click();

    const after = await probs();
    expect(Number(after[0]), 'the raised position grows').toBeGreaterThan(0.016);
    expect(Number(after[1]), 'an untouched position shrinks too').toBeLessThan(0.867);
    expect(Number(after[2]), 'an untouched position shrinks too').toBeLessThan(0.117);
  });

  test('softmax: adding the same number to every score leaves the probabilities alone', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator('.lab--softmax');
    const probs = () =>
      lab.locator('.terms__table tbody tr:not(.terms__sumrow) .terms__running').allInnerTexts();
    const before = await probs();

    await lab.locator('#softmax-shift').fill('7');
    await lab.locator('#softmax-shift').dispatchEvent('input');
    await expect(lab.locator('.softmax__shiftval')).toHaveText('+7');

    expect(await probs(), 'it has to be shift-invariant').toEqual(before);
    const shifted = await lab
      .locator('.terms__table tbody tr:not(.terms__sumrow) td:nth-child(3)')
      .allInnerTexts();
    expect(shifted).toEqual(['−4.000', '0.000', '−2.000']);

    await lab.getByRole('button', { name: '처음 값으로 되돌리기' }).click();
    await expect(lab.locator('.softmax__shiftval')).toHaveText('+0');
  });

  test('positions: moving the position moves the marked cell and the readout', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator('.lab--position');
    await expect(lab.locator('.explorer__line').first()).toContainText('3:');
    await lab.locator('#pe-pos').fill('0');
    await lab.locator('#pe-pos').dispatchEvent('input');
    await expect(lab.locator('.explorer__line').first()).toContainText('0: (0.000, 1.000, 0.000, 1.000)');
    await lab.getByRole('button', { name: /느린 쪽/ }).click();
    await expect(lab.locator('.explorer__line').nth(1)).toContainText('느린 쪽');
  });

  test('layer norm: adding the same number to every value leaves the output alone', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator('.lab--layernorm');
    const out = () => lab.locator('.terms__running').textContent();
    const before = await out();
    await lab.locator('#ln-shift').fill('5');
    await lab.locator('#ln-shift').dispatchEvent('input');
    expect(await out()).toBe(before);
    await lab.locator('#ln-gamma').fill('2');
    await lab.locator('#ln-gamma').dispatchEvent('input');
    expect(await out()).not.toBe(before);
  });

  test('residual: switching the bypass off changes the last layer', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator('.lab--residual');
    const last = () => lab.locator('tr.is-active .terms__running').textContent();
    const withSkip = await last();
    await lab.getByRole('button', { name: /^끔/ }).click();
    expect(await last()).not.toBe(withSkip);
  });

  test('loss: lowering the probability on the right word raises the loss', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator('.lab--loss');
    await expect(lab).toContainText('0.511');
    await lab.locator('#loss-p').fill('0.1');
    await lab.locator('#loss-p').dispatchEvent('input');
    await expect(lab).toContainText('2.303');
    await lab.locator('#loss-eps').fill('0');
    await lab.locator('#loss-eps').dispatchEvent('input');
    const losses = await lab.locator('.tmap__note').filter({ hasText: '틀린 정도' }).allTextContents();
    expect(losses[0]).toBe(losses[1]);
  });

  test('beam: carrying two candidates finds the better sentence', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator('.lab--beam');
    await expect(lab.locator('.explorer__line').nth(1)).toContainText('0.200');
    await lab.getByRole('button', { name: '2개' }).click();
    await expect(lab.locator('.explorer__line').nth(1)).toContainText('0.342');
  });

  test('bleu against cost: the language pair switches', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator('.lab--bleucost');
    await expect(lab).toContainText('28.4');
    await lab.getByRole('button', { name: /프랑스어/ }).click();
    await expect(lab).toContainText('41.8');
  });

  test('heads: choosing a token moves the highlighted row in both grids', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator('.lab--heads');
    await expect(lab.locator('.explorer__line')).toContainText('1번 토큰');
    await lab.getByRole('button', { name: '토큰 3' }).click();
    await expect(lab.locator('.explorer__line')).toContainText('3번 토큰');
  });
});
