import { expect, test, type Locator } from '@playwright/test';

const sections = ['language-model','tokens','numbers','proportion','attention','positions','multi-head','blocks','big-picture','generation','training','results'];
const stages = ['tokens','projection','comparison','transpose','scores','shares','aggregation','attention','mask','heads','residual','feed-forward','hidden','readout','loss'];
const words = { ko: ['나는','학교에','갔다'], en: ['I','went','to school'] };

async function expectProbabilityLayout(view: Locator, alignBars = true) {
  const distribution = view.locator('[data-journey-probabilities]');
  await expect(distribution).toHaveCount(1);
  await distribution.scrollIntoViewIfNeeded();
  const rows = distribution.locator('.journey__probability-row');
  await expect(rows).toHaveCount(4);
  const barStarts: number[] = [];
  for (const row of await rows.all()) {
    const geometry = await row.evaluate(node => {
      const number = node.querySelector('[data-journey-probability]')!;
      const track = node.querySelector('.journey__bar-track')!;
      const dd = node.querySelector('dd')!;
      const range = document.createRange();
      range.selectNodeContents(number);
      const box = (element: Element) => {
        const r = element.getBoundingClientRect();
        return {left:r.left,right:r.right,width:r.width,scroll:element.scrollWidth,client:element.clientWidth};
      };
      return {text:number.textContent,number:box(number),track:box(track),dd:box(dd),row:box(node),rects:[...range.getClientRects()].filter(r => r.width > 0 && r.height > 0).map(r => ({left:r.left,right:r.right}))};
    });
    expect(geometry.rects, `${geometry.text}: number and percent sign occupy one text line`).toHaveLength(1);
    expect(geometry.rects[0].left).toBeGreaterThanOrEqual(geometry.number.left-1);
    expect(geometry.rects[0].right).toBeLessThanOrEqual(geometry.number.right+1);
    expect(geometry.number.left).toBeGreaterThanOrEqual(geometry.dd.left-1);
    expect(geometry.number.right, `${geometry.text}: number does not overlap its bar`).toBeLessThanOrEqual(geometry.track.left+1);
    expect(geometry.track.width).toBeGreaterThan(0);
    barStarts.push(geometry.track.left);
    expect(geometry.track.right).toBeLessThanOrEqual(geometry.dd.right+1);
    expect(geometry.dd.left).toBeGreaterThanOrEqual(geometry.row.left-1);
    expect(geometry.dd.right).toBeLessThanOrEqual(geometry.row.right+1);
    for (const box of [geometry.number,geometry.dd,geometry.row]) expect(box.scroll).toBeLessThanOrEqual(box.client+1);
  }
  if (alignBars) {
    for (const start of barStarts.slice(1)) expect(start, 'loaded-font probability bars share a starting column').toBeCloseTo(barStarts[0],0);
  }
  const bounds = await distribution.evaluate(node => {
    const r = node.getBoundingClientRect();
    return {left:r.left,right:r.right,width:node.clientWidth,scroll:node.scrollWidth,viewport:document.documentElement.clientWidth,page:document.documentElement.scrollWidth};
  });
  expect(bounds.left).toBeGreaterThanOrEqual(0);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewport+1);
  expect(bounds.scroll).toBeLessThanOrEqual(bounds.width+1);
  expect(bounds.page).toBeLessThanOrEqual(bounds.viewport+1);
}

for (const locale of ['ko','en'] as const) {
  test(`${locale}: the default reading path carries one two-input snapshot through every unit`, async ({ page }) => {
    await page.goto(`${locale}/`);
    for (const section of sections) await expect(page.locator(`[id="${section}"]`)).toHaveCount(1);
    // The independent exercises moved to the lab and paper pages; each unit links there instead.
    await expect(page.locator('[data-legacy-exercise]')).toHaveCount(0);
    await expect(page.locator('.lesson-more')).toHaveCount(11);
    await expect(page.locator('.lab--next-token')).toHaveCount(0);
    await expect(page.locator('#lesson-position-extension')).not.toHaveAttribute('open');
    await expect(page.locator('#lesson-readout-learning')).not.toHaveAttribute('open');
    const visibleStages = await page.locator('[data-lesson-stage]').evaluateAll(nodes => nodes.filter(node => !node.closest('details')).map(node => node.getAttribute('data-lesson-stage')));
    expect(visibleStages).toEqual(stages);
    for (const stage of stages) {
      const view = page.locator(`[data-lesson-stage="${stage}"]:visible`);
      await expect(view).toHaveCount(1);
      await expect(view).toHaveAttribute('data-lesson-prefix','0,1');
      await expect(view).toHaveAttribute('data-lesson-focus','1');
      await expect(view).toHaveAttribute('data-lesson-position','off');
      await expect(view).toHaveAttribute('data-lesson-mask','on');
      await expect(view.locator('.lesson-context, h4')).toHaveCount(0);
      await expect(view).toHaveAccessibleName(/.+/);
      await expect(view.locator('button,.stepper')).toHaveCount(0);
      const primaryText = await view.evaluate(node => {
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); const parts: string[] = [];
        while (walker.nextNode()) if (!walker.currentNode.parentElement?.closest('details')) parts.push(walker.currentNode.textContent ?? '');
        return parts.join(' ');
      });
      expect(primaryText).not.toContain('**');
      expect(primaryText).not.toContain('(0, 4, 2)');
      expect(primaryText).not.toContain('76.8%');
      expect(primaryText).not.toMatch(/다른 실행|오프닝과 다른|different run|different settings from the opening/);
    }
    const tokens = page.locator('#tokens > [data-main-lesson]');
    await expect(tokens.locator('[data-embedding-id="0"] > span')).toHaveText(['1','0','1','0']);
    await expect(tokens.locator('[data-embedding-id="1"] > span')).toHaveText(['0','1','0','1']);
    await expect(tokens).toContainText('2 × 4');
    await expect(page.locator('#numbers > [data-main-lesson] [data-lesson-score]')).toHaveText(['4','0','4','0']);
    await expect(page.locator('#proportion > [data-main-lesson] [data-lesson-share]')).toHaveText(['94.4%','5.6%']);
    await expect(page.locator('#proportion > [data-main-lesson] [data-journey-head-output]')).toHaveText(['2.833','0.167']);
    const heads = page.locator('#multi-head > [data-main-lesson] [data-lesson-head="1"] .lesson-value').last();
    await expect(heads.locator('.journey__digits > span')).toHaveText(['0.670','0.330']);
    await expect(page.locator('#blocks > [data-main-lesson] [data-lesson-stage=hidden] .lesson-value').last().locator('.journey__digits > span')).toHaveText(['0.520','−0.513','1.313','−1.320']);
    await expect(page.locator('#big-picture > [data-main-lesson] [data-journey-probability]')).toHaveText(['11.5%','11.6%','71.8%','5.2%']);
    await expect(page.locator('#training > [data-main-lesson] [data-lesson-target-probability]')).toHaveText('0.7179269');
    for (const anchor of ['similarity','math-shape','math-readout']) await expect(page.locator(`[id="${anchor}"]`)).toHaveCount(1);
  });

  test(`${locale}: position addition visibly feeds the recomputed downstream stages`, async ({ page }) => {
    await page.goto(`${locale}/`);
    const base = page.locator('#big-picture > [data-main-lesson] [data-journey-probability]');
    const initial = await base.allTextContents();
    await page.locator('#lesson-position-extension > summary').click();
    const extension = page.locator('.lesson-position-extension');
    await expect(extension.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr','');
    const before = await extension.locator('[data-lesson-stage=readout] [data-journey-probability]').allTextContents();
    expect(before).toEqual(initial);
    await extension.getByRole('checkbox').check();
    await expect(extension).toHaveAttribute('data-position-added','true');
    for (const view of await extension.locator('[data-lesson-stage]').all()) await expect(view).toHaveAttribute('data-lesson-position','on');
    await expect(extension.locator('.lesson-position-addition [data-matrix]')).toHaveCount(3);
    const after = await extension.locator('[data-lesson-stage=readout] [data-journey-probability]').allTextContents();
    expect(after).not.toEqual(before);
    expect(await base.allTextContents()).toEqual(initial);
    await extension.getByRole('checkbox').uncheck();
    await expect(extension.locator('[data-lesson-stage=readout] [data-journey-probability]')).toHaveText(initial);
  });

  test(`${locale}: the four-candidate loss and live status change after a readout update and reset`, async ({ page }) => {
    await page.goto(`${locale}/`);
    await page.locator('#lesson-readout-learning > summary').click();
    const learning = page.locator('.lesson-learning');
    await expect(learning.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr','');
    await expect(learning.locator('[data-learning-input] .journey-token')).toHaveText(words[locale].slice(0,2));
    await expect(learning.locator('[data-learning-input] [data-token-id="2"]')).toHaveCount(0);
    await expect(learning.locator('[data-learning-target]')).toHaveText('0.7179269');
    const beforeLoss = Number(await learning.locator('[data-learning-loss]').textContent());
    const status = learning.getByRole('status');
    await expect(status).toHaveAttribute('aria-live','polite');
    await expect(status).toHaveAttribute('aria-atomic','true');
    const beforeStatus = await status.textContent();
    await learning.getByRole('button').click();
    await expect(learning).toHaveAttribute('data-learning-applied','true');
    await expect(status).not.toHaveText(beforeStatus!);
    await expect(status).toContainText(locale === 'ko' ? '계수를 갱신했습니다' : 'Coefficient updated');
    expect(Number(await learning.locator('[data-learning-target]').textContent())).toBeGreaterThan(0.7179269);
    expect(Number(await learning.locator('[data-learning-loss]').textContent())).toBeLessThan(beforeLoss);
    await expect(learning.locator('[data-journey-probability]')).toHaveCount(4);
    await learning.getByRole('button').click();
    await expect(learning.locator('[data-learning-target]')).toHaveText('0.7179269');
    await expect(learning).toHaveAttribute('data-learning-applied','false');
    await expect(status).toHaveText(beforeStatus!);
    expect(Number(await learning.locator('[data-learning-loss]').textContent())).toBe(beforeLoss);
    const generation = page.locator('.lesson-generation');
    await expect(generation).toHaveAttribute('data-generation-reference');
    await expect(generation.locator('button, [data-journey-probabilities], astro-island')).toHaveCount(0);
    await expect(generation.locator('[data-generation-prefix]')).toHaveCount(2);
    await expect(generation.locator('[data-generation-prefix="0,1"] > span').first().locator('.journey-token')).toHaveText(words[locale].slice(0,2));
    await expect(generation.locator('[data-generation-prefix="0,1,2"] > span').first().locator('.journey-token')).toHaveText(words[locale]);
    await expect(generation.locator('[data-generation-choice-probability]')).toHaveText(['71.8%','49.4%']);
    await expect(generation.locator('a')).toHaveAttribute('href','#generation-opening');
  });

  test(`${locale}: percentages stay together before and after web fonts load at 500px`, async ({ page }) => {
    await page.setViewportSize({width:500,height:844});
    let releaseFonts!: () => void;
    const fontGate = new Promise<void>(resolve => { releaseFonts = resolve; });
    let fontRequests = 0;
    await page.route(/\.woff2(?:\?.*)?$/, async route => {
      fontRequests += 1;
      await fontGate;
      await route.continue();
    });
    await page.goto(`${locale}/`, {waitUntil:'domcontentloaded'});
    const opening = page.locator('.lab--generation-journey');
    const readout = page.locator('#big-picture > [data-main-lesson] [data-lesson-stage="readout"]:visible');
    try {
      await expect.poll(() => fontRequests, {message:'the test must intercept at least one web font'}).toBeGreaterThan(0);
      await expect.poll(() => page.evaluate(() => document.fonts.status)).toBe('loading');
      for (const view of [opening,readout]) {
        await expect(view.locator('[data-journey-probability]')).toHaveText(['11.5%','11.6%','71.8%','5.2%']);
        await expectProbabilityLayout(view, false);
      }
    } finally {
      releaseFonts();
    }
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.fonts.status)).toBe('loaded');
    for (const view of [opening,readout]) await expectProbabilityLayout(view);
  });

  for (const width of [390,500]) {
    test(`${locale}: percentages remain on one line through generation and learning at ${width}px`, async ({ page }) => {
      await page.setViewportSize({width,height:844});
      await page.goto(`${locale}/`);
      await page.evaluate(() => document.fonts.ready);
      const opening = page.locator('.lab--generation-journey');
      await expect(opening.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr','');
      const initial = ['11.5%','11.6%','71.8%','5.2%'];
      const appended = ['10.3%','33.4%','6.9%','49.4%'];
      await expect(opening).toHaveAttribute('data-stage','purpose');
      await expect(opening.locator('[data-journey-probability]')).toHaveText(initial);
      await expectProbabilityLayout(opening);
      await opening.locator('.journey__next').click();
      await expect(opening).toHaveAttribute('data-stage','append');
      await expect(opening.locator('[data-journey-probability]')).toHaveText(appended);
      await expectProbabilityLayout(opening);
      await opening.locator('.journey__next').click();
      await expect(opening).toHaveAttribute('data-stage','finished');
      await expect(opening.locator('[data-journey-probability]')).toHaveText(appended);
      await expectProbabilityLayout(opening);
      await opening.locator('.journey__restart').click();
      await expect(opening).toHaveAttribute('data-stage','purpose');
      await expect(opening.locator('[data-journey-probability]')).toHaveText(initial);
      await expectProbabilityLayout(opening);
      const readout = page.locator('#big-picture > [data-main-lesson] [data-lesson-stage="readout"]:visible');
      await expect(readout.locator('[data-journey-probability]')).toHaveText(initial);
      await expectProbabilityLayout(readout);
      await page.locator('#lesson-readout-learning > summary').click();
      const learning = page.locator('.lesson-learning');
      await expect(learning.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr','');
      await expect(learning.locator('[data-journey-probability]')).toHaveText(initial);
      await expectProbabilityLayout(learning);
      const beforeLoss = Number(await learning.locator('[data-learning-loss]').textContent());
      await learning.getByRole('button').click();
      await expect(learning).toHaveAttribute('data-learning-applied','true');
      expect(Number(await learning.locator('[data-learning-target]').textContent())).toBeGreaterThan(0.7179269);
      expect(Number(await learning.locator('[data-learning-loss]').textContent())).toBeLessThan(beforeLoss);
      await expectProbabilityLayout(learning);
      await learning.getByRole('button').click();
      await expect(learning).toHaveAttribute('data-learning-applied','false');
      await expect(learning.locator('[data-journey-probability]')).toHaveText(initial);
      await expectProbabilityLayout(learning);
    });

    test(`${locale}: four-value vectors stay on one row without repeated mobile chrome at ${width}px`, async ({ page }) => {
      await page.setViewportSize({width,height:844});
      await page.goto(`${locale}/`);
      await page.evaluate(() => document.fonts.ready);
      const vectors = page.locator('[data-main-lesson] .journey__digits[data-size="4"]:visible');
      expect(await vectors.count()).toBeGreaterThan(10);
      for (const vector of await vectors.all()) {
        await expect(vector).toHaveAttribute('role','group');
        await expect(vector).toHaveAccessibleName(/.+/);
        const cells = vector.locator(':scope > span');
        await expect(cells).toHaveCount(4);
        for (const cell of await cells.all()) await expect(cell).toHaveAttribute('aria-label',/^(값|Entry) [1-4]: /);
        const positions = await cells.evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,scroll:node.scrollWidth,client:node.clientWidth}; }));
        for (const [i, cell] of positions.entries()) {
          expect(cell.y).toBeCloseTo(positions[0].y,0);
          expect(cell.x).toBeGreaterThanOrEqual(0);
          expect(cell.x + cell.width).toBeLessThanOrEqual(width + 1);
          expect(cell.scroll).toBeLessThanOrEqual(cell.client + 1);
          if (i) expect(cell.x).toBeGreaterThanOrEqual(positions[i-1].x + positions[i-1].width);
        }
      }
      const references = page.locator('[data-main-lesson] [data-lesson-stage="projection"]:visible .lesson-reference-values');
      await expect(references).toHaveCount(1);
      const referenceRows = references.locator(':scope > div');
      await expect(referenceRows).toHaveCount(2);
      await expect(referenceRows.locator(':scope > .journey-token')).toHaveText(words[locale].slice(0,2));
      const referenceValues = [['0','2'],['2','0']];
      const valueStarts: number[] = [];
      for (const [index, row] of (await referenceRows.all()).entries()) {
        const values = row.locator(':scope > .journey__digits');
        await expect(values).toHaveAttribute('data-size','2');
        await expect(values.locator(':scope > span')).toHaveCount(2);
        await expect(values.locator(':scope > span')).toHaveText(referenceValues[index]);
        const geometry = await row.evaluate(node => {
          const label = node.querySelector(':scope > .journey-token')!.getBoundingClientRect();
          const values = node.querySelector(':scope > .journey__digits')!.getBoundingClientRect();
          const cells = [...node.querySelectorAll(':scope > .journey__digits > span')].map(cell => cell.getBoundingClientRect());
          return {labelMiddle:label.y+label.height/2,valuesMiddle:values.y+values.height/2,labelRight:label.right,valuesLeft:values.left,valuesRight:values.right,cellY:cells.map(cell => cell.y)};
        });
        expect(Math.abs(geometry.labelMiddle-geometry.valuesMiddle), 'each reference label stays beside its two values').toBeLessThanOrEqual(1);
        expect(geometry.valuesLeft).toBeGreaterThanOrEqual(geometry.labelRight);
        expect(geometry.valuesRight).toBeLessThanOrEqual(width+1);
        expect(geometry.cellY[0]).toBeCloseTo(geometry.cellY[1],0);
        valueStarts.push(geometry.valuesLeft);
      }
      expect(valueStarts[0], 'both reference rows use the same numeric column').toBeCloseTo(valueStarts[1],0);
      await expect(page.locator('.lesson-context, .lesson-computation > h4, .point--goal, .lesson-prerequisites, .lesson-next')).toHaveCount(0);
      await expect(page.locator('[data-learning-overview]')).toHaveCount(0);
      await expect(page.locator('.lab--generation-journey [data-journey-input]')).toHaveCount(1);
      await expect(page.locator('.lesson-generation button, .lesson-generation [data-journey-probabilities]')).toHaveCount(0);
      await expect(page.locator('[data-lesson-check]')).toHaveCount(12);
      for (const check of await page.locator('[data-lesson-check]').all()) await expect(check).not.toHaveAttribute('open');
      const primaryText = await page.locator('main').evaluate(node => {
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); const parts: string[] = [];
        while (walker.nextNode()) if (!walker.currentNode.parentElement?.closest('details,script,style,.katex')) parts.push(walker.currentNode.textContent ?? '');
        return parts.join(' ');
      });
      expect(primaryText).not.toContain('**');
      const bodyOrder = await page.locator('[data-section]').evaluateAll(nodes => nodes.map(node => node.id));
      const navOrder = await page.locator('#doc-nav [data-section-link]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-section-link')));
      expect(bodyOrder).toEqual(sections);
      expect(navOrder).toEqual(sections);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    });
  }

  for (const layout of [{width:360,zoom:100},{width:280,zoom:200}]) {
    test(`${locale}: primary calculations and probabilities fit ${layout.width}px at ${layout.zoom}%`, async ({ page }) => {
      await page.setViewportSize({width:layout.width,height:844});
      await page.goto(`${locale}/`);
      await page.evaluate(zoom => document.documentElement.style.fontSize = `${zoom}%`,layout.zoom);
      for (const view of await page.locator('[data-lesson-stage]').all()) {
        if (await view.evaluate(node => Boolean(node.closest('details')))) continue;
        await view.scrollIntoViewIfNeeded();
        const box = await view.evaluate(node => {
          const bounds = node.getBoundingClientRect();
          const values = [...node.querySelectorAll('.journey__digits > span,[data-contribution-value],[data-journey-head-output]')].filter(item => !item.closest('details'));
          return {left:bounds.left,right:bounds.right,width:node.clientWidth,scroll:node.scrollWidth,fonts:values.map(item => parseFloat(getComputedStyle(item).fontSize))};
        });
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(layout.width+1);
        expect(box.scroll).toBeLessThanOrEqual(box.width+1);
        if (box.fonts.length) expect(Math.min(...box.fonts)).toBeGreaterThanOrEqual(16*layout.zoom/100);
        // Detailed arithmetic moved here from the opening; optional matrices retain their own scrolling.
        for (const summary of await view.locator(':scope > details > summary').all()) await summary.click();
        for (const region of await view.locator('.mgrid__scroll:visible').all()) {
          const scrolling = await region.evaluate(node => ({width:node.clientWidth,scroll:node.scrollWidth,overflow:getComputedStyle(node).overflowX,optional:Boolean(node.closest('details'))}));
          if (scrolling.scroll > scrolling.width + 1) {
            expect(scrolling.optional).toBe(true);
            expect(scrolling.overflow).toBe('auto');
          }
        }
        const expanded = await view.evaluate(node => ({width:node.clientWidth,scroll:node.scrollWidth}));
        expect(expanded.scroll).toBeLessThanOrEqual(expanded.width+1);
      }
      for (const probability of await page.locator('[data-main-lesson] [data-journey-probabilities]:visible').all()) {
        const dimensions = await probability.evaluate(node => ({width:node.clientWidth,scroll:node.scrollWidth}));
        expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
      }
    });
  }
}
