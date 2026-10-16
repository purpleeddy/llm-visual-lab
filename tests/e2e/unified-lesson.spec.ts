import { expect, test } from '@playwright/test';

const sections = ['language-model','tokens','numbers','proportion','attention','positions','multi-head','blocks','big-picture','training','generation','results'];
const stages = ['tokens','projection','comparison','transpose','scores','shares','aggregation','attention','mask','heads','residual','feed-forward','hidden','readout','loss'];
const words = { ko: ['나는','학교에','갔다'], en: ['I','went','to school'] };

for (const locale of ['ko','en'] as const) {
  test(`${locale}: the default reading path carries one two-input snapshot through every unit`, async ({ page }) => {
    await page.goto(`${locale}/`);
    for (const section of sections) await expect(page.locator(`[id="${section}"]`)).toHaveCount(1);
    await expect(page.locator('[data-legacy-exercise]')).toHaveCount(11);
    for (const drawer of await page.locator('[data-legacy-exercise]').all()) await expect(drawer).not.toHaveAttribute('open');
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
      await expect(view.locator('.lesson-context .journey-token')).toHaveText(words[locale].slice(0,2));
      await expect(view.locator('button,.stepper')).toHaveCount(0);
      const primaryText = await view.evaluate(node => {
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT); const parts: string[] = [];
        while (walker.nextNode()) if (!walker.currentNode.parentElement?.closest('details')) parts.push(walker.currentNode.textContent ?? '');
        return parts.join(' ');
      });
      expect(primaryText).not.toContain('(0, 4, 2)');
      expect(primaryText).not.toContain('76.8%');
      expect(primaryText).not.toMatch(/다른 실행|오프닝과 다른|different run|different settings from the opening/);
    }
    const tokens = page.locator('#tokens > [data-main-lesson]');
    await expect(tokens.locator('[data-embedding-id=0] > span')).toHaveText(['1','0','1','0']);
    await expect(tokens.locator('[data-embedding-id=1] > span')).toHaveText(['0','1','0','1']);
    await expect(tokens).toContainText('2 × 4');
    await expect(page.locator('#numbers > [data-main-lesson] [data-lesson-score]')).toHaveText(['4','0','4','0']);
    await expect(page.locator('#proportion > [data-main-lesson] [data-lesson-share]')).toHaveText(['94.4%','5.6%']);
    await expect(page.locator('#proportion > [data-main-lesson] [data-journey-head-output]')).toHaveText(['2.833','0.167']);
    const heads = page.locator('#multi-head > [data-main-lesson] [data-lesson-head=1] .lesson-value').last();
    await expect(heads.locator('.journey__digits > span')).toHaveText(['0.670','0.330']);
    await expect(page.locator('#blocks > [data-main-lesson] [data-lesson-stage=hidden] .lesson-value').last().locator('.journey__digits > span')).toHaveText(['0.520','−0.513','1.313','−1.320']);
    await expect(page.locator('#big-picture > [data-main-lesson] [data-journey-probability]')).toHaveText(['11.5%','11.6%','71.8%','5.2%']);
    await expect(page.locator('#training > [data-main-lesson] [data-lesson-target-probability]')).toHaveText('0.7179269');
    for (const anchor of ['similarity','problem','math-shape','math-readout','math-gradient']) await expect(page.locator(`[id="${anchor}"]`)).toHaveCount(1);
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

  test(`${locale}: the same four-candidate loss changes after one readout update and generation recomputes after append`, async ({ page }) => {
    await page.goto(`${locale}/`);
    await page.locator('#lesson-readout-learning > summary').click();
    const learning = page.locator('.lesson-learning');
    await expect(learning.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr','');
    await expect(learning.locator('[data-learning-input] .journey-token')).toHaveText(words[locale].slice(0,2));
    await expect(learning.locator('[data-learning-input] [data-token-id=2]')).toHaveCount(0);
    await expect(learning.locator('[data-learning-target]')).toHaveText('0.7179269');
    const beforeLoss = Number(await learning.locator('[data-learning-loss]').textContent());
    await learning.getByRole('button').click();
    await expect(learning).toHaveAttribute('data-learning-applied','true');
    expect(Number(await learning.locator('[data-learning-target]').textContent())).toBeGreaterThan(0.7179269);
    expect(Number(await learning.locator('[data-learning-loss]').textContent())).toBeLessThan(beforeLoss);
    await expect(learning.locator('[data-journey-probability]')).toHaveCount(4);
    await learning.getByRole('button').click();
    await expect(learning.locator('[data-learning-target]')).toHaveText('0.7179269');
    const generation = page.locator('.lesson-generation');
    await expect(generation.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr','');
    await expect(generation.locator('[data-generation-input] .journey-token')).toHaveText(words[locale].slice(0,2));
    await expect(generation.locator('[data-journey-probability]')).toHaveText(['11.5%','11.6%','71.8%','5.2%']);
    await generation.locator('.lesson-generate').click();
    await expect(generation.locator('[data-generation-input] .journey-token')).toHaveText(words[locale]);
    await expect(generation).toHaveAttribute('data-generation-prefix','0,1,2');
    await expect(generation.locator('[data-journey-probability]')).toHaveText(['10.3%','33.4%','6.9%','49.4%']);
    await generation.locator('.lesson-generate').click();
    await expect(generation).toHaveAttribute('data-generation-finished','true');
    await expect(generation.locator('[data-generation-input] [data-token-id=3]')).toHaveCount(0);
    await generation.locator('.lesson-generation-reset').click();
    await expect(generation).toHaveAttribute('data-generation-prefix','0,1');
  });

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
      }
      for (const probability of await page.locator('[data-main-lesson] [data-journey-probabilities]:visible').all()) {
        const dimensions = await probability.evaluate(node => ({width:node.clientWidth,scroll:node.scrollWidth}));
        expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
      }
    });
  }
}
