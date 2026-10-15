import { expect, test, type Locator } from '@playwright/test';

const stages = ['purpose', 'lookup', 'context', 'projection', 'comparison', 'transpose', 'candidates', 'shares', 'mixture', 'block', 'probabilities', 'append', 'finished'];
const words = { ko: ['나는', '학교에', '갔다'], en: ['I', 'went', 'to school'] };
async function forward(lab: Locator, index: number) {
  await expect(lab).toHaveAttribute('data-stage', stages[index]);
  await lab.locator('.journey__next').click();
  await expect(lab).toHaveAttribute('data-stage', stages[index + 1]);
}

for (const locale of ['ko', 'en'] as const) {
  test(`${locale}: the default route shows probabilities, appends once and stops in three scenes`, async ({ page }) => {
    await page.goto(`${locale}/`);
    const lab = page.locator('.lab--generation-journey');
    await expect(lab.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr', '');
    const input = lab.locator('[data-journey-input] .journey-token');
    await expect(lab).toHaveAttribute('data-mode', 'overview');
    await expect(lab).toHaveAttribute('data-progress', '1/3');
    await expect(lab).toHaveAttribute('data-stage', 'purpose');
    await expect(input).toHaveText(words[locale].slice(0, 2));
    await expect(lab.locator('[data-journey-input] [data-token-id=2]')).toHaveCount(0);
    await expect(lab.locator('[data-journey-preview] .journey-token')).toHaveText(words[locale][2]);
    expect(await lab.evaluate(node => node.querySelector('[data-journey-input]')!.contains(node.querySelector('[data-journey-preview]')))).toBe(false);
    await expect(lab.locator('[data-journey-probability]')).toHaveText(['11.5%', '11.6%', '71.8%', '5.2%']);
    await expect(lab.locator('[data-largest=true] .journey-token')).toHaveText(words[locale][2]);
    await expect(lab.locator('.journey__next')).toHaveCount(1);
    await expect(lab.locator('.journey__detail')).toHaveText(locale === 'ko' ? '이 확률의 계산 열기' : 'Open the calculation behind these probabilities');
    await page.clock.install();
    await page.clock.fastForward(60_000);
    await expect(lab).toHaveAttribute('data-progress', '1/3');
    await lab.locator('.journey__next').focus();
    await page.keyboard.press('Enter');
    await expect(lab).toHaveAttribute('data-stage', 'append');
    await expect(lab).toHaveAttribute('data-progress', '2/3');
    await expect(lab).toHaveAttribute('data-prefix', '0,1,2');
    await expect(input).toHaveText(words[locale]);
    await expect(lab.locator('[data-journey-probability]')).toHaveText(['10.3%', '33.4%', '6.9%', '49.4%']);
    await expect(lab.locator('[data-largest=true] .journey-token')).toHaveText(locale === 'ko' ? '[끝]' : '[end]');
    await lab.locator('.journey__next').click();
    await expect(lab).toHaveAttribute('data-stage', 'finished');
    await expect(lab).toHaveAttribute('data-progress', '3/3');
    await expect(lab).toHaveAttribute('data-finished', 'true');
    await expect(input).toHaveText(words[locale]);
    await expect(lab.locator('[data-journey-input] [data-token-id=3]')).toHaveCount(0);
    await lab.locator('.journey__previous').click();
    await expect(lab).toHaveAttribute('data-progress', '2/3');
    await lab.locator('.journey__previous').click();
    await expect(lab).toHaveAttribute('data-progress', '1/3');
    await expect(input).toHaveText(words[locale].slice(0, 2));
    await lab.locator('.journey__detail').click();
    await expect(lab).toHaveAttribute('data-mode', 'detail');
    await expect(lab).toHaveAttribute('data-stage', 'lookup');
    await expect(lab).toHaveAttribute('data-progress', '1/12');
    await lab.locator('.journey__overview').click();
    await expect(lab).toHaveAttribute('data-mode', 'overview');
    await expect(lab).toHaveAttribute('data-progress', '1/3');
    await expect(input).toHaveText(words[locale].slice(0, 2));
    await lab.locator('.journey__next').click();
    await lab.locator('.journey__next').click();
    await lab.locator('.journey__restart').click();
    await expect(lab).toHaveAttribute('data-stage', 'purpose');
    await expect(lab).toHaveAttribute('data-progress', '1/3');
    await expect(lab.locator('.journey__previous')).toBeDisabled();
    await expect(input).toHaveText(words[locale].slice(0, 2));
  });

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
    await lab.locator('.journey__detail').click();
    await expect(lab).toHaveAttribute('data-mode', 'detail');
    await expect(lab).toHaveAttribute('data-progress', '1/12');
    await expect(lab.locator('.journey__previous')).toBeDisabled();
    await expect(lab.locator('[data-journey-embedding=0] > span')).toHaveText(['1', '0', '1', '0']);
    await expect(lab.locator('[data-journey-embedding=1] > span')).toHaveText(['0', '1', '0', '1']);
    for (let i = 1; i < 3; i++) {
      await expect(lab.locator('[data-journey-scene]')).not.toContainText(words[locale][2]);
      await expect(lab.locator('.journey__destination')).toContainText(locale === 'ko' ? '확률' : 'probabilities');
      await expect(lab.locator('table')).toHaveCount(0);
      await expect(lab).toHaveAttribute('data-prefix', '0,1');
      await page.clock.fastForward(60_000);
      await expect(lab).toHaveAttribute('data-stage', stages[i]);
      await forward(lab, i);
    }
    await expect(lab.locator('.journey__destination')).toContainText(locale === 'ko' ? '확률' : 'probabilities');
    await expect(lab.locator('[data-journey-projection-input] > span')).toHaveText(['0', '1', '0', '1']);
    await expect(lab.locator('[data-journey-projection-coefficients] > span')).toHaveText(['0', '1', '0', '1']);
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
    await expect(lab.locator('[data-journey-share]')).toHaveText(['94.4%', '5.6%']);
    await expect(lab.locator('[data-journey-probabilities]')).toHaveCount(0);
    await forward(lab, 7);
    const mixture = lab.locator('[data-journey-mixture]');
    await expect(mixture.locator('svg')).toHaveCount(0);
    await expect(mixture.locator('[data-source-values]').nth(0).locator('[data-contribution-source]')).toHaveText(['3', '0']);
    await expect(mixture.locator('[data-source-values]').nth(1).locator('[data-contribution-source]')).toHaveText(['0', '3']);
    await expect(mixture.locator('[data-contribution-share]')).toHaveText(['94.4%', '5.6%']);
    await expect(mixture.locator('[data-weighted-values]').nth(0).locator('[data-contribution-value]')).toHaveText(['2.833', '0']);
    await expect(mixture.locator('[data-weighted-values]').nth(1).locator('[data-contribution-value]')).toHaveText(['0', '0.167']);
    await expect(mixture.locator('[data-journey-head-output]')).toHaveText(['2.833', '0.167']);
    await expect(mixture.locator('.journey__mixture-result .journey-token')).toHaveText(words[locale][1]);
    const contributionColors = await mixture.locator('.journey__contribution-bar').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
    const sumColors = await mixture.locator('.journey__sum-bar > span').evaluateAll(nodes => nodes.map(node => getComputedStyle(node).backgroundColor));
    expect(contributionColors[0]).not.toBe(contributionColors[2]);
    expect(sumColors).toEqual([contributionColors[0], contributionColors[2], contributionColors[0], contributionColors[2]]);
    await lab.locator('.journey__scene > details > summary').click();
    await expect(lab.locator('[data-journey-exact-head-output]')).toHaveText(['2.832578', '0.167422']);
    await forward(lab, 8);
    await expect(lab.locator('[data-journey-first-head]')).toHaveText('(2.833, 0.167)');
    await expect(lab.locator('[data-journey-second-head]')).toHaveText('(0.670, 0.330)');
    await expect(lab.locator('[data-journey-hidden]')).toHaveText('(0.520, −0.513, 1.313, −1.320)');
    await forward(lab, 9);
    await expect(lab.locator('[data-journey-logits]')).toHaveText('(−0.520, −0.513, 1.313, −1.320)');
    await expect(lab.locator('[data-journey-probability]')).toHaveText(['11.5%', '11.6%', '71.8%', '5.2%']);
    await expect(lab.locator('[data-largest=true] .journey-token')).toHaveText(words[locale][2]);
    await expect(input).toHaveText(words[locale].slice(0, 2));
    await forward(lab, 10);
    await expect(input).toHaveText(words[locale]);
    await expect(lab).toHaveAttribute('data-prefix', '0,1,2');
    await expect(input.filter({ hasText: words[locale][2] })).toHaveAttribute('data-focused', 'true');
    await expect(lab.locator('[data-journey-hidden]')).toHaveText('(1.177, 0, −1.569, 0.392)');
    await expect(lab.locator('[data-journey-probability]')).toHaveText(['10.3%', '33.4%', '6.9%', '49.4%']);
    await expect(lab.locator('[data-largest=true] .journey-token')).toHaveText(locale === 'ko' ? '[끝]' : '[end]');
    await lab.locator('.journey__overview').click();
    await expect(lab).toHaveAttribute('data-mode', 'overview');
    await expect(lab).toHaveAttribute('data-progress', '2/3');
    await expect(input).toHaveText(words[locale]);
    await lab.locator('.journey__previous').click();
    await lab.locator('.journey__detail').click();
    for (let i = 1; i <= 10; i++) await forward(lab, i);
    await forward(lab, 11);
    await expect(lab).toHaveAttribute('data-finished', 'true');
    await expect(input).toHaveText(words[locale]);
    await expect(lab).toHaveAttribute('data-prefix', '0,1,2');
    await expect(lab.locator('[data-journey-scene]')).toContainText(locale === 'ko' ? '일반 마침표가 아니라' : 'not an ordinary period');
    await expect(lab.locator('.journey__next')).toHaveAttribute('href', '#tokens');
    await lab.locator('.journey__previous').click();
    await expect(lab).toHaveAttribute('data-stage', 'append');
    await expect(lab.locator('[data-journey-probability]')).toHaveText(['10.3%', '33.4%', '6.9%', '49.4%']);
    await lab.locator('.journey__previous').click();
    await expect(lab).toHaveAttribute('data-prefix', '0,1');
    await expect(lab.locator('[data-journey-probability]')).toHaveText(['11.5%', '11.6%', '71.8%', '5.2%']);
    await forward(lab, 10);
    await forward(lab, 11);
    await lab.locator('.journey__restart').click();
    await expect(lab).toHaveAttribute('data-stage', 'lookup');
    await expect(lab).toHaveAttribute('data-progress', '1/12');
    await expect(lab).toHaveAttribute('data-prefix', '0,1');
    await expect(input).toHaveText(words[locale].slice(0, 2));
    await expect(lab.locator('.journey__previous')).toBeDisabled();
    await forward(lab, 1);
    await lab.locator('.journey__overview').click();
    await expect(lab).toHaveAttribute('data-stage', 'purpose');
    await expect(lab).toHaveAttribute('data-progress', '1/3');
    await expect(page.locator('#numbers > .note').first()).toContainText(locale === 'ko' ? '독립 심화 실습' : 'independent advanced exercise');
    await expect(page.locator('#positions > .note').first()).toContainText(locale === 'ko' ? '새 연산' : 'new operation');
  });

  for (const layout of [{ width: 360, zoom: 100 }, { width: 280, zoom: 200 }]) {
    test(`${locale}: both routes stay readable at ${layout.width}px and ${layout.zoom}% text`, async ({ page }) => {
      await page.setViewportSize({ width: layout.width, height: 844 });
      for (const mode of ['overview', 'detail'] as const) {
        await page.goto(`${locale}/`);
        const lab = page.locator('.lab--generation-journey');
        await expect(lab.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr', '');
        await page.evaluate(zoom => document.documentElement.style.fontSize = `${zoom}%`, layout.zoom);
        if (mode === 'detail') await lab.locator('.journey__detail').click();
        const path = mode === 'overview' ? [0, 11, 12] : stages.map((_, i) => i).slice(1);
        for (const [index, step] of path.entries()) {
          await expect(lab).toHaveAttribute('data-mode', mode);
          await expect(lab).toHaveAttribute('data-stage', stages[step]);
          await expect(lab).toHaveAttribute('data-progress', `${index + 1}/${path.length}`);
          if (await lab.locator('.journey__scene > details').count()) await lab.locator('.journey__scene > details > summary').click();
          const bounds = await lab.evaluate(node => {
            const r = node.getBoundingClientRect();
            const text = [...node.querySelectorAll('p, td, th, summary, .journey-token, .journey__digits > span, [data-contribution-value], [data-journey-head-output], [data-journey-probability]')].filter(el => el.getClientRects().length);
            return { left: r.left, right: r.right, width: node.clientWidth, scroll: node.scrollWidth, fonts: text.map(el => parseFloat(getComputedStyle(el).fontSize)) };
          });
          expect(bounds.left).toBeGreaterThanOrEqual(0);
          expect(bounds.right).toBeLessThanOrEqual(layout.width + 1);
          expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
          expect(Math.min(...bounds.fonts)).toBeGreaterThanOrEqual(16 * layout.zoom / 100);
          for (const probability of await lab.locator('[data-journey-probabilities]').all()) {
            const fit = await probability.evaluate(node => {
              const r = node.getBoundingClientRect();
              return { width: node.clientWidth, scroll: node.scrollWidth, left: r.left, right: r.right, rows: [...node.querySelectorAll('.journey__probability-row')].map(row => ({ width: row.clientWidth, scroll: row.scrollWidth })) };
            });
            expect(fit.scroll).toBeLessThanOrEqual(fit.width);
            expect(fit.left).toBeGreaterThanOrEqual(bounds.left);
            expect(fit.right).toBeLessThanOrEqual(bounds.right);
            for (const row of fit.rows) expect(row.scroll).toBeLessThanOrEqual(row.width);
            await expect(probability.locator('table, .journey__scroll, .mgrid__scroll')).toHaveCount(0);
          }
          for (const region of await lab.locator('.journey__scroll, .mgrid__scroll').all()) {
            const scrolling = await region.evaluate(node => ({ width: node.clientWidth, scroll: node.scrollWidth, overflow: getComputedStyle(node).overflowX, optionalMatrix: node.matches('.mgrid__scroll') && Boolean(node.closest('details')) }));
            if (scrolling.scroll > scrolling.width + 1) {
              expect(scrolling.optionalMatrix).toBe(true);
              expect(scrolling.overflow).toBe('auto');
            }
          }
          await expect(lab.locator('.journey__next')).toHaveCount(1);
          if (index < path.length - 1) await lab.locator('.journey__next').click();
        }
      }
    });
  }
}
