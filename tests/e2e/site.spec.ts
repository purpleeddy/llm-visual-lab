import { expect, test, type Page, type Locator } from '@playwright/test';
import { READY_COUNT } from '../../src/lib/curriculum';
import { GROUPS } from '../../src/lib/nav';

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
const BASE = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:4321/llm-visual-lab/';
/** Must be in the same order as src/lib/nav.ts */
const SECTION_IDS = [
  'language-model', 'tokens', 'numbers', 'proportion', 'attention', 'positions',
  'multi-head', 'blocks', 'big-picture', 'training', 'generation', 'results',
];
// Every section is written now. These stay so that adding a placeholder later
// only means moving the split, not rewriting the checks.
const WRITTEN_IDS = SECTION_IDS;
const PLANNED_IDS: string[] = [];

/** Jump controls are optional; ordinary reading uses the next button. */
async function chooseStep(lab: Locator, index: number | 'last') {
  const menu = lab.locator('.stepper__jump');
  if (await menu.count() && !(await menu.evaluate(el => (el as HTMLDetailsElement).open))) {
    await menu.locator('summary').click();
  }
  const chips = lab.locator('.stepper__chip');
  await (index === 'last' ? chips.last() : chips.nth(index)).click();
}
async function revealSupplement(node: Locator) {
  const parent=node.locator('xpath=ancestor::details[1]');
  if (await parent.count()) {
    await revealSupplement(parent);
    if (!(await parent.evaluate(el=>(el as HTMLDetailsElement).open))) await parent.locator(':scope > summary').click();
  }
}
async function openFold(lab: Locator, selector: string) {
  await revealSupplement(lab);
  const fold = lab.locator(selector);
  if (!(await fold.evaluate(el => (el as HTMLDetailsElement).open))) await fold.locator('summary').click();
}

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
    await expect(page.locator('main h1')).toHaveText('눈으로 이해하는 LLM 원리');
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

  test('the contents is grouped by prerequisite-based learning stage', async ({ page }) => {
    const FIRST_OF_GROUP = ['language-model', 'proportion', 'multi-head', 'training'];
    for (const [path, locale] of [
      [ARTICLE_KO, 'ko'],
      [ARTICLE_EN, 'en'],
    ] as const) {
      await page.goto(path, { waitUntil: 'networkidle' });
      const groups = page.locator('#doc-nav .toc__group');
      await expect(groups, `${path}: four stages`).toHaveCount(4);
      expect(await groups.locator('.toc__group-title').allTextContents()).toEqual(
        GROUPS.map((g) => g.title[locale]),
      );
      await expect(groups.locator('.toc__stage > summary')).toHaveCount(4);
      await expect(groups.locator('.toc__count')).toHaveText(['3 단원', '3 단원', '3 단원', '3 단원'].map(s => locale === 'ko' ? s : '3 units'));

      const sectionIds = await page
        .locator('#doc-nav [data-section-link]')
        .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.sectionLink));
      expect(sectionIds, `${path}: the twelve sections, in order`).toEqual(SECTION_IDS);

      // Each stage contains its own first unit even while closed.
      const firstAfter = await groups.evaluateAll(els => els.map(li => (li.querySelector('[data-section-item]') as HTMLElement)?.dataset.sectionItem));
      expect(firstAfter, `${path}: each group owns the expected units`).toEqual(FIRST_OF_GROUP);

      // The visible numbering is still 1–12
      const nums = await page.locator('#doc-nav [data-section-link] .toc__num').allTextContents();
      expect(nums).toEqual(SECTION_IDS.map((_, i) => String(i + 1)));
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
    await expect(page.locator('main h1')).toHaveText('눈으로 이해하는 LLM 원리');
  });

  test('scrolling moves the current-section mark in the contents', async ({ page }) => {
    await page.goto(ARTICLE_KO, { waitUntil: 'networkidle' });
    const marked = () =>
      page
        .locator('#doc-nav [data-section-link][aria-current="true"]')
        .getAttribute('data-section-link');

    await page.locator('#similarity').scrollIntoViewIfNeeded();
    await expect.poll(marked, { timeout: 6000 }).toBe('numbers');

    await page.locator('#numbers').scrollIntoViewIfNeeded();
    await expect.poll(marked, { timeout: 6000 }).toBe('numbers');
  });
});

test.describe('learning path on the left, contents on the right', () => {
  test('the left rail lists only what can be read, and says the rest is in preparation', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const nav = page.locator('#course-nav');
    await expect(nav.locator('a[aria-current="page"]')).toHaveText('눈으로 이해하는 LLM 원리');
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

    const detail = page.locator('#doc-nav .toc__details');
    await expect(detail).not.toHaveAttribute('open', '');
    await detail.locator('summary').click();
    await expect(detail.locator('.toc__sublist')).toBeVisible();
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
      .toBe('numbers');
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
  { id: 'aa', section: 'attention' },
  { id: 'pld', section: 'attention' },
  { id: 'sw', section: 'attention' },
  { id: 'tmap', section: 'big-picture' },
  { id: 'sf', section: 'numbers' },
  { id: 'rc', section: 'numbers' },
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
  { id: 'xs', section: 'big-picture' },
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

      const { paragraphs, ...widths } = await page.evaluate(() => {
        const round = (el: Element | null) =>
          el ? Math.round(el.getBoundingClientRect().width) : null;
        // Measure article prose, not inset captions inside an opening lab.
        // Check every substantial body/intro paragraph instead of just the first.
        const paras = [...document.querySelectorAll('.doc-section > p, [data-model-intro] > p')].filter(
          (e) => (e.textContent ?? '').trim().length > 60,
        );
        return {
          paragraphs: paras.map(round),
          paragraph: round(paras[0] ?? null),
          note: round(document.querySelector('.note')),
          lead: round(document.querySelector('.doc-header__lead')),
          caption: round(document.querySelector('.figure__caption')),
          figure: round(document.querySelector('.figure__frame')),
          table: round(document.querySelector('.doc-section > table')),
          lab: round(document.querySelector('.lab--attention')),
        };
      });

      const values = [...Object.values(widths), ...paragraphs];
      expect(paragraphs.length, 'substantial article paragraphs must be present').toBeGreaterThan(0);
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

  test('readable figures scroll inside their frame without widening the page', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    for (const f of FIGURES) {
      const svg = page.locator(`svg[aria-labelledby="${f.id}-t ${f.id}-d"]`);
      await revealSupplement(svg);
      await svg.scrollIntoViewIfNeeded();
      const geometry = await svg.evaluate(el => {
        const frame = el.closest('.figure__frame') as HTMLElement;
        const box = frame.getBoundingClientRect();
        const overflow = el.getBoundingClientRect().width > frame.clientWidth;
        const scrollable = getComputedStyle(frame).overflowX === 'auto' && frame.scrollWidth > frame.clientWidth;
        const intrinsic = (el as SVGSVGElement).viewBox.baseVal.width;
        return { left: box.left, right: box.right, overflow, scrollable, svgWidth: el.getBoundingClientRect().width, intrinsic, wide: Boolean(el.closest('.figure.wide')) };
      });
      const width = page.viewportSize()!.width;
      expect(geometry.left, `${f.id}: frame stays on the page`).toBeGreaterThanOrEqual(0);
      expect(geometry.right, `${f.id}: frame stays on the page`).toBeLessThanOrEqual(width);
      if (geometry.overflow) expect(geometry.scrollable, `${f.id}: overflow has an internal scroll container`).toBe(true);
      if (geometry.wide) expect(geometry.svgWidth, `${f.id}: text retains its intrinsic size`).toBeGreaterThanOrEqual(geometry.intrinsic-1);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
  });

  test('the figures read their numbers from the example, not from a copy', async ({ page }) => {
    await page.goto(ARTICLE_KO + '#problem');

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

  test('preparation figures consistently show generic X times W to Y before the Q projection', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path);
      const prep = page.locator('#numbers');
      await expect(prep.locator('svg[aria-labelledby="sf-t sf-d"] .tmap__head')).toHaveText(['X', 'W', 'Y']);
      await expect(prep.locator('#sf-d')).toContainText(path === ARTICLE_KO ? '결과인 Y' : 'result Y');
      await expect(prep.locator('#sf-d')).not.toContainText('W_Q');
      await expect(prep).not.toContainText(/W[_₍\s]*Q/);
      await expect(prep.locator('.lab--matmul[data-matmul-mode=interactive]').first().locator('.mgrid--score .mgrid__value')).toHaveText(['2', '0', '0', '2', '1', '1']);
      await expect(page.locator('#attention')).toContainText('W_Q');
      await expect(page.locator('#attention')).toContainText('Q');
    }
  });

  test('the dimensions in the figures match the worked example', async ({ page }) => {
    await page.goto(ARTICLE_KO + '#problem');
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
    await expect(page.locator('#doc-nav')).toContainText('Tokens and vectors');

    await page.locator('.lang-switch').click();
    await page.waitForURL(/\/llm-visual-lab\/ko\/$/);
    await expect(page.locator('#doc-nav')).toContainText('토큰과 벡터');
  });

  test('both languages compute the same numbers', async ({ page }) => {
    const read = async (path: string) => {
      await page.goto(path);
      await chooseStep(page.locator('.lab--attention'), 5);
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

test.describe('quiet repository link and balanced header', () => {
  for (const path of ALL_PAGES) {
    test(`${path}: keeps one small repository link in the footer and makes no star API request`, async ({ page }) => {
      const requests: string[] = [];
      await page.route('https://api.github.com/**', route => {
        requests.push(route.request().url());
        return route.abort('failed');
      });
      await page.goto(path, { waitUntil: 'networkidle' });
      await expect(page.locator('.masthead a[href^="https://github.com/"]')).toHaveCount(0);
      await expect(page.locator('.star-link,[data-star-count]')).toHaveCount(0);
      const repo = page.locator('.site-footer a[href="https://github.com/purpleeddy/llm-visual-lab"]');
      await expect(repo).toHaveCount(1);
      await expect(repo).toBeVisible();
      await expect(repo).toHaveText(path === 'ko/' ? 'GitHub 저장소' : 'GitHub repository');
      await expect(repo).toHaveAttribute('target', '_blank');
      await expect(repo).toHaveAttribute('rel', 'noopener');
      expect(await repo.evaluate(node => parseFloat(getComputedStyle(node).fontSize))).toBeLessThanOrEqual(13);
      expect(requests, 'the page must not query GitHub for star counts').toEqual([]);
    });
  }

  test('aligns language and theme controls within the header in both languages', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path);
      const bounds = await page.locator('.lang-switch,.theme-toggle').evaluateAll(nodes => nodes.map(node => {
        const r = node.getBoundingClientRect();
        return { height: r.height, center: r.top + r.height / 2, left: r.left, right: r.right };
      }));
      expect(bounds).toHaveLength(2);
      expect(Math.max(...bounds.map(b => b.height)) - Math.min(...bounds.map(b => b.height))).toBeLessThanOrEqual(1);
      expect(Math.max(...bounds.map(b => b.center)) - Math.min(...bounds.map(b => b.center))).toBeLessThanOrEqual(1);
      const width = page.viewportSize()!.width;
      for (const b of bounds) {
        expect(b.left).toBeGreaterThanOrEqual(0);
        expect(b.right).toBeLessThanOrEqual(width);
      }
    }
  });
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
      await expect(walk.locator('[data-sentence-token-arrow]')).toHaveCount(1);
      for (let i = 1; i < 7; i++) {
        await next.click();
        await expect(chips.nth(i)).toHaveAttribute('aria-current', 'step');
        if (i === 1) {
          await expect(walk.locator('[data-sentence-token-arrow]'), 'the lookup frame must not draw an arrow through its token heading').toHaveCount(0);
        }
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
    await chooseStep(lab, 2);

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
    await chooseStep(lab, 2);
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
    await chooseStep(lab, 2);
    await lab.locator('.mgrid--score button.mgrid__cell').nth(1).click();
    await expect(lab.locator('.connectors__line')).toHaveCount(0);
    // Without the lines, the row and column highlight still has to be there
    await expect(lab.locator('.mgrid--q .mgrid__cell.is-in-row').first()).toBeVisible();
    await ctx.close();
  });

  test('changing an input moves every result with it', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator(LAB);
    await chooseStep(lab, 2);
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
    await chooseStep(lab, 3);
    await openFold(lab, '.lab__settings');
    await lab.getByRole('button', { name: '끔', exact: true }).click();

    await lab.getByRole('button', { name: '처음 값으로 되돌리기' }).click();

    await expect(lab.locator('.stepper__chip').nth(0)).toHaveAttribute('aria-current', 'step');
    await chooseStep(lab, 2);
    expect(await lab.locator('.mgrid--score .mgrid__value').allInnerTexts()).toEqual([
      '0', '4', '2', '4', '0', '2', '2', '2', '2',
    ]);
  });

  test('with the causal mask on, the first row sees only itself', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator(LAB);
    await openFold(lab, '.lab__settings');
    await lab.getByRole('button', { name: /켬 \(decoder/ }).click();
    await chooseStep(lab, 5);

    const weights = await lab.locator('.mgrid--weight .mgrid__value').allInnerTexts();
    expect(weights.slice(0, 3)).toEqual(['1.000', '0.000', '0.000']);
    expect(weights.slice(6)).toEqual(['0.333', '0.333', '0.333']);
    await expect(lab.locator('.mgrid--weight .mgrid__cell.is-blocked').first()).toBeVisible();

    await chooseStep(lab, 6);
    const out = await lab.locator('.mgrid--score .mgrid__value').allInnerTexts();
    expect(out.slice(0, 2)).toEqual(['3.000', '0.000']);
  });

  test('switching the division off makes the probabilities more lopsided', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator(LAB);
    await chooseStep(lab, 5);
    const on = await lab.locator('.mgrid--weight .mgrid__value').allInnerTexts();
    expect(on.slice(0, 3)).toEqual(['0.045', '0.768', '0.187']);

    await openFold(lab, '.lab__settings');
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
    await chooseStep(lab, 2);

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
    await chooseStep(lab, 2);
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
    await chooseStep(lab, 2);

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

    await expect(page.locator('main h1')).toHaveText('눈으로 이해하는 LLM 원리');
    await expect(page.locator('.katex').first()).toBeVisible();

    // The sections and the labs have to be in the static HTML already
    await expect(page.locator('[data-section]')).toHaveCount(SECTION_IDS.length);
    expect(await page.locator('.lab--attention .emat__input').count()).toBeGreaterThan(0);
    await expect(page.locator('.lab--attention .lab__stage .mgrid__value')).toHaveText(['1','0','1','0','0','1','0','1','1','1','0','0']);
    await expect(page.locator('.lab--attention .terms__table')).toHaveCount(0);
    await expect(page.locator('.lab--attention .lab__what')).not.toBeEmpty();
    // The loss controls need a mounted handler; static results remain readable without JavaScript.
    await expect(page.locator('.lab--loss #loss-p')).toBeDisabled();
    await expect(page.locator('.lab--loss #loss-eps')).toBeDisabled();

    await ctx.close();
  });
});

test.describe('the labs inside the article', () => {
  test('matrix product: choosing a cell highlights the row and column and opens the terms', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator('#numbers .lab--matmul[data-matmul-mode=interactive]');
    await revealSupplement(lab);

    // Y(2,2) = row 2 of X · column 2 of W = 0×0 + 1×1 + 0×0 + 1×1 = 2
    await lab.locator('.mgrid--score button.mgrid__cell').nth(3).click();
    await expect(lab.locator('.terms__result')).toContainText('Y(2, 2)');
    await expect(lab.locator('.terms__running').last()).toHaveText('2');

    // The visible source row and column identify the selected result cell.
    await expect(lab.locator('.mgrid--q .mgrid__cell.is-in-row')).toHaveCount(4);
    await expect(lab.locator('.mgrid--k .mgrid__cell.is-in-col')).toHaveCount(4);
    await expect(page.locator('.lab__mirror')).toHaveCount(0);
  });

  test('matrix product: editing the inputs updates the result, and reset works', async ({ page }) => {
    await page.goto(ARTICLE_KO);
    const lab = page.locator('#numbers .lab--matmul[data-matmul-mode=interactive]');
    await revealSupplement(lab);
    const result = () => lab.locator('.mgrid--score .mgrid__value').allInnerTexts();
    expect(await result()).toEqual(['2', '0', '0', '2', '1', '1']);

    await openFold(lab, '.matmul__inputs');
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
    await revealSupplement(lab);
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
    await revealSupplement(lab);
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
    await revealSupplement(lab);
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
    await expect(lab.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr', '');
    await expect(lab.locator('.explorer__line').first()).toContainText('1:');
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
    await expect(lab.locator('#loss-p')).toBeEnabled();
    await expect(lab).toContainText('0.511');
    await lab.locator('#loss-p').fill('0.1');
    await lab.locator('#loss-p').dispatchEvent('input');
    await expect(lab).toContainText('2.303');
    await openFold(lab, '.loss__comparison');
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


test.describe('the complete learning progression', () => {
  test('the opening renders semantic emphasis without literal Markdown delimiters', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path);
      const intro = page.locator('[data-model-intro]');
      await expect(intro).not.toContainText('**');
      await expect(intro.locator('strong').first()).toContainText('LLM');
      const weight = await intro.locator('strong').first().evaluate(node => Number(getComputedStyle(node).fontWeight));
      expect(weight).toBeGreaterThanOrEqual(600);
      await expect(page.locator('.doc-header__lead')).not.toContainText('**');
      await expect(page.locator('#language-model')).not.toContainText('**');
      const unparsed = await page.locator('.prose').evaluate(root => {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const found: string[] = [];
        while (walker.nextNode()) {
          const node = walker.currentNode;
          if (node.textContent?.includes('**') && !node.parentElement?.closest('pre, code, script, style, .katex')) found.push(node.textContent.trim());
        }
        return found;
      });
      expect(unparsed, 'article prose must not expose unused Markdown emphasis').toEqual([]);
    }
  });

  test('the opening starts with one computed two-input journey before explaining the route', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path);
      const ko = path === ARTICLE_KO;
      const intro = page.locator('[data-model-intro]');
      const lab = page.locator('.lab--generation-journey');
      await expect(intro).toBeVisible();
      await expect(intro.locator('p')).toHaveCount(2);
      await expect(intro.locator('strong')).toHaveCount(3);
      await expect(intro.locator('p').first()).toContainText(ko ? '생성형 LLM' : 'generative large language model');
      await expect(intro.locator('p').first()).toContainText(ko ? '다음 토큰의 확률' : 'next-token probabilities');
      await expect(intro.locator('p').last()).toContainText(ko ? '늘어난 문장으로 다시 예측' : 'predicts again from the longer input');
      await expect(page.locator('.doc-header__lead')).toHaveText(ko ? '문장을 만드는 과정을 한 단계씩 따라가기' : 'Follow how a sentence is generated, step by step.');
      await expect(lab.locator('[data-journey-input] .journey-token')).toHaveText(ko ? ['나는','학교에'] : ['I','went']);
      await expect(lab).toHaveCount(1);
      await expect(page.locator('#language-model .lab--generation-journey')).toHaveCount(1);
      await expect(page.locator('#table-generation')).not.toHaveAttribute('open');
      await expect(page.locator('.lab--next-token')).not.toBeVisible();
      expect(await lab.evaluate(node => Boolean(node.compareDocumentPosition(document.querySelector('[data-model-intro]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
      expect(await intro.evaluate(node => Boolean(node.compareDocumentPosition(document.querySelector('[data-learning-overview]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
      expect(await lab.evaluate(node => Boolean(node.compareDocumentPosition(document.querySelector('#language-model > h2')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
      expect(await lab.evaluate(node => Boolean(node.compareDocumentPosition(document.querySelector('[data-learning-overview]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
      const explanation = (await page.locator('#language-model > p').allTextContents()).join(' ');
      expect(explanation).toContain(ko ? '단어 하나나 단어의 일부' : 'a word or part of a word');
      expect(explanation).toContain(ko ? '가장 큰 확률을 고르는 규칙' : 'chooses the highest probability');
      expect(explanation).toContain(ko ? '확률에 따라 뽑는 규칙' : 'Sampling according to the probabilities');
      expect(explanation).toContain(ko ? '늘어난 문맥' : 'whole longer context');
      expect(explanation).toContain(ko ? '가중치' : 'weights');
      await expect(page.locator('[data-learning-overview] li')).toHaveCount(3);
      await expect(page.locator('[data-learning-overview]')).toContainText('(1, 0, 1, 0)');
      await expect(page.locator('[data-learning-overview]')).toContainText(ko ? '나는 / 학교에 / 갔다 / 끝' : 'I / went / to school / end');
    }
  });

  test('both languages expose twelve goals, prerequisite links and reasoned checkpoints', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path);
      await expect(page.locator('[data-section] .point--goal')).toHaveCount(12);
      await expect(page.locator('[data-lesson-check]')).toHaveCount(12);
      await expect(page.locator('.lesson-next a[rel="next"]')).toHaveCount(11);
      await expect(page.locator('.lesson-next a[rel="prev"]')).toHaveCount(11);
      for (const id of ['problem', 'similarity', ...SECTION_IDS]) {
        await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
      }
      const question = page.locator('#training [data-lesson-check]');
      await expect(question.locator('details')).not.toHaveAttribute('open', '');
      await question.locator('summary').click();
      await expect(question.locator('.expand__body')).toContainText('0.1');
    }
  });

  test('embedding lookup retrieves the chosen ID row in both languages', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path);
      const lab=page.locator('.lab--embedding-lookup');
      await expect(lab.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr', '');
      await expect(lab.locator('.embedding-lookup__vector')).toHaveText('(1, 0, 1, 0)');
      const chooser = await lab.locator('.segmented').boundingBox();
      expect(chooser).not.toBeNull();
      for (const arrow of await lab.locator('.mini-flow > span').all()) {
        const bounds = await arrow.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.y, 'a rotated flow arrow must not extend above its row into the token controls').toBeGreaterThanOrEqual(chooser!.y + chooser!.height);
      }
      await lab.getByRole('button', { name: path==='ko/' ? '갔다 · ID 2' : 'to school · ID 2' }).click();
      await expect(lab.locator('.embedding-lookup__vector')).toHaveText('(1, 1, 0, 0)');
      await lab.getByRole('button', { name: path==='ko/' ? '학교에 · ID 1' : 'went · ID 1' }).click();
      await expect(lab.locator('.embedding-lookup__vector')).toHaveText('(0, 1, 0, 1)');
    }
  });

  const sentenceDemo = (path: string) => path==='ko/' ? {
    tokens:['나는','학교에','갔다','.'], probability:'0.252', destination:1,
    candidates:['학교에','집에','도서관에','끝 표시 .'], beforeEnd:'시작 나는 학교에 갔다',
    candidateRounds:[['나는','우리는','그는','끝 표시 .'],['학교에','집에','도서관에','끝 표시 .'],['갔다','도착했다','간다','끝 표시 .'],['끝 표시 .']],
  } : {
    tokens:['I','went','to school','.'], probability:'0.252', destination:1,
    candidates:['went','walked','headed','end marker .'], beforeEnd:'start I went to school',
    candidateRounds:[['I','We','They','end marker .'],['went','walked','headed','end marker .'],['to school','home','to work','end marker .'],['end marker .']],
  };

  test('the next-token loop appends a token, changes context and stops on the end marker', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path);
      const lab = page.locator('.lab--next-token'); const example = sentenceDemo(path); const ko = path === ARTICLE_KO;
      await revealSupplement(lab);
      await expect(lab.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr', '');
      const advance = lab.locator('.next-token__advance');
      await advance.click();
      await expect(lab).toHaveAttribute('data-stage', 'finished');
      await advance.click();
      await expect(lab.locator('.lab__note')).toContainText(ko ? '실제 모델이나 토크나이저의 출력은 아닙니다' : 'not model or tokenizer outputs');
      await expect(lab.locator('.lab__note')).toContainText(ko ? '항상 토큰 하나인 것은 아닙니다' : 'not always one token');
      for (const [i, token] of example.tokens.entries()) {
        await expect(lab).toHaveAttribute('data-round', String(i + 1));
        await expect(lab.locator('tbody th')).toHaveText(example.candidateRounds[i]);
        const roundProbabilities = [
          ['(0.600)', '(0.250)', '(0.100)', '(0.050)'],
          ['(0.600)', '(0.200)', '(0.150)', '(0.050)'],
          ['(0.700)', '(0.100)', '(0.150)', '(0.050)'],
          ['(1.000)'],
        ];
        await expect(lab.locator('.next-token__probability')).toHaveText(roundProbabilities[i]);
        const visibleSum = (await lab.locator('.next-token__probability').allTextContents()).reduce((sum, value) => sum + Number(value.slice(1, -1)), 0);
        expect(visibleSum).toBeCloseTo(1, 12);
        await expect(lab.locator('tbody button, tbody a')).toHaveCount(0);
        if (i === example.destination) {
          await expect(lab.locator('.next-token__probability')).toHaveText(['(0.600)', '(0.200)', '(0.150)', '(0.050)']);
          for (const [j, candidate] of example.candidates.entries()) {
            const row = lab.locator('tbody tr').filter({ has: page.getByRole('rowheader', { name: candidate, exact: true }) });
            await expect(row.locator('.next-token__probability')).toHaveText(['(0.600)', '(0.200)', '(0.150)', '(0.050)'][j]);
          }
        }
        await expect(lab.locator('tbody tr[data-selected="true"] th')).toHaveText(token === '.' ? ko ? '끝 표시 .' : 'end marker .' : token);
        await expect(lab.locator('.next-token__output-token')).toHaveText(example.tokens.slice(0, i + 1));
        await expect(lab.locator('.next-token__token--new')).toHaveText(token);
        await expect(lab.locator('.next-token__token')).toHaveText(example.tokens.slice(0, i));
        await expect(lab.locator('[data-probability-context]')).toHaveText(i ? example.tokens.slice(0, i).join(' ') : ko ? '시작' : 'start');
        if (i < example.tokens.length - 1) await advance.click();
      }
      await expect(lab).toHaveAttribute('data-stage', 'finished');
      await expect(advance).toHaveText(ko ? '처음부터 다시 보기' : 'Replay from the start');
      await expect(lab.locator('tbody tr')).toHaveCount(1);
      await expect(lab.locator('.lab__hint')).toContainText(example.tokens.join(' '));
      await lab.locator('.next-token__details > summary').click();
      await expect(lab.locator('.next-token__path-probability')).toContainText(example.probability);
      await expect(lab.getByRole('status')).toContainText(ko ? '글쓰기를 마칩니다' : 'ends the sequence');
    }
  });

  test('the supplemental probability table shows its selected prediction and advances its whole input', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path);
      const lab = page.locator('.lab--next-token'); const example = sentenceDemo(path); const ko = path === ARTICLE_KO;
      await revealSupplement(lab);
      await expect(lab.locator('button')).toHaveCount(1);
      await expect(lab.locator('.next-token__scenes')).toHaveCount(0);
      await expect(lab.locator('.next-token__details')).toHaveCount(0);
      await expect(lab.locator('input, select')).toHaveCount(0);
      await expect(lab).toHaveAttribute('data-round', '3');
      await expect(lab).toHaveAttribute('data-interacted', 'false');
      await expect(lab.locator('.next-token__token')).toHaveText(example.tokens.slice(0, 2));
      await expect(lab.locator('.next-token__output-token')).toHaveText(example.tokens.slice(0, 3));
      await expect(lab.locator('tbody th')).toHaveText(example.candidateRounds[2]);
      await expect(lab.locator('tbody tr[data-selected="true"] th')).toHaveText(example.tokens[2]);
      await expect(lab.locator('.next-token__token--new')).toHaveText(example.tokens[2]);
      await expect(lab.locator('.next-token__probability')).toHaveText(['(0.700)', '(0.100)', '(0.150)', '(0.050)']);
      await expect(lab.getByRole('status')).toContainText('70%');
      await expect(lab.getByRole('status')).toContainText(example.tokens.slice(0, 3).join(' '));
      await lab.locator('.next-token__advance').click();
      await expect(lab).toHaveAttribute('data-round', '4');
      await expect(lab.locator('.next-token__token')).toHaveText(example.tokens.slice(0, 3));
      await expect(lab.locator('.next-token__output-token')).toHaveText(example.tokens);
      await expect(lab.locator('[data-probability-context]')).toHaveText(example.tokens.slice(0, 3).join(' '));
      await expect(lab.locator('.next-token__probability')).toHaveText(['(1.000)']);
      await expect(lab.locator('tbody th')).toHaveText(example.candidateRounds[3]);
      await expect(lab.locator('button')).toHaveCount(1);
    }
  });

  test('the supplemental sentence and probabilities fit the viewport after opening and its arrows connect before and after', async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const path of ALL_PAGES) {
      await page.goto(path);
      await page.evaluate(() => document.fonts.ready);
      const lab = page.locator('.lab--next-token');
      await revealSupplement(lab);
      await lab.evaluate(node => node.scrollIntoView({ block: 'start' }));
      for (const selector of ['.next-token__input', '.next-token__prefix', '.next-token__probability']) {
        const node = selector === '.next-token__probability' ? lab.locator('tbody tr[data-selected="true"]').locator(selector) : lab.locator(selector);
        const bounds = await node.boundingBox();
        expect(bounds).not.toBeNull();
        expect(bounds!.y).toBeGreaterThanOrEqual(0);
        expect(bounds!.y + bounds!.height, 'the input, appended result and largest probability must be visible before clicking').toBeLessThanOrEqual(page.viewportSize()!.height);
      }
      const initialCapture = testInfo.outputPath(`opening-${path.slice(0, 2)}-input.png`);
      await page.screenshot({ path: initialCapture, fullPage: false });
      await testInfo.attach(`opening-${path.slice(0, 2)}-input`, { path: initialCapture, contentType: 'image/png' });
      for (let i = 0; i < 5; i++) {
        const before = (await lab.locator('.next-token__context').boundingBox())!;
        const arrow = (await lab.locator('.next-token__arrow').boundingBox())!;
        const after = (await lab.locator('.next-token__after').boundingBox())!;
        expect(arrow.x).toBeGreaterThanOrEqual(before.x + before.width);
        expect(arrow.x + arrow.width).toBeLessThanOrEqual(after.x);
        for (const bounds of [before, arrow, after]) {
          expect(bounds.x).toBeGreaterThanOrEqual(0);
          expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize()!.width);
        }
        if (i < 2) {
          const capture = testInfo.outputPath(`opening-${path.slice(0, 2)}-${i === 0 ? 'append' : 'end'}.png`);
          await lab.screenshot({ path: capture });
          await testInfo.attach(`opening-${path.slice(0, 2)}-${i}`, { path: capture, contentType: 'image/png' });
        }
        await lab.locator('.next-token__advance').click();
      }
    }
  });

  test('a single manual action advances a prediction and replays from the keyboard without timers', async ({ page }) => {
    await page.clock.install();
    for (const path of ALL_PAGES) {
      await page.goto(path);
      const ko = path === ARTICLE_KO; const lab = page.locator('.lab--next-token');
      await revealSupplement(lab);
      await expect(lab.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr', '');
      await expect(lab.locator('button')).toHaveCount(1);
      await expect(lab.getByRole('button', { name: /^(?:자동으로 보기|재생|일시정지|Play|Pause)$/i })).toHaveCount(0);
      await expect(lab).not.toHaveAttribute('data-playing');
      const advance = lab.locator('.next-token__advance');
      await page.clock.fastForward(60_000);
      await expect(lab).toHaveAttribute('data-round', '3');
      await advance.focus(); await page.keyboard.press('Enter');
      await expect(lab).toHaveAttribute('data-stage', 'finished');
      await expect(lab).toHaveAttribute('data-round', '4');
      await page.clock.fastForward(60_000);
      await expect(lab).toHaveAttribute('data-round', '4');
      await expect(advance).toHaveText(ko ? '처음부터 다시 보기' : 'Replay from the start');
      await advance.focus(); await page.keyboard.press('Enter');
      await expect(lab).toHaveAttribute('data-round', '1');
      await expect(lab.locator('.next-token__token')).toHaveCount(0);
      await expect(lab.locator('.next-token__output-token')).toHaveText(sentenceDemo(path).tokens.slice(0, 1));
      await page.clock.fastForward(60_000);
      await expect(lab).toHaveAttribute('data-round', '1');
    }
  });

  test('the newest appended token is distinct from earlier tokens and replay returns to the first prediction', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const path of ALL_PAGES) {
      await page.goto(path);
      const lab = page.locator('.lab--next-token'); const example = sentenceDemo(path);
      await revealSupplement(lab);
      await lab.locator('.next-token__advance').click();
      await expect(lab.locator('.next-token__output-token')).toHaveText(example.tokens);
      await expect(lab.locator('.next-token__token--new')).toHaveText('.');
      await expect(lab.locator('.next-token__input')).toContainText(example.beforeEnd);
      const style = await lab.locator('.next-token__output-token').evaluateAll(nodes => nodes.map(node => {
        const s = getComputedStyle(node); return { weight: Number(s.fontWeight), border: parseFloat(s.borderTopWidth), background: s.backgroundColor, size: parseFloat(s.fontSize), animation: s.animationName };
      }));
      const newest = style.at(-1)!;
      expect(newest.weight).toBeGreaterThan(style[0].weight);
      expect(newest.border).toBeGreaterThan(style[0].border);
      expect(newest.background).not.toBe(style[0].background);
      expect(newest.size).toBeGreaterThanOrEqual(22);
      expect(newest.animation).toBe('none');
      await lab.locator('.next-token__advance').click();
      await expect(lab).toHaveAttribute('data-round', '1');
      await expect(lab.locator('.next-token__token')).toHaveCount(0);
      await expect(lab.locator('.next-token__output-token')).toHaveText(example.tokens.slice(0, 1));
      await expect(lab.locator('.next-token__token--new')).toHaveText(example.tokens[0]);
      await expect(lab.locator('tbody tr')).toHaveCount(4);
    }
  });

  test('manual token transitions respect reduced motion and the first prediction is static', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto(path);
      const lab = page.locator('.lab--next-token'); const advance = lab.locator('.next-token__advance');
      await revealSupplement(lab);
      expect(await lab.locator('.next-token__token--new').evaluate(node => getComputedStyle(node).animationName)).toBe('none');
      for (const bar of await lab.locator('.probability-bar').all()) expect(await bar.evaluate(node => getComputedStyle(node).animationName)).toBe('none');
      await advance.click();
      expect(await lab.locator('.next-token__token--new').evaluate(node => getComputedStyle(node).animationName)).toBe('none');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(path);
      await revealSupplement(lab);
      expect(await lab.locator('.next-token__token--new').evaluate(node => getComputedStyle(node).animationName)).toBe('none');
      await lab.locator('.next-token__advance').click();
      expect(await lab.locator('.next-token__token--new').evaluate(node => getComputedStyle(node).animationName)).not.toBe('none');
    }
  });

  test('the accumulated token row and the one action wrap on a narrow screen with enlarged text', async ({ page }) => {
    await page.setViewportSize({ width: 280, height: 844 });
    for (const path of ALL_PAGES) {
      await page.goto(path);
      const lab = page.locator('.lab--next-token'); const example = sentenceDemo(path);
      await revealSupplement(lab);
      await lab.locator('.next-token__advance').click();
      await page.evaluate(() => document.documentElement.style.fontSize = '200%');
      const box = await lab.locator('.next-token__prefix').evaluate(node => {
        const bounds = node.getBoundingClientRect();
        return { width: node.clientWidth, scroll: node.scrollWidth, left: bounds.left, right: bounds.right, items: [...node.querySelectorAll('.next-token__output-token')].map(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; }) };
      });
      expect(box.scroll).toBeLessThanOrEqual(box.width);
      expect(box.right).toBeLessThanOrEqual(280);
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.items).toHaveLength(example.tokens.length);
      for (const item of box.items) { expect(item.left).toBeGreaterThanOrEqual(box.left - 1); expect(item.right).toBeLessThanOrEqual(box.right + 1); }
      const earlier = box.items.at(-2)!; const last = box.items.at(-1)!;
      expect(last.top).toBeGreaterThanOrEqual(earlier.bottom - 1);
      await expect(lab.locator('.next-token__token--new')).toHaveText('.');
      const button = await lab.locator('.next-token__advance').boundingBox();
      expect(button).not.toBeNull();
      expect(button!.x).toBeGreaterThanOrEqual(0);
      expect(button!.x + button!.width).toBeLessThanOrEqual(280);
      await expect(lab.locator('button')).toHaveCount(1);
    }
  });

  test('the shared sentence retains its embedding rows through transformation and computed candidate selection', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path);
      const words=sentenceDemo(path).tokens.slice(0,3);
      const overview=page.locator('[data-learning-overview]');
      await expect(overview).toBeVisible();
      expect(await overview.evaluate(node=>Boolean(node.compareDocumentPosition(document.querySelector('[data-section="tokens"]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
      await overview.getByRole('link',{name:path==='ko/' ? '이어서 해보기' : 'Connect the calculations',exact:true}).click();
      await expect(page.locator('#doc-nav [data-current-lesson]')).toContainText('9/12');
      await expect(page.locator('[data-section="big-picture"]')).toBeInViewport();
      const lookup=page.locator('.lab--embedding-lookup');
      const expectedRows=['(1, 0, 1, 0)','(0, 1, 0, 1)','(1, 1, 0, 0)'];
      for (let i=0;i<3;i++) {
        await lookup.getByRole('button',{name:`${words[i]} · ID ${i}`,exact:true}).click();
        await expect(lookup.locator('.embedding-lookup__vector')).toHaveText(expectedRows[i]);
      }
      const matrix=page.locator('#numbers .lab--matmul[data-matmul-mode=interactive]');
      await revealSupplement(matrix);
      expect(await matrix.locator('.emat--q input').evaluateAll(inputs=>inputs.map(input=>(input as HTMLInputElement).value))).toEqual(['1','0','1','0','0','1','0','1','1','1','0','0']);
      await expect(matrix.locator('.mgrid--score .mgrid__value')).toHaveText(['2','0','0','2','1','1']);
      const trace=page.locator('.lab--layer-trace');
      await expect(trace.locator('.mgrid__rowlabel')).toHaveText(words);
      await expect(trace.locator('.mgrid__value')).toHaveText(['1.000','0.000','1.000','0.000','0.000','1.000','0.000','1.000','1.000','1.000','0.000','0.000']);
      await chooseStep(trace, 'last');
      await expect(trace).toHaveAttribute('data-stage','probabilities');
      await expect(trace.locator('.mgrid__collabel')).toHaveText([...words,'.']);
      const probabilities=['0.219','0.154','0.036','0.591'];
      await expect(trace.locator('tbody tr').last().locator('.mgrid__value')).toHaveText(probabilities);
      const choice=page.locator('.lab--token-choice');
      await expect(choice.locator('.token-choice__probability')).toHaveText(probabilities);
      await expect(choice.locator('tbody th')).toHaveText(words.map((word,i)=>`${i} · ${word}`).concat(path==='ko/' ? '3 · 끝 표시 .' : '3 · end marker .'));
    }
  });

  test('one actual weight update changes the displayed weight, probability and loss', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path); const lab=page.locator('.lab--learning-update');
      await expect(lab.locator('.learning-update__weight')).toHaveText('0.000');
      await expect(lab.locator('.learning-update__loss')).toHaveText('0.693147');
      await expect(lab.locator('.learning-update__after-loss')).toHaveText('0.644397');
      await lab.getByRole('button', { name: path==='ko/' ? '이 갱신을 한 번 적용' : 'Apply this update once' }).click();
      await expect(lab.locator('.learning-update__weight')).toHaveText('0.100');
      await expect(lab.locator('.learning-update__loss')).toHaveText('0.644397');
      await expect(lab.locator('.learning-update__steps')).toContainText('1');
    }
  });

  test('the input changes the weight-update direction and zero input gives no update', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path);
      const lab = page.locator('.lab--learning-update');
      const input = lab.getByRole('slider', {name: path==='ko/' ? '입력 x' : 'Input x', exact:true});
      await input.focus(); await input.press('Home');
      await expect(lab.locator('.learning-update__gradient')).toHaveText('0.500000');
      await lab.getByRole('button', {name: path==='ko/' ? '이 갱신을 한 번 적용' : 'Apply this update once'}).click();
      await expect(lab.locator('.learning-update__weight')).toHaveText('−0.100');
      await expect(lab.locator('.learning-update__loss')).toHaveText('0.644397');
      await input.focus(); await input.press('ArrowRight');
      await expect(lab.locator('.learning-update__gradient')).toHaveText('0.000000');
      await expect(lab.locator('.learning-update__loss')).toHaveText('0.693147');
      await lab.getByRole('button', {name: path==='ko/' ? '이 갱신을 한 번 적용' : 'Apply this update once'}).click();
      await expect(lab.locator('.learning-update__weight')).toHaveText('−0.100');
      await expect(lab.locator('.learning-update__after-loss')).toHaveText('0.693147');
    }
  });

  test('the integrated block reaches vocabulary probabilities and reacts to position input', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path); const lab=page.locator('.lab--layer-trace');
      await chooseStep(lab, 'last');
      await expect(lab).toHaveAttribute('data-stage','probabilities');
      const before=await lab.locator('.layer-trace__prediction').innerText();
      const values=await lab.locator('.mgrid__value').allTextContents();
      expect(values).toHaveLength(12);
      for (let i=0;i<3;i++) expect(values.slice(i*4,i*4+4).reduce((sum,v)=>sum+Number(v),0)).toBeCloseTo(1,2);
      await openFold(lab, '.layer-trace__settings');
      await lab.getByRole('checkbox').uncheck();
      await expect(lab.locator('.layer-trace__prediction')).not.toHaveText(before);
    }
  });

  test('the position checkbox stays beside its label and controls only the toy input calculation', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path);
      const lab = page.locator('.lab--layer-trace');
      await openFold(lab, '.layer-trace__settings');
      const checkbox = lab.getByRole('checkbox');
      const alignment = await checkbox.locator('..').evaluate(label => {
        const input = label.querySelector('input')!.getBoundingClientRect();
        const text = label.querySelector('span') ?? [...label.childNodes].find(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())!;
        const range = document.createRange(); range.selectNodeContents(text);
        const box = range.getBoundingClientRect();
        return { vertical: Math.abs((input.top+input.height/2)-(box.top+box.height/2)), gap: box.left-input.right };
      });
      expect(alignment.vertical, 'checkbox and label must share a line').toBeLessThan(4);
      expect(alignment.gap).toBeGreaterThanOrEqual(0);
      expect(alignment.gap).toBeLessThan(16);
      await expect(checkbox).toHaveAccessibleName(path==='ko/' ? '위치 정보 포함하기' : 'Include position information');
      await expect(checkbox).toBeChecked();
      await chooseStep(lab, 1);
      expect((await lab.locator('.mgrid__value').allTextContents()).slice(0,4)).toEqual(['1.000','1.000','1.000','1.000']);
      await checkbox.focus(); await checkbox.press('Space');
      await expect(checkbox).not.toBeChecked();
      expect((await lab.locator('.mgrid__value').allTextContents()).slice(0,4)).toEqual(['1.000','0.000','1.000','0.000']);
      await page.reload();
      await openFold(lab, '.layer-trace__settings');
      await expect(checkbox).toBeChecked();
    }
  });

  test('sampling can choose different tokens from unchanged logits', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path); const lab=page.locator('.lab--token-choice');
      const initialScores=await lab.locator('tbody td:nth-child(2)').allTextContents();
      const initialProbabilities=await lab.locator('.token-choice__probability').allTextContents();
      await lab.getByRole('button',{name:'sampling',exact:true}).click();
      const u=lab.getByRole('slider').nth(1);
      await u.focus(); await u.press('Home');
      await expect(lab.locator('.token-choice__selected')).toHaveText(path==='ko/' ? '나는' : 'I');
      await u.press('End'); await expect(lab.locator('.token-choice__selected')).toHaveText('.');
      expect(await lab.locator('tbody td:nth-child(2)').allTextContents()).toEqual(initialScores);
      expect(await lab.locator('.token-choice__probability').allTextContents()).toEqual(initialProbabilities);
      const before=initialProbabilities.map(Number);
      const temperature=lab.getByRole('slider').first(); await temperature.focus(); await temperature.press('End');
      const after=(await lab.locator('.token-choice__probability').allTextContents()).map(Number);
      expect(Math.max(...after)).toBeLessThan(Math.max(...before));
    }
  });

  test('math help is local, collapsed by default and accessible from the keyboard', async ({ page }) => {
    const expected = {
      'language-model':'conditional', tokens:'shape', numbers:'sum', proportion:'softmax',
      attention:'attention', positions:'position', 'multi-head':'multi-head', blocks:'layernorm',
      'big-picture':'readout', training:'gradient', generation:'temperature', results:'cost',
    };
    for (const path of ALL_PAGES) {
      await page.goto(path);
      await expect(page.locator('#symbols, .math-primer')).toHaveCount(0);
      await expect(page.locator('[data-local-math][open]')).toHaveCount(0);
      for (const [unit, help] of Object.entries(expected)) {
        await expect(page.locator(`[data-section="${unit}"] #math-${help}`)).toHaveCount(1);
      }
      const sum = page.locator('#math-sum');
      const summary = sum.locator(':scope > summary');
      await summary.focus(); await summary.press('Space');
      await expect(sum).toHaveAttribute('open','');
      await expect(sum.locator('.expand__body')).toContainText('2 + 3 + 5');
      await summary.press('Enter');
      await expect(sum).not.toHaveAttribute('open','');
      const gradient = page.locator('#math-gradient');
      await gradient.locator(':scope > summary').focus();
      await gradient.locator(':scope > summary').press('Space');
      await expect(gradient).toHaveAttribute('open','');
      await expect(gradient.locator('.expand__body')).toContainText('0.693647');
      await expect(gradient.locator('.expand__body')).toContainText('0.1');
    }
  });

  test('a direct link opens the local calculation and marks its owning unit', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path+'#math-gradient');
      await expect(page.locator('#math-gradient')).toHaveAttribute('open','');
      await expect(page.locator('#math-gradient')).toBeInViewport();
      await expect(page.locator('#doc-nav [data-current-lesson]')).toContainText('10/12');
      await expect(page.locator('#doc-nav [data-toc-stage="use"]')).toHaveAttribute('open','');
    }
  });

  test('smoothing loss can be lower for a low correct probability', async ({ page }) => {
    await page.goto(ARTICLE_KO); const lab=page.locator('.lab--loss');
    const probability=lab.getByRole('slider').first(); await expect(probability).toBeEnabled(); await probability.focus(); await probability.press('Home');
    for (let i=0;i<7;i++) await probability.press('ArrowRight');
    await expect(probability).toHaveValue('0.08');
    await openFold(lab, '.loss__comparison');
    const labels=await lab.locator('.loss__comparison svg').locator('text').allTextContents();
    const losses=labels.filter(s=>s.includes(' = ')).map(s=>Number(s.split('=').at(-1)));
    expect(losses).toHaveLength(2);
    expect(losses[0]).toBeCloseTo(2.526,3); expect(losses[1]).toBeCloseTo(2.429,3);
    expect(losses[1]).toBeLessThan(losses[0]);
  });
});


test('contents prioritizes the current coarse stage and opens fine headings on demand', async ({ page }) => {
  for (const path of ALL_PAGES) {
    await page.goto(path + '#training');
    const toc=page.locator('#doc-nav');
    await expect(toc.locator('[data-toc-stage][open]')).toHaveCount(1);
    await expect(toc.locator('[data-toc-stage="use"]')).toHaveAttribute('open','');
    await expect(toc.locator('[data-current-lesson]')).toContainText('10/12');
    await expect(toc.locator('.toc__details')).not.toHaveAttribute('open','');
    await toc.locator('.toc__details > summary').click();
    await expect(toc.locator('.toc__sublist')).toBeVisible();
    await expect(toc.locator('[data-section-link]')).toHaveCount(12);
    await toc.locator('[data-toc-stage="start"] > summary').click();
    await toc.locator('a[href="#tokens"]').click();
    await expect(toc.locator('[data-current-lesson]')).toContainText('2/12');
    await expect(toc.locator('[data-toc-stage][open]')).toHaveCount(1);
  }
});


test.describe('visible static transpose explanation', () => {
  test('one shared comparison pair keeps the same values and score when its right row stands up', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path);
      const diagram = page.locator('#numbers svg[aria-labelledby="tf-t tf-d"]');
      await expect(diagram.locator('.hp__value')).toHaveText(['2','0','2','0','2','0','2','0','4']);
      await expect(diagram.locator('[data-pair-row="left"] .hp__value')).toHaveText(['2','0']);
      await expect(diagram.locator('[data-pair-row="right"] .hp__value')).toHaveText(['2','0']);
      await expect(diagram.locator('[data-pair-product="left"] .hp__value')).toHaveText(['2','0']);
      await expect(diagram.locator('[data-pair-product="right"] .hp__value')).toHaveText(['2','0']);
      await expect(diagram.locator('[data-pair-equation]')).toHaveText(['2 × 2 + 0 × 0 = 4','2 × 2 + 0 × 0 = 4']);
      await expect(diagram.locator('[data-pair-result]')).toHaveText('4');
      const row = await diagram.locator('[data-pair-row="right"] rect').evaluateAll(nodes=>nodes.map(el=>({x:el.getAttribute('x'),y:el.getAttribute('y'),fill:el.getAttribute('fill')})));
      const column = await diagram.locator('[data-pair-product="right"] rect').evaluateAll(nodes=>nodes.map(el=>({x:el.getAttribute('x'),y:el.getAttribute('y'),fill:el.getAttribute('fill')})));
      expect(row).toHaveLength(2); expect(column).toHaveLength(2);
      expect(row[0].y).toBe(row[1].y); expect(Number(row[1].x)).toBeGreaterThan(Number(row[0].x));
      expect(column[0].x).toBe(column[1].x); expect(Number(column[1].y)).toBeGreaterThan(Number(column[0].y));
      expect(column.map(cell=>cell.fill)).toEqual(row.map(cell=>cell.fill));
      expect(new Set(row.map(cell=>cell.fill)).size).toBe(2);
      expect(await diagram.evaluate(el=>el.getBoundingClientRect().width)).toBeGreaterThanOrEqual(560);
      await expect(diagram.locator('#tf-d')).toContainText('X');
      await expect(diagram.locator('#tf-d')).not.toContainText('Q');
      await expect(diagram.locator('#tf-d')).not.toContainText('K');
    }
  });
});


test.describe('static Q–K comparisons', () => {
  test('three visible steps keep the pair, key rows, transpose columns and raw scores identical', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path);
      const walk = page.locator('[data-qk-score-walk]');
      await expect(walk).toHaveCount(1);
      await expect(walk.locator('[data-step]')).toHaveCount(3);
      await expect(walk.locator('figure figcaption')).toHaveCount(3);
      await expect(walk.locator('button, input, select, details, astro-island')).toHaveCount(0);
      await expect(walk.locator('.qkw__positions span')).toHaveText(path===ARTICLE_KO ? ['1: 나는','2: 학교에','3: 갔다'] : ['1: I','2: went','3: to school']);
      await expect(walk.locator('[data-pair-value]')).toHaveAttribute('data-pair-value','4');
      await expect(walk.locator('[data-query-value]')).toHaveText(['2','0']);
      await expect(walk.locator('[data-key-value]')).toHaveText(['2','0']);
      await expect(walk.locator('[data-matrix="qkw-pair"] .mgrid__value')).toHaveText(['2','0','2','0']);
      await expect(walk.locator('[data-matrix="qkw-k"] .mgrid__value')).toHaveText(['0','2','2','0','1','1']);
      for (const id of ['qkw-kt','qkw-product-kt']) {
        await expect(walk.locator(`[data-matrix="${id}"] .mgrid__value`)).toHaveText(['0','2','1','2','0','1']);
        await expect(walk.locator(`[data-matrix="${id}"] .mgrid__shape`)).toHaveText('2 × 3');
      }
      await expect(walk.locator('[data-matrix="qkw-q"] .mgrid__value')).toHaveText(['2','0','0','2','1','1']);
      await expect(walk.locator('[data-product-value]')).toHaveText(path===ARTICLE_KO ? ['기여: 4','기여: 0'] : ['contribution: 4','contribution: 0']);
      const one = walk.locator('[data-step="2"]');
      await expect(one.locator('[data-comparison-shape]')).toHaveAttribute('data-comparison-shape','1 × 3');
      await expect(one.locator('.qkw__score-value')).toHaveText(['0','4','2']);
      await expect(one.locator('[data-candidate-calculation]')).toHaveText(['2×0 + 0×2','2×2 + 0×0','2×1 + 0×1']);
      await expect(one.locator('[data-selected="true"] .qkw__score-value')).toHaveText('4');
      await expect(one.locator('[data-future="true"]')).toHaveCount(0);
      const all = walk.locator('[data-step="3"]');
      await expect(all.locator('[data-comparison-shape]')).toHaveAttribute('data-comparison-shape','3 × 3');
      await expect(all.locator('.qkw__scores tbody .qkw__score-value')).toHaveText(['0','4','2','4','0','2','2','2','2']);
      await expect(all.locator('[data-selected="true"] .qkw__score-value')).toHaveText('4');
      const future = all.locator('[data-future="true"]');
      await expect(future).toHaveCount(3);
      expect(await future.evaluateAll(cells => cells.map(cell => [cell.getAttribute('data-r'),cell.getAttribute('data-c')]))).toEqual([['0','1'],['0','2'],['1','2']]);
      await expect(all.locator('.qkw__legend')).toContainText(path===ARTICLE_KO ? '가리기 전 점수' : 'raw scores before masking');
      await expect(all.locator('[data-desired-row]')).toHaveText('2, 0');
      await expect(all.locator('[data-wrong-column]')).toHaveText('0, 2, 1');
      await expect(all.locator('[data-matching-column]')).toHaveText('2, 0');
      await expect(all.locator('[data-incompatible-shapes]')).toContainText(path===ARTICLE_KO ? '행렬곱을 할 수 없습니다' : 'cannot be multiplied');
      await expect(all.locator('[data-square-reason]')).toContainText(path===ARTICLE_KO ? '양쪽 토큰 수가 각각 3' : 'each side has 3 tokens');
      expect(await all.locator('[data-matrix="qkw-k"] .mgrid__cell--static[data-c="0"]').evaluateAll(nodes=>nodes.map(el=>getComputedStyle(el).outlineStyle))).toEqual(['dashed','dashed','dashed']);
    }
  });

  test('key row colours follow their columns in both themes and the static tables stay within the page', async ({ page }) => {
    for (const path of ALL_PAGES) {
      await page.goto(path);
      for (const theme of ['light','dark']) {
        await page.evaluate(theme => document.documentElement.setAttribute('data-theme',theme),theme);
        const walk = page.locator('[data-qk-score-walk]');
        for (let i=0;i<3;i++) {
          const row = await walk.locator(`[data-matrix="qkw-k"] .mgrid__cell--static[data-r="${i}"]`).evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
          const column = await walk.locator(`[data-matrix="qkw-kt"] .mgrid__cell--static[data-c="${i}"]`).evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
          const repeated = await walk.locator(`[data-matrix="qkw-product-kt"] .mgrid__cell--static[data-c="${i}"]`).evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
          expect(row).toHaveLength(2); expect(column).toEqual(row); expect(repeated).toEqual(row);
          expect(row[0]).not.toBe('rgba(0, 0, 0, 0)');
        }
        const keyColour = await walk.locator('[data-matrix="qkw-k"] .mgrid__cell--static[data-r="1"]').first().evaluate(node=>getComputedStyle(node).backgroundColor);
        expect(await walk.locator('[data-matrix="qkw-pair"] .mgrid__cell--static[data-r="1"]').first().evaluate(node=>getComputedStyle(node).backgroundColor)).toBe(keyColour);
        const numericStyles = await walk.locator('.mgrid__value, .qkw__scores tbody td').evaluateAll(nodes=>nodes.map(node=>({size:parseFloat(getComputedStyle(node).fontSize),colour:getComputedStyle(node).color})));
        expect(numericStyles.every(style=>style.size>=16)).toBe(true);
        for (const selector of ['.figure__frame','.mgrid','.qkw__scores']) {
          for (const bounds of await walk.locator(selector).evaluateAll(nodes=>nodes.map(node=>{const r=node.getBoundingClientRect();return {left:r.left,right:r.right};}))) {
            expect(bounds.left).toBeGreaterThanOrEqual(0);
            expect(bounds.right).toBeLessThanOrEqual(page.viewportSize()!.width);
          }
        }
      }
    }
  });
});


test('the article title, visual subtitle and first lesson question match their metadata and hierarchy', async ({ page }) => {
  for (const path of ALL_PAGES) {
    await page.goto(path);
    const ko = path === ARTICLE_KO;
    const title = ko ? '눈으로 이해하는 LLM 원리' : 'LLM Principles, Visually Explained';
    const lead = ko ? '문장을 만드는 과정을 한 단계씩 따라가기' : 'Follow how a sentence is generated, step by step.';
    await expect(page.locator('main h1')).toHaveText(title);
    await expect(page).toHaveTitle(`${title} — LLM Visual Lab`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content',lead);
    await expect(page.locator('.doc-header__lead')).toHaveText(lead);
    await expect(page.locator('#course-nav a[aria-current="page"]')).toHaveText(title);
    const lab = page.locator('.lab--generation-journey');
    await expect(lab.locator('.lab__title')).toHaveText(ko ? 'LLM은 어떻게 다음 말을 만들까?' : 'How does an LLM continue text?');
    await expect(lab.locator('.journey__next')).toHaveCount(1);
    await expect(lab.locator('.journey__previous')).toBeDisabled();
    await expect(page.locator('.doc-header')).not.toContainText(ko ? '작은 숫자로' : 'Small Numbers');
    const openingHeadings = await page.locator('.doc-header h1, .lab--generation-journey .lab__title').allTextContents();
    expect(openingHeadings.filter(heading=>heading.includes('?'))).toHaveLength(1);
    await expect(lab.locator('[data-journey-input] .journey-token')).toHaveText(ko ? ['나는','학교에'] : ['I','went']);
    await expect(lab.locator('[data-journey-input] [data-token-id=2]')).toHaveCount(0);
    await expect(page.locator('#math-transpose summary')).toContainText(ko ? '작은 숫자로' : 'small numbers');
  }
});


test('learning prose omits lab bookkeeping and retains numerical scope and observation cues', async ({ page }) => {
  for (const path of ALL_PAGES) {
    await page.goto(path);
    const ko = path===ARTICLE_KO;
    await expect(page.locator('main')).not.toContainText(ko ? '다른 실습에는 각자의 처음값이 남습니다' : 'other labs keep their own inputs');
    await expect(page.locator('main')).not.toContainText(ko ? '각 단계에 무슨 일이 일어나는지' : 'Each step explains what is happening');
    await expect(page.locator('main')).not.toContainText(ko ? '이 예제 코드도 곱한 확률과 더한 로그를 둘 다 보존합니다' : 'This example’s code retains both');
    await expect(page.locator('#tokens')).toContainText(ko ? '학습으로 벡터와 가중치를 조정합니다' : 'adjust vectors and weights through learning');
    await expect(page.locator('#tokens')).toContainText(ko ? '손으로 계산할 수 있도록 작은 예시 숫자' : 'small illustrative numbers that can be worked out by hand');
    await expect(page.locator('#tokens')).not.toContainText(ko ? '학교의 의미를 학습한 것은 아닙니다' : 'Naming a row “school”');
    await expect(page.locator('#language-model')).toContainText(ko ? '정해 놓은 예시 확률표' : 'chosen example probability tables');
    await expect(page.locator('#training')).toContainText(ko ? '실제 LLM의 수많은 가중치·데이터·역전파 전체' : 'all the weights, data or backpropagation of a real LLM');
    await expect(page.locator('#big-picture')).toContainText(ko ? '도식의 ID·확률은 설명용' : 'IDs and probabilities are illustrative');
    const attention = page.locator('.lab--attention');
    await chooseStep(attention, 1);
    await attention.locator('.lab__inputs > summary').click();
    await expect(attention.locator('#lab-inputs-hint')).toHaveText(ko ? '바꾼 값은 이 실습에만 적용됩니다.' : 'Changes apply only to this lab.');
  }
});

test('the projection creates one position’s new features while keeping X visible and reconstruction qualified', async ({ page }) => {
  for (const path of ALL_PAGES) {
    await page.goto(path);
    const ko=path===ARTICLE_KO; const numbers=page.locator('#numbers');
    await expect(numbers.locator('h3').first()).toHaveText(ko ? '행렬곱 — 입력에서 새로운 특징 만들기' : 'Matrix product — creating new features from the input');
    const motivation=await numbers.locator('h3').first().evaluate(heading=>{
      const paragraphs: string[]=[]; let next=heading.nextElementSibling;
      while (next && next.tagName!=='FIGURE') {
        if (next.tagName==='P') paragraphs.push(next.textContent ?? '');
        next=next.nextElementSibling;
      }
      return paragraphs.join(' ');
    });
    expect(motivation).toContain(ko ? '예측' : 'prediction');
    expect(motivation).toContain(ko ? '학습' : 'Learning');
    expect(motivation).toContain(ko ? '가중치' : 'weights');
    const diagram=numbers.locator('svg[aria-labelledby="rc-t rc-d"]');
    await expect(diagram.locator('[data-projection="X"] .tp__num')).toHaveText(['1','0','1','0','0','1','0','1','1','1','0','0']);
    await expect(diagram.locator('[data-projection="W"] .tp__num')).toHaveText(['1','0','0','1','1','0','0','1']);
    await expect(diagram.locator('[data-projection="Y"] .tp__num')).toHaveText(['2','0','0','2','1','1']);
    await expect(diagram.locator('#rc-d')).toContainText(ko ? 'X는 입력으로 남고' : 'X remains available as the input');
    await expect(diagram.locator('[data-learning-weights]')).toHaveText(ko ? '학습에서 조합을 조정' : 'Adjusted during learning');
    const lab=numbers.locator('.lab--matmul[data-matmul-mode=interactive]').first();
    await openFold(lab, '.matmul__inputs');
    const x=lab.locator('[data-matrix="X"] input');
    const before=await x.evaluateAll(inputs=>inputs.map(input=>(input as HTMLInputElement).value));
    expect(before).toEqual(['1','0','1','0','0','1','0','1','1','1','0','0']);
    await lab.locator('[data-matrix="W"] [data-r="2"][data-c="0"] input').fill('2');
    await expect(lab.locator('[data-matrix="Y"] .mgrid__value')).toHaveText(['3','0','0','2','1','1']);
    await lab.locator('[data-matrix="Y"] button[data-r="2"][data-c="1"]').click();
    expect(await x.evaluateAll(inputs=>inputs.map(input=>(input as HTMLInputElement).value))).toEqual(before);
    await numbers.locator('#math-matmul > summary').click();
    await expect(numbers.locator('#math-matmul')).toContainText(ko ? 'Y만으로 원래 X를 항상 복원할 수는 없습니다' : 'Y alone cannot always reconstruct the original X');
  }
});


test.describe('review regressions: controls and current values', () => {
  test('typing a negative coordinate preserves its sign in every numeric editor', async ({ page }) => {
    await page.goto(ARTICLE_EN);
    const cases = [
      ['.lab--dot .vecinput__field', '.lab--dot'],
      ['.lab--softmax .softmax__score', '.lab--softmax'],
      ['.lab--layernorm .softmax__score', '.lab--layernorm'],
      ['#numbers .emat__input', '#numbers .lab--matmul[data-matmul-mode=interactive]'],
    ];
    for (const [selector, labSelector] of cases) {
      const input = page.locator(selector).first();
      const lab = page.locator(labSelector).first();
      await revealSupplement(lab);
      if (labSelector.startsWith('#numbers')) await openFold(lab, '.matmul__inputs');
      await input.click();
      await input.pressSequentially('-2');
      await expect(input).toHaveValue('-2');
      await input.blur();
      await expect(input).toHaveValue('-2');
      expect(await lab.innerText()).not.toContain('NaN');
      await input.click();
      await input.press('Backspace');
      await expect(input).toHaveValue('');
      expect(await lab.innerText()).not.toContain('NaN');
      await input.blur();
      await expect(input).toHaveValue('-2');
    }
    await expect(page.locator('.lab--dot .terms__total')).toHaveText('−4');
    await expect(page.locator('#numbers .lab--matmul[data-matmul-mode=interactive] .mgrid--score .mgrid__value')).toHaveText(['−1','0','0','2','1','1']);
  });

  for (const path of ALL_PAGES) {
    test(`${path}: initial steps show only the current calculation and few controls`, async ({ page }) => {
      await page.goto(path);
      const attention = page.locator('.lab--attention');
      expect(await attention.locator('button:visible').count()).toBe(3);
      expect(await attention.locator('input:visible').count()).toBe(0);
      await expect(attention.locator('.lab__stage [data-matrix="X"]')).toBeVisible();
      await expect(attention.locator('.terms__table')).toHaveCount(0);
      const trace = page.locator('.lab--layer-trace');
      expect(await trace.locator('button:visible').count()).toBe(2);
      await expect(trace.locator('.layer-trace__prediction')).toHaveCount(0);
      await chooseStep(trace, 'last');
      await expect(trace.locator('.layer-trace__prediction')).toBeVisible();
      await expect(trace.locator('.stepper__current')).toContainText('8/8');
      const active = trace.locator('[aria-current="step"]');
      const bounds = await active.evaluate(el => {
        const b = el.getBoundingClientRect();
        const rail = el.closest('.stepper__list')!.getBoundingClientRect();
        return { left: b.left - rail.left, right: rail.right - b.right };
      });
      expect(bounds.left).toBeGreaterThanOrEqual(-1);
      expect(bounds.right).toBeGreaterThanOrEqual(-1);
    });

    test(`${path}: edited attention guidance agrees with the displayed matrices`, async ({ page }) => {
      await page.goto(path);
      const lab = page.locator('.lab--attention');
      await openFold(lab, '.lab__inputs');
      await lab.locator('[data-matrix="X"] input').first().fill('3');
      await chooseStep(lab, 2);
      await expect(lab.locator('.note--why')).toContainText('(4, 0)');
      await expect(lab.locator('.note--why')).toContainText('(0, 8, 4)');
      await expect(lab.locator('.mgrid--score .mgrid__value')).toHaveText(['0','8','4','8','0','2','4','2','2']);
      await chooseStep(lab, 5);
      await expect(lab.locator('.note--try')).toContainText('(0.673, 0.164, 0.164)');
      await chooseStep(lab, 6);
      await expect(lab.locator('.note--try')).toContainText('(3.528, 0.654)');
    });

    test(`${path}: mixture shares stay nonnegative and sum to one`, async ({ page }) => {
      await page.goto(path);
      const lab = page.locator('#proportion .lab--matmul[data-matmul-mode=interactive]');
      await revealSupplement(lab);
      const p = lab.getByRole('slider');
      for (const key of ['Home', 'End', 'ArrowLeft']) {
        await p.focus(); await p.press(key);
        const shares = (await lab.locator('.mgrid--q .mgrid__value').allTextContents()).map(Number);
        expect(shares).toHaveLength(2);
        expect(shares.every(x => x >= 0 && x <= 1)).toBe(true);
        expect(shares.reduce((a,b) => a+b,0)).toBeCloseTo(1, 12);
        await expect(lab.locator('.mgrid--score .mgrid__value')).toHaveText(Number.isInteger(shares[0]*2+shares[1]*8) ? String(shares[0]*2+shares[1]*8) : (shares[0]*2+shares[1]*8).toFixed(3));
      }
      await lab.getByRole('button', { name: /처음 값|Reset/ }).click();
      await expect(lab.locator('.mgrid--q .mgrid__value')).toHaveText(['0.250','0.750']);
      await expect(lab.locator('.mgrid--score .mgrid__value')).toHaveText('6.500');
    });

    test(`${path}: only sampling exposes the random draw and bins`, async ({ page }) => {
      await page.goto(path);
      const lab = page.locator('.lab--token-choice');
      await expect(lab.getByRole('slider')).toHaveCount(1);
      await expect(lab.locator('.sampling-bins')).toHaveCount(0);
      await expect(lab.locator('thead th')).toHaveCount(3);
      const greedy = await lab.locator('.token-choice__selected').innerText();
      await lab.getByRole('button', { name: 'sampling', exact: true }).click();
      await expect(lab.getByRole('slider')).toHaveCount(2);
      await expect(lab.locator('.sampling-bins__draw')).toBeVisible();
      await expect(lab.locator('thead th')).toHaveCount(4);
      await lab.getByRole('button', { name: 'greedy', exact: true }).click();
      await expect(lab.getByRole('slider')).toHaveCount(1);
      await expect(lab.locator('.sampling-bins')).toHaveCount(0);
      await expect(lab.locator('.token-choice__selected')).toHaveText(greedy);
      await expect(lab.locator('.lab__note')).toContainText(path===ARTICLE_KO ? '앞 실습에서 바꾼 설정은' : 'do not carry over');
    });
  }
});


test.describe('review regressions: diagram bounds and training alignment', () => {
  for (const path of ALL_PAGES) {
    test(`${path}: annotations stay inside position, normalization and loss plots`, async ({ page }) => {
      await page.goto(path);
      const position = page.locator('.lab--position');
      await position.getByRole('slider').focus();
      await position.getByRole('slider').press('End');
      const norm = page.locator('.lab--layernorm');
      for (const value of await norm.locator('input[type="number"]').all()) await value.fill('-8');
      await norm.locator('#ln-gamma').focus(); await norm.locator('#ln-gamma').press('End');
      await norm.locator('#ln-beta').focus(); await norm.locator('#ln-beta').press('Home');
      const loss = page.locator('.lab--loss');
      await expect(loss.locator('#loss-p')).toBeEnabled();
      const reset = loss.getByRole('button', { name: /처음 값|Reset/ });
      await openFold(loss, '.loss__comparison');
      for (const key of ['Home','End']) {
        await loss.locator('#loss-p').focus(); await loss.locator('#loss-p').press(key);
        const points = await loss.locator('.loss__basic-plot').locator('text').evaluateAll(texts => texts.map(text => {
          const b = (text as SVGGraphicsElement).getBBox();
          const view = text.closest('svg')!.viewBox.baseVal;
          return { x: b.x, y: b.y, right: b.x+b.width-view.width, bottom: b.y+b.height-view.height };
        }));
        for (const p of points) { expect(p.x).toBeGreaterThanOrEqual(0); expect(p.y).toBeGreaterThanOrEqual(0); expect(p.right).toBeLessThanOrEqual(1); expect(p.bottom).toBeLessThanOrEqual(1); }
      }
      await loss.locator('#loss-eps').focus(); await loss.locator('#loss-eps').press('End');
      await reset.click();
      await expect(loss.locator('#loss-p')).toHaveValue('0.6');
      await expect(loss.locator('#loss-eps')).toHaveValue('0.1');
      for (const lab of [position, norm, loss]) {
        const overflow = await lab.locator('svg text').evaluateAll(texts => texts.map(text => {
          const b = (text as SVGGraphicsElement).getBBox();
          const v = text.closest('svg')!.viewBox.baseVal;
          return { x: b.x, y: b.y, right: b.x+b.width-v.width, bottom: b.y+b.height-v.height };
        }));
        for (const p of overflow) { expect(p.x).toBeGreaterThanOrEqual(-1); expect(p.y).toBeGreaterThanOrEqual(-1); expect(p.right).toBeLessThanOrEqual(1); expect(p.bottom).toBeLessThanOrEqual(1); }
      }
    });

    test(`${path}: FFN labels and residual formula have separate space`, async ({ page }) => {
      await page.goto(path);
      for (const id of ['ffs','rp']) {
        const svg = page.locator(`svg[aria-labelledby="${id}-t ${id}-d"]`);
        const bounds = await svg.locator('text').evaluateAll(texts => texts.map(text => {
          const b = (text as SVGGraphicsElement).getBBox(); const v = text.closest('svg')!.viewBox.baseVal;
          return { x:b.x, y:b.y, right:b.x+b.width-v.width, bottom:b.y+b.height-v.height };
        }));
        for (const b of bounds) { expect(b.x).toBeGreaterThanOrEqual(0); expect(b.y).toBeGreaterThanOrEqual(0); expect(b.right).toBeLessThanOrEqual(1); expect(b.bottom).toBeLessThanOrEqual(1); }
      }
      const ffn = page.locator('svg[aria-labelledby="ffs-t ffs-d"]');
      const spacing = await ffn.evaluate(svg => {
        const labels = [...svg.querySelectorAll('text')].map(el=>({text:el.textContent, box:(el as SVGGraphicsElement).getBBox()}));
        const cells = [...svg.querySelectorAll('rect')].map(el=>(el as SVGGraphicsElement).getBBox());
        const firstCell = Math.min(...cells.map(b=>b.y));
        const lastCell = Math.max(...cells.map(b=>b.y+b.height));
        return { headerBottom:Math.max(...labels.filter(l=>l.box.y<60).map(l=>l.box.y+l.box.height)), firstCell, lastCell, footerTop:Math.min(...labels.slice(-2).map(l=>l.box.y)), footerGap:labels.at(-1)!.box.y-(labels.at(-2)!.box.y+labels.at(-2)!.box.height) };
      });
      expect(spacing.firstCell-spacing.headerBottom).toBeGreaterThan(8);
      expect(spacing.footerTop-spacing.lastCell).toBeGreaterThan(8);
      expect(spacing.footerGap).toBeGreaterThan(8);
    });

    test(`${path}: training input is shifted and decoder preserves its three output rows`, async ({ page }) => {
      await page.goto(path);
      const training = page.locator('svg[aria-labelledby="gl-t gl-d"]');
      await expect(training.locator('[data-training-input]')).toHaveText(path===ARTICLE_KO ? ['시작','나는','학교에','갔다'] : ['start','I','went','to school']);
      await expect(training.locator('[data-training-target]')).toHaveText(path===ARTICLE_KO ? ['나는','학교에','갔다','끝'] : ['I','went','to school','end']);
      const walk = page.locator('.lab--walk');
      await chooseStep(walk, 4);
      await expect(walk.locator('.walk__frame[data-on="true"] [data-series-rows="5"] .walk__cell--out')).toHaveCount(35);
      await chooseStep(walk, 5);
      await expect(walk.locator('.walk__frame[data-on="true"] [data-series-rows="3"] .walk__cell--out')).toHaveCount(21);
      await expect(walk.locator('.stepper__current')).toContainText('6/7');
      await expect(walk).toContainText(path===ARTICLE_KO ? '정답을 한 칸 민 입력' : 'shift the target sequence right by one position');
      await expect(walk).not.toContainText('the whole correct sentence is in the input');
    });

    test(`${path}: advanced paper settings are folded and evaluation conditions are precise`, async ({ page }) => {
      await page.goto(path);
      for (const id of ['paper-translation','paper-smoothing','paper-training']) await expect(page.locator(`#${id}`)).not.toHaveAttribute('open');
      const results = page.locator('#results');
      await expect(results).toContainText(path===ARTICLE_KO ? '23~55배' : '23–55 times');
      await expect(results).toContainText(path===ARTICLE_KO ? '5개를 평균' : 'five checkpoints');
      await expect(results).toContainText(path===ARTICLE_KO ? '체크포인트 평균을 쓰지 않습니다' : 'no checkpoint averaging');
      await expect(page.locator('#generation')).toContainText('−1.609');
      await expect(page.locator('#generation')).toContainText('−0.805');
      await expect(page.locator('.lab--learning-update svg')).toContainText(path===ARTICLE_KO ? '갱신 뒤' : 'Updated');
    });
  }
});


test.describe('remaining review', () => {
  for (const path of ALL_PAGES) {
    test(`${path}: initial loss and matrices keep optional controls folded`, async ({ page }) => {
      await page.goto(path);
      const loss = page.locator('.lab--loss');
      await expect(loss.getByRole('slider')).toHaveCount(1);
      await expect(loss.locator('#loss-eps')).not.toBeVisible();
      await expect(loss.locator('.loss__basic')).toContainText('0.511');
      await expect(loss.locator('.lp__bar--target:visible')).toHaveCount(0);
      await openFold(loss, '.loss__comparison');
      await expect(loss.getByRole('slider')).toHaveCount(2);
      await expect(loss.locator('.lp__bar--target:visible')).toHaveCount(8);
      await expect(loss.locator('.loss__comparison')).toContainText('0.628');
      for (const selector of ['#numbers .lab--matmul[data-matmul-mode=interactive]', '#multi-head .lab--matmul[data-matmul-mode=interactive]']) {
        const matrix = page.locator(selector);
        await revealSupplement(matrix);
        await expect(matrix.locator('input:visible')).toHaveCount(0);
        await expect(matrix.locator('.mgrid--score button').first()).toBeVisible();
        await matrix.locator('.mgrid--score button').last().click();
        await expect(matrix.locator('.terms__total')).not.toBeEmpty();
        await openFold(matrix, '.matmul__inputs');
        expect(await matrix.locator('input:visible').count()).toBe(selector.startsWith('#numbers') ? 20 : 28);
      }
    });

    test(`${path}: default mask example has a working reset route after edits`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('#positions')).toContainText(path===ARTICLE_KO ? '기본값 기준' : 'default inputs');
      const lab = page.locator('.lab--attention');
      await openFold(lab, '.lab__inputs');
      await lab.locator('.lab__inputs [data-matrix="X"] input').first().fill('3');
      await openFold(lab, '.lab__settings');
      const on = lab.getByRole('button', { name: /켬 \(decoder|On \(decoder/ });
      await on.click(); await chooseStep(lab, 6);
      await expect(lab.locator('.mgrid--score .mgrid__value').first()).toHaveText('5.000');
      await lab.getByRole('button', { name: /처음 값으로 되돌리기|Reset/ }).click();
      await on.click(); await chooseStep(lab, 6);
      await expect(lab.locator('.mgrid--score .mgrid__value').first()).toHaveText('3.000');
    });

    test(`${path}: selected score working reaches the scaled and masked cell`, async ({ page }) => {
      await page.goto(path); const lab = page.locator('.lab--attention');
      await chooseStep(lab, 3);
      const trace = lab.locator('.attention__scoretrace');
      await expect(trace).not.toContainText('S(1, 2) = 4.000 ÷ √2');
      await expect(trace.locator('[data-score-stage="raw"]')).toHaveText('S(1, 2) = 4.000');
      await expect(trace.locator('[data-score-stage="scaled"]')).toHaveText('S(1, 2) / √2 ≈ 2.828');
      await expect(trace.locator('[data-score-stage="masked"]')).toHaveCount(0);
      await chooseStep(lab, 4);
      const masked = trace.locator('[data-score-stage="masked"]');
      await expect(masked).toHaveText('S′(1, 2) = S(1, 2) / √2 + (0.000) ≈ 2.828');
      await openFold(lab, '.lab__settings');
      await lab.getByRole('button', { name: /켬 \(decoder|On \(decoder/ }).click();
      await expect(masked).toHaveText('S′(1, 2) = S(1, 2) / √2 + (−∞) = −∞');
      const finalGrid = lab.locator('.mgrid--score').last();
      await finalGrid.locator('button[data-r="0"][data-c="0"]').click();
      await expect(trace.locator('[data-score-stage="raw"]')).toHaveText('S(1, 1) = 0.000');
      await expect(trace.locator('[data-score-stage="scaled"]')).toHaveText('S(1, 1) / √2 = 0.000');
      await expect(masked).toHaveText('S′(1, 1) = S(1, 1) / √2 + (0.000) = 0.000');
      await finalGrid.locator('button[data-r="0"][data-c="1"]').click();
      await lab.getByRole('button', { name: /^(끔|Off)$/, exact: true }).click();
      await expect(trace.locator('[data-score-stage="scaled"]')).toHaveText('S(1, 2) × 1 = 4.000');
      await expect(masked).toHaveText('S′(1, 2) = S(1, 2) + (−∞) = −∞');
      await lab.getByRole('button', { name: /끔 \(encoder|Off \(encoder/ }).click();
      await expect(masked).toHaveText('S′(1, 2) = S(1, 2) + (0.000) = 4.000');
      await lab.getByRole('button', { name: /켬 \(decoder|On \(decoder/ }).click();
      await chooseStep(lab, 5);
      await expect(lab.locator('.lab__what')).toContainText(path===ARTICLE_KO ? '허용된 유한 점수' : 'allowed finite scores');
      await expect(lab.locator('.lab__what')).toContainText(path===ARTICLE_KO ? '0' : 'zero');
    });

    test(`${path}: decoder explanation has three matching operations and step units precede the curve`, async ({ page }) => {
      await page.goto(path); const walk = page.locator('.lab--walk'); await chooseStep(walk, 5);
      await expect(walk.locator('.walk__points > li')).toHaveCount(3);
      await expect(walk.locator('.walk__points').nth(0)).toContainText(path===ARTICLE_KO ? '가려진 attention' : 'Masked attention');
      await expect(walk.locator('.walk__points')).toContainText(path===ARTICLE_KO ? '다섯 행' : 'five source rows');
      const training = page.locator('#training');
      await expect(training).toContainText(path===ARTICLE_KO ? '계수를 한 번 갱신하는 단위' : 'updates the weights once');
      const definition = training.locator('[data-training-step]');
      expect(await definition.evaluate(el=>Boolean(el.compareDocumentPosition(document.querySelector('#training svg[aria-labelledby="lrc-t lrc-d"]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    });

    test(`${path}: BLEU labels stay separate for both pairs and retain readable mobile size`, async ({ page }) => {
      await page.goto(path); const lab = page.locator('.lab--bleucost');
      for (const language of [/독일어|German/, /프랑스어|French/]) {
        await lab.getByRole('button', { name: language }).click();
        await page.evaluate(()=>document.fonts.ready);
        const boxes = await lab.locator('svg > g').evaluateAll(groups=>groups.filter(g=>g.querySelectorAll(':scope > circle').length===1).map(g=>{
          const text=g.querySelector(':scope > text') as SVGGraphicsElement;
          const b=text.getBBox();return {name:text.textContent!,x:b.x,y:b.y,w:b.width,h:b.height};
        }));
        expect(boxes.length).toBeGreaterThan(5);
        for (let i=0;i<boxes.length;i++) for (let j=i+1;j<boxes.length;j++) {
          const a=boxes[i], b=boxes[j];
          const overlap=a.x < b.x+b.w && b.x < a.x+a.w && a.y < b.y+b.h && b.y < a.y+a.h;
          expect(overlap, `${a.name} and ${b.name} labels intersect`).toBe(false);
        }
        const geometry=await lab.locator('svg').evaluate(svg=>({actual:svg.getBoundingClientRect().width,view:(svg as SVGSVGElement).viewBox.baseVal.width}));
        expect(geometry.actual).toBeGreaterThanOrEqual(geometry.view-1);
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
    });

    test(`${path}: dense paper diagrams keep their intrinsic text size at 400px`, async ({ page }) => {
      await page.setViewportSize({width:400,height:844}); await page.goto(path);
      await openFold(page.locator('#big-picture'), '#paper-translation');
      for (const id of ['lrc','xs','gl','gs']) {
        const svg=page.locator(`svg[aria-labelledby="${id}-t ${id}-d"]`);
        const b=await svg.evaluate(svg=>({actual:svg.getBoundingClientRect().width,view:(svg as SVGSVGElement).viewBox.baseVal.width}));
        expect(b.actual,id).toBeGreaterThanOrEqual(b.view-1);
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(400);
    });

    test(`${path}: ReLU distinguishes new zeros and the exponential is limited by this number format`, async ({ page }) => {
      await page.goto(path);
      const desc=page.locator('#ffs-d');
      await expect(desc).toContainText(path===ARTICLE_KO ? '음수 2칸' : '2 negative entries');
      await expect(desc).toContainText(path===ARTICLE_KO ? '이미 0인 2칸' : '2 existing zeros');
      await expect(page.locator('#proportion')).toContainText(path===ARTICLE_KO ? 'JavaScript 숫자 형식' : 'JavaScript number format');
    });
  }
});


test.describe('translation diagram readability', () => {
  for (const path of ALL_PAGES) {
    test(`${path}: 400px frames 2, 6 and 7 retain readable numbers and keyboard scrolling`, async ({ page }) => {
      await page.setViewportSize({width:400,height:844}); await page.goto(path);
      const walk=page.locator('.lab--walk');
      await expect(walk.locator('button')).toHaveCount(9);
      for (const index of [1,5,6]) {
        await chooseStep(walk,index);
        const svg=walk.locator('.walk__stage svg');
        const size=await svg.evaluate(el=>el.getBoundingClientRect().width);
        expect(size,`frame ${index+1} must retain its readable width`).toBeGreaterThanOrEqual(560);
        const numbers=await svg.locator('.walk__frame[data-on="true"] text').evaluateAll(nodes=>nodes.filter(el=>/\d/.test(el.textContent??'')).map(el=>{
          const matrix=(el as SVGGraphicsElement).getScreenCTM()!;
          return {text:el.textContent,px:parseFloat(getComputedStyle(el).fontSize)*Math.hypot(matrix.a,matrix.b)};
        }));
        expect(numbers.length).toBeGreaterThan(3);
        for (const number of numbers) expect(number.px,number.text??'number').toBeGreaterThanOrEqual(12);
        const viewport=walk.locator('.walk__stage .scroll-region__viewport');
        await expect(viewport).toHaveAttribute('tabindex','0');
        await expect(viewport).toHaveAccessibleName(/번역 구조 도표|Translation diagram/);
        await expect(walk.locator('.walk__stage .scroll-region__hint')).toBeVisible();
        await viewport.focus();
        const before=await viewport.evaluate(el=>el.scrollLeft);
        await viewport.press('ArrowRight');
        await expect.poll(()=>viewport.evaluate(el=>el.scrollLeft)).toBeGreaterThan(before);
      }
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(400);
    });

    test(`${path}: scroll cues appear only for actual overflow and react to resize`, async ({ page }) => {
      await page.setViewportSize({width:1440,height:900}); await page.goto(path);
      const loss=page.locator('.lab--loss'); await openFold(loss,'.loss__comparison');
      const region=loss.locator('.scroll-region'); const viewport=region.locator('.scroll-region__viewport');
      await expect.poll(()=>viewport.evaluate(el=>el.scrollWidth>el.clientWidth+1)).toBe(false);
      await expect(region).toHaveAttribute('data-overflow','false');
      await expect(region.locator('.scroll-region__hint')).toHaveCount(0);
      await page.setViewportSize({width:400,height:844});
      await expect.poll(()=>viewport.evaluate(el=>el.scrollWidth>el.clientWidth+1)).toBe(true);
      await expect(region).toHaveAttribute('data-overflow','true');
      await expect(region.locator('.scroll-region__hint')).toBeVisible();
      const bleu=page.locator('.lab--bleucost .scroll-region');
      await expect(bleu).toHaveAttribute('data-overflow','true');
      await expect(bleu.locator('.scroll-region__hint')).toBeVisible();
      await expect(bleu.locator('.scroll-region__viewport')).toHaveAttribute('tabindex','0');
      await page.setViewportSize({width:1440,height:900});
      await expect(region).toHaveAttribute('data-overflow','false');
      await expect(region.locator('.scroll-region__hint')).toHaveCount(0);
    });
  }
});


test.describe('final six diagram regressions', () => {
  for (const path of ALL_PAGES) {
    for (const width of [400, 1440]) {
      test(`${path}: six diagrams preserve separate headings and readable labels at ${width}px`, async ({ page }) => {
        await page.setViewportSize({width,height:900}); await page.goto(path);
        await openFold(page.locator('#problem'), '.expand');
        const walk=page.locator('.lab--walk');
        await page.evaluate(()=>document.fonts.ready);
        for (const index of [0,1]) {
          await chooseStep(walk,index);
          const frame=walk.locator('.walk__frame[data-on="true"]');
          const label=frame.locator('.tmap__title').filter({hasText:path===ARTICLE_KO ? /^문장$/ : /^Sentence$/});
          const sentenceBox=(await label.locator('..').locator('rect').boundingBox())!;
          const labelBox=(await label.boundingBox())!;
          const sentence=(await frame.locator('.tmap__label').filter({hasText:/^The animal didn’t cross$/}).boundingBox())!;
          expect.soft(sentenceBox.x,`frame ${index+1}: sentence label has a clear gap before the box`).toBeGreaterThanOrEqual(labelBox.x+labelBox.width+8);
          expect.soft(sentence.x,`frame ${index+1}: sentence keeps its left padding`).toBeGreaterThanOrEqual(sentenceBox.x+8);
          expect.soft(sentence.x+sentence.width,`frame ${index+1}: sentence keeps its right padding`).toBeLessThanOrEqual(sentenceBox.x+sentenceBox.width-8);
        }
        const title=walk.locator('.walk__frame[data-on="true"] .tmap__title').filter({hasText:path===ARTICLE_KO ? /^숫자 한 줄$/ : /^A row of numbers$/});
        const note=walk.locator('.walk__frame[data-on="true"] .tmap__note').filter({hasText:path===ARTICLE_KO ? /^실제로는 512칸$/ : /^really 512 cells$/});
        const titleBox=(await title.boundingBox())!; const noteBox=(await note.boundingBox())!;
        expect.soft(noteBox.y,'the 512-cell note occupies a separate line below its heading').toBeGreaterThanOrEqual(titleBox.y+titleBox.height+2);

        const beam=page.locator('.lab--beam');
        const figures=[
          {name:'beam probabilities',svg:beam.locator('svg'),labels:'.tmap__note',region:beam.locator('.scroll-region__viewport')},
          ...['pld','qkv','hb','sf'].map(id=>({
            name:id,svg:page.locator(`svg[aria-labelledby="${id}-t ${id}-d"]`),labels:'.tmap__note',
            region:page.locator('.figure__frame').filter({has:page.locator(`svg[aria-labelledby="${id}-t ${id}-d"]`)}),
          })),
        ];
        for (const figure of figures) {
          await revealSupplement(figure.svg);
          const text=await figure.svg.locator(figure.labels).evaluateAll(nodes=>nodes.map(el=>{
            const ctm=(el as SVGGraphicsElement).getScreenCTM()!;
            const box=(el as SVGGraphicsElement).getBBox();
            const view=(el as SVGGraphicsElement).ownerSVGElement!.viewBox.baseVal;
            return {text:el.textContent,px:parseFloat(getComputedStyle(el).fontSize)*Math.hypot(ctm.a,ctm.b),inside:box.x>=view.x && box.y>=view.y && box.x+box.width<=view.x+view.width && box.y+box.height<=view.y+view.height};
          }));
          expect(text.length,figure.name).toBeGreaterThan(1);
          expect.soft(Math.min(...text.map(item=>item.px)),`${figure.name}: smallest annotation stays at least 12px`).toBeGreaterThanOrEqual(12);
          for (const item of text) expect.soft(item.inside,`${figure.name}: ${item.text} stays inside its SVG`).toBe(true);
          const regionCount=await figure.region.count();
          expect.soft(regionCount,`${figure.name}: one scroll region`).toBe(1);
          const tabIndex=regionCount===1 ? await figure.region.getAttribute('tabindex') : null;
          expect.soft(tabIndex,`${figure.name}: scroll region accepts keyboard focus`).toBe('0');
          if (width===400 && tabIndex==='0') {
            await expect.poll(()=>figure.region.evaluate(el=>el.scrollWidth>el.clientWidth+1)).toBe(true);
            await figure.region.scrollIntoViewIfNeeded();
            await figure.region.focus();
            const before=await figure.region.evaluate(el=>el.scrollLeft);
            await figure.region.press('ArrowRight');
            await expect.poll(()=>figure.region.evaluate(el=>el.scrollLeft),{message:`${figure.name}: ArrowRight moves the diagram`}).toBeGreaterThan(before);
          }
        }
        await expect(beam.locator('button')).toHaveCount(3);
        await beam.locator('button').nth(1).click();
        await expect(beam.locator('.explorer__line').nth(1)).toContainText('0.342');
        expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      });
    }
  }
});


test('one-pair arithmetic precedes transpose and the Q–K walkthrough follows the role introduction', async ({ page }) => {
  for (const path of ALL_PAGES) {
    await page.goto(path);
    const numbers=page.locator('#numbers'); const ko=path===ARTICLE_KO;
    const headings=await numbers.locator('h3').allTextContents();
    const dot=headings.indexOf(ko ? '두 숫자 줄을 비교하는 점수 만들기' : 'Build a score for comparing two rows');
    const transpose=headings.indexOf(ko ? '같은 한 쌍을 행 × 열로 놓아 보기' : 'Arrange the same pair as a row and a column');
    expect(dot).toBeGreaterThanOrEqual(0); expect(transpose).toBeGreaterThan(dot);
    await expect(numbers).not.toContainText('Query'); await expect(numbers).not.toContainText('Key');
    await expect(numbers).toContainText(ko ? '2×2 + 0×0 = 4' : '2×2 + 0×0 = 4');
    const explanation=numbers.locator('#similarity');
    await expect(explanation).toContainText(ko ? '네 값을 그냥 모두 더하면' : 'adding all the current-row and candidate-row values');
    await expect(explanation).toContainText('2×0 + 0×2 =');
    await expect(numbers).toContainText('2×2=4'); await expect(numbers).toContainText('2×4=8');
    const order=await page.locator('[data-qk-score-walk]').evaluate(walk=>{
      const roles=document.querySelector('svg[aria-labelledby="qkv-t qkv-d"]')!;
      const lab=document.querySelector('.lab--attention')!;
      return [Boolean(roles.compareDocumentPosition(walk)&Node.DOCUMENT_POSITION_FOLLOWING),Boolean(walk.compareDocumentPosition(lab)&Node.DOCUMENT_POSITION_FOLLOWING)];
    });
    expect(order).toEqual([true,true]);
  }
});


test('the fixed attention story carries one first-row example from purpose to content', async ({ page }) => {
  for (const path of ALL_PAGES) {
    await page.goto(path);
    const ko=path===ARTICLE_KO;
    const overview=page.locator('[data-attention-story="overview"]');
    await revealSupplement(overview); await overview.scrollIntoViewIfNeeded();
    await page.evaluate(()=>document.fonts.ready);
    await expect(overview.locator('[data-story-token]')).toHaveText(ko ? ['나는','학교에','갔다'] : ['I','went','to school']);
    await expect(overview.locator('ol, li, button, input, details, [role="button"], animate')).toHaveCount(0);
    await expect(overview).not.toContainText('(2, 0)');
    await expect(overview).not.toContainText('(0, 4, 2)');
    await expect(overview).not.toContainText('(0.323, 2.490)');
    await expect(overview.locator('[data-story-weight]')).toHaveText(['4.5%','76.8%','18.7%']);
    await expect(overview.locator('[data-story-output-token]')).toHaveText(ko ? '나는' : 'I');
    await expect(overview.locator('[data-story-output-context]')).toHaveText(ko ? '주변 정보를 반영한' : 'with context');
    await expect(overview.locator('.attention-overview__headings span')).toHaveText(ko ? ['입력 토큰','새 표현'] : ['Input tokens','Output']);
    const edges=overview.locator('[data-story-edge]'); await expect(edges).toHaveCount(3);
    const directions=await edges.evaluateAll(nodes=>nodes.map(el=>{
      const path=el as SVGPathElement; const start=path.getPointAtLength(0); const end=path.getPointAtLength(path.getTotalLength());
      return {fromX:start.x,fromY:start.y,toX:end.x,toY:end.y};
    }));
    expect(directions.every(edge=>edge.toX>edge.fromX)).toBe(true);
    expect(directions[0].fromY).toBeLessThan(directions[1].fromY); expect(directions[1].fromY).toBeLessThan(directions[2].fromY);
    for (const edge of directions) expect(edge.toY).toBeCloseTo(directions[1].toY,4);
    const widths=await edges.evaluateAll(nodes=>nodes.map(el=>Number(el.getAttribute('stroke-width'))));
    expect(widths[1]).toBeGreaterThan(widths[2]); expect(widths[2]).toBeGreaterThan(widths[0]);
    for (const edge of await edges.all()) await expect(edge).toHaveAttribute('marker-end','url(#story-overview-arrow)');
    const labelSizes=await overview.locator('[data-story-weight], [data-story-token], [data-story-output-token], [data-story-output-context]').evaluateAll(nodes=>nodes.map(el=>parseFloat(getComputedStyle(el).fontSize)));
    expect(labelSizes.every(size=>size>=16)).toBe(true);
    const diagram=overview.locator('.attention-overview__diagram');
    const bounds=(await diagram.boundingBox())!;
    for (const label of await overview.locator('[data-story-token], [data-story-weight], [data-story-output-token], [data-story-output-context]').all()) {
      const box=(await label.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(bounds.x-1); expect(box.x+box.width).toBeLessThanOrEqual(bounds.x+bounds.width+1);
      expect(box.y).toBeGreaterThanOrEqual(bounds.y-1); expect(box.y+box.height).toBeLessThanOrEqual(bounds.y+bounds.height+1);
    }
    const input=(await overview.locator('[data-story-token]').first().boundingBox())!;
    const output=(await overview.locator('[data-story-output]').boundingBox())!;
    expect(output.x).toBeGreaterThan(input.x+input.width);
    await expect(overview).toContainText(ko ? '미래를 가리기 전' : 'before future masking');
    await expect(overview.locator('a[href="#positions"]')).toHaveText(ko ? '뒤의 위치와 가리기 단원' : 'later position and masking unit');
    const fixed=page.locator('#numbers [data-matmul-mode="fixed"]');
    await expect(fixed.locator('button, input, details')).toHaveCount(0);
    await expect(fixed.locator('[data-matrix="Y"] caption')).toHaveCount(0);
    for (const matrix of ['X','Y']) await expect(fixed.locator(`[data-matrix="${matrix}"] .mgrid__rowlabel`)).toHaveText(ko ? ['나는','학교에','갔다'] : ['I','went','to school']);
    const candidates=page.locator('[data-matrix="story-candidates"]');
    await expect(candidates.locator('.mgrid__value')).toHaveText(['0','2','2','0','1','1']);
    const product=page.locator('[data-story-candidate-product]');
    await expect(product.locator('[data-matrix="story-product-current"] .mgrid__value')).toHaveText(['2','0']);
    await expect(product.locator('[data-matrix="story-candidate-columns"] .mgrid__collabel')).toHaveText(ko ? ['나는','학교에','갔다'] : ['I','went','to school']);
    await expect(product.locator('[data-matrix="story-candidate-columns"] .mgrid__value')).toHaveText(['0','2','1','2','0','1']);
    await expect(product.locator('[data-matrix="story-product-scores"] .mgrid__value')).toHaveText(['0','4','2']);
    await expect(page.locator('[data-story-score]')).toHaveText(['0','4','2']);
    await expect(page.locator('[data-story-exponential]')).toHaveText(['1.000','16.919','4.113']);
    await expect(page.locator('[data-story-normalization]')).toContainText('22.032');
    await expect(page.locator('[data-story-share]')).toHaveText(['0.045388','0.767918','0.186694']);
    await expect(page.locator('[data-matrix="story-content"] .mgrid__value')).toHaveText(['3','0','0','3','1','1']);
    await expect(page.locator('[data-matrix="story-output"] .mgrid__value')).toHaveText(['0.323','2.490']);
    const dot=page.locator('.lab--dot'); await revealSupplement(dot);
    const arrow=dot.locator('svg g line[stroke-width="6"]');
    const before=await arrow.getAttribute('x2');
    await dot.getByLabel('k 1', {exact:true}).fill('4');
    await expect(dot.locator('svg')).toHaveAttribute('data-axis-extent','5');
    await expect(arrow).toHaveAttribute('x2',before!);
    await expect(dot.locator('.terms__running').last()).toHaveText('8');
    const experiment=page.locator('#numbers .lab--matmul[data-matmul-mode=interactive]');
    await expect(experiment.locator('[data-matrix="Y"] caption')).toHaveCount(1);
    await openFold(experiment,'.matmul__inputs');
    await experiment.locator('[data-matrix="X"] [data-r="0"][data-c="0"] input').fill('2');
    await expect(experiment.locator('.mgrid--score .mgrid__value')).toHaveText(['3','0','0','2','1','1']);
    await expect(fixed.locator('.mgrid--score .mgrid__value')).toHaveText(['2','0','0','2','1','1']);
  }
});
