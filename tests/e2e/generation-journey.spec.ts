import { expect, test, type Locator } from '@playwright/test';

const stages = ['purpose', 'lookup', 'context', 'projection', 'comparison', 'transpose', 'candidates', 'shares', 'mixture', 'block', 'probabilities', 'append', 'finished'];
const words = { ko: ['나는', '학교에', '갔다'], en: ['I', 'went', 'to school'] };
async function forward(lab: Locator, index: number) {
  await expect(lab).toHaveAttribute('data-stage', stages[index]);
  await lab.locator('.journey__next').click();
  await expect(lab).toHaveAttribute('data-stage', stages[index + 1]);
}

for (const locale of ['ko', 'en'] as const) {
  test(`${locale}: one computed journey preserves its input, arithmetic and choice across every scene`, async ({ page }) => {
    await page.goto(`${locale}/`);
    const lab = page.locator('.lab--generation-journey');
    await expect(lab.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr', '');
    const input = lab.locator('[data-journey-input] .journey-token');
    await expect(input).toHaveText(words[locale].slice(0, 2));
    await expect(lab.locator('[data-focused=true]')).toHaveText(words[locale][1]);
    await expect(page.locator('#generation-opening')).toHaveCount(1);
    await expect(page.locator('#table-generation')).not.toHaveAttribute('open');
    await expect(page.locator('.lab--next-token')).not.toBeVisible();
    expect(await lab.evaluate(node => Boolean(node.compareDocumentPosition(document.querySelector('#tokens')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await expect(lab.getByRole('button', { name: /^(?:자동으로 보기|재생|일시정지|Play|Pause)$/i })).toHaveCount(0);
    await page.clock.install();
    for (let i = 0; i < 3; i++) {
      await expect(lab.locator('[data-journey-scene]')).not.toContainText(words[locale][2]);
      await expect(lab.locator('table')).toHaveCount(0);
      await expect(lab).toHaveAttribute('data-prefix', '0,1');
      await page.clock.fastForward(60_000);
      await expect(lab).toHaveAttribute('data-stage', stages[i]);
      await forward(lab, i);
    }
    await expect(lab.locator('[data-journey-projection]')).toHaveText('0 × 0 + 1 × 1 + 0 × 0 + 1 × 1 = 2');
    await expect(lab.locator('[data-journey-query]')).toHaveText('(0, 2)');
    await lab.locator('details > summary').click();
    await expect(lab.locator('[data-matrix]').first().locator('.mgrid__value')).toHaveText(['0', '1', '0', '1']);
    await forward(lab, 3);
    const before = await lab.locator('[data-pair-right]').allTextContents();
    await expect(lab.locator('[data-pair-left] > span')).toHaveText(['0', '2']);
    await expect(lab.locator('[data-pair-right] > span')).toHaveText(['0', '2']);
    await expect(lab.locator('[data-pair-result]')).toHaveText('4');
    await forward(lab, 4);
    expect(await lab.locator('[data-pair-right]').allTextContents()).toEqual(before);
    await expect(lab.locator('[data-pair-result]')).toHaveText('4');
    const cells = await lab.locator('[data-pair-right] > span').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y }; }));
    expect(cells[0].x).toBeCloseTo(cells[1].x, 0);
    expect(cells[1].y).toBeGreaterThan(cells[0].y);
    await lab.locator('.journey__previous').click();
    await expect(lab).toHaveAttribute('data-stage', 'comparison');
    await forward(lab, 4);
    await forward(lab, 5);
    await expect(lab.locator('[data-journey-candidates] thead .journey-token')).toHaveText(words[locale].slice(0, 2));
    await expect(lab.locator('[data-journey-score]')).toHaveText(['4', '0']);
    await forward(lab, 6);
    await expect(lab.locator('[data-journey-share]')).toHaveText(['0.944193', '0.055807']);
    await expect(lab.locator('[data-journey-probabilities]')).toHaveCount(0);
    await forward(lab, 7);
    await expect(lab.locator('[data-journey-head-output]')).toHaveText(['2.832578', '0.167422']);
    await forward(lab, 8);
    await expect(lab.locator('[data-journey-first-head]')).toHaveText('(2.832578, 0.167422)');
    await expect(lab.locator('[data-journey-second-head]')).toHaveText('(0.669762, 0.330238)');
    await expect(lab.locator('[data-journey-hidden]')).toHaveText('(0.519869, −0.512724, 1.313017, −1.320161)');
    await forward(lab, 9);
    await expect(lab.locator('[data-journey-logits]')).toHaveText('(−0.519869, −0.512724, 1.313017, −1.320161)');
    await expect(lab.locator('[data-journey-probability]')).toHaveText(['11.4833%', '11.5657%', '71.7927%', '5.1583%']);
    await expect(lab.locator('[data-largest=true] .journey-token')).toHaveText(words[locale][2]);
    await expect(input).toHaveText(words[locale].slice(0, 2));
    await forward(lab, 10);
    await expect(input).toHaveText(words[locale]);
    await expect(lab).toHaveAttribute('data-prefix', '0,1,2');
    await expect(input.filter({ hasText: words[locale][2] })).toHaveAttribute('data-focused', 'true');
    await expect(lab.locator('[data-journey-hidden]')).toHaveText('(1.176702, 0, −1.568925, 0.392224)');
    await expect(lab.locator('[data-journey-probability]')).toHaveText(['10.2873%', '33.3686%', '6.9496%', '49.3945%']);
    await expect(lab.locator('[data-largest=true] .journey-token')).toHaveText(locale === 'ko' ? '[끝]' : '[end]');
    await forward(lab, 11);
    await expect(lab).toHaveAttribute('data-finished', 'true');
    await expect(input).toHaveText(words[locale]);
    await expect(lab).toHaveAttribute('data-prefix', '0,1,2');
    await expect(lab.locator('[data-journey-scene]')).toContainText(locale === 'ko' ? '일반 마침표가 아니라' : 'not an ordinary period');
    await expect(lab.locator('.journey__next')).toHaveAttribute('href', '#tokens');
    await lab.locator('.journey__previous').click();
    await expect(lab).toHaveAttribute('data-stage', 'append');
    await expect(lab.locator('[data-journey-probability]')).toHaveText(['10.2873%', '33.3686%', '6.9496%', '49.3945%']);
    await lab.locator('.journey__previous').click();
    await expect(lab).toHaveAttribute('data-prefix', '0,1');
    await expect(lab.locator('[data-journey-probability]')).toHaveText(['11.4833%', '11.5657%', '71.7927%', '5.1583%']);
    await forward(lab, 10);
    await forward(lab, 11);
    await lab.locator('.journey__restart').click();
    await expect(lab).toHaveAttribute('data-stage', 'purpose');
    await expect(lab).toHaveAttribute('data-prefix', '0,1');
    await expect(input).toHaveText(words[locale].slice(0, 2));
    await expect(lab.locator('.journey__previous')).toBeDisabled();
    await expect(page.locator('#numbers > .note').first()).toContainText(locale === 'ko' ? '독립 심화 실습' : 'independent advanced exercise');
    await expect(page.locator('#positions > .note').first()).toContainText(locale === 'ko' ? '새 연산' : 'new operation');
  });

  for (const layout of [{ width: 360, zoom: 100 }, { width: 280, zoom: 200 }]) {
    test(`${locale}: every scene stays readable at ${layout.width}px and ${layout.zoom}% text`, async ({ page }) => {
      await page.setViewportSize({ width: layout.width, height: 844 });
      await page.goto(`${locale}/`);
      const lab = page.locator('.lab--generation-journey');
      await expect(lab.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr', '');
      await page.evaluate(zoom => document.documentElement.style.fontSize = `${zoom}%`, layout.zoom);
      for (let i = 0; i < stages.length; i++) {
        await expect(lab).toHaveAttribute('data-stage', stages[i]);
        if (await lab.locator('.journey__scene > details').count()) await lab.locator('.journey__scene > details > summary').click();
        const bounds = await lab.evaluate(node => {
          const r = node.getBoundingClientRect();
          const text = [...node.querySelectorAll('p, td, th, summary, .journey-token')].filter(el => el.getClientRects().length);
          return { left: r.left, right: r.right, width: node.clientWidth, scroll: node.scrollWidth, fonts: text.map(el => parseFloat(getComputedStyle(el).fontSize)) };
        });
        expect(bounds.left).toBeGreaterThanOrEqual(0);
        expect(bounds.right).toBeLessThanOrEqual(layout.width + 1);
        expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
        expect(Math.min(...bounds.fonts)).toBeGreaterThanOrEqual(16 * layout.zoom / 100);
        for (const region of await lab.locator('.journey__scroll').all()) {
          const scrolling = await region.evaluate(node => ({ width: node.clientWidth, scroll: node.scrollWidth, overflow: getComputedStyle(node).overflowX }));
          if (scrolling.scroll > scrolling.width) expect(scrolling.overflow).toBe('auto');
        }
        await expect(lab.locator('.journey__next')).toHaveCount(1);
        if (i < stages.length - 1) await forward(lab, i);
      }
    });
  }
}
