import { expect, test } from '@playwright/test';

const stages = ['purpose', 'append', 'finished'];
const words = { ko: ['나는', '학교에', '갔다'], en: ['I', 'went', 'to school'] };

for (const locale of ['ko', 'en'] as const) {
  test(`${locale}: the compact opening appends, announces, stops and resets with one input`, async ({ page }) => {
    await page.goto(`${locale}/walkthrough/`);
    const lab = page.locator('.lab--generation-journey');
    await expect(lab.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr', '');
    const input = lab.locator('[data-journey-input] .journey-token');
    const status = lab.getByRole('status');
    await expect(lab).toHaveAttribute('data-mode', 'overview');
    await expect(lab).toHaveAttribute('data-progress', '1/3');
    await expect(lab).toHaveAttribute('data-stage', 'purpose');
    await expect(lab.locator('[data-journey-input]')).toHaveCount(1);
    await expect(input).toHaveText(words[locale].slice(0, 2));
    await expect(lab.locator('[data-journey-input] [data-token-id="2"]')).toHaveCount(0);
    await expect(lab.locator('[data-journey-preview], .journey__previous, .journey__overview, .stepper')).toHaveCount(0);
    await expect(lab.locator('[data-journey-probabilities]')).toHaveCount(1);
    await expect(lab.locator('[data-journey-probability]')).toHaveText(['11.5%', '11.6%', '71.8%', '5.2%']);
    await expect(lab.locator('[data-largest=true] .journey-token')).toHaveText(words[locale][2]);
    await expect(lab.locator('.journey__next')).toHaveCount(1);
    await expect(lab.locator('.journey__detail')).toHaveAttribute('href', '#tokens');
    await expect(lab.locator('.journey__detail')).toHaveAccessibleName(locale === 'ko' ? /계산 살펴보기/ : /Explore the calculation/);
    await expect(status).toHaveAttribute('aria-live', 'polite');
    await expect(status).toHaveAttribute('aria-atomic', 'true');
    const initialStatus = await status.textContent();
    await page.clock.install();
    await page.clock.fastForward(60_000);
    await expect(lab).toHaveAttribute('data-progress', '1/3');
    await lab.locator('.journey__next').focus();
    await page.keyboard.press('Enter');
    await expect(lab).toHaveAttribute('data-stage', 'append');
    await expect(lab).toHaveAttribute('data-progress', '2/3');
    await expect(lab).toHaveAttribute('data-prefix', '0,1,2');
    await expect(input).toHaveText(words[locale]);
    await expect(input.last()).toHaveAttribute('data-focused', 'true');
    await expect(input.last()).toHaveAttribute('data-new', 'true');
    await expect(lab.locator('[data-journey-probability]')).toHaveText(['10.3%', '33.4%', '6.9%', '49.4%']);
    await expect(lab.locator('[data-largest=true] .journey-token')).toHaveText(locale === 'ko' ? '[끝]' : '[end]');
    await expect(status).not.toHaveText(initialStatus!);
    await expect(status).toContainText(words[locale][2]);
    await expect(status).toContainText(locale === 'ko' ? '다시 계산' : 'Recomputed');
    const appendedStatus = await status.textContent();
    await lab.locator('.journey__next').click();
    await expect(lab).toHaveAttribute('data-stage', 'finished');
    await expect(lab).toHaveAttribute('data-progress', '3/3');
    await expect(lab).toHaveAttribute('data-finished', 'true');
    await expect(input).toHaveText(words[locale]);
    await expect(lab.locator('[data-journey-input] [data-token-id="3"]')).toHaveCount(0);
    await expect(lab.locator('.journey__next')).toHaveCount(0);
    await expect(status).not.toHaveText(appendedStatus!);
    await expect(status).toContainText(locale === 'ko' ? '멈췄습니다' : 'stopped');
    await lab.locator('.journey__restart').click();
    await expect(lab).toHaveAttribute('data-stage', 'purpose');
    await expect(lab).toHaveAttribute('data-progress', '1/3');
    await expect(lab).toHaveAttribute('data-prefix', '0,1');
    await expect(lab).toHaveAttribute('data-finished', 'false');
    await expect(input).toHaveText(words[locale].slice(0, 2));
    await expect(lab.locator('[data-journey-probability]')).toHaveText(['11.5%', '11.6%', '71.8%', '5.2%']);
    await expect(status).toContainText(locale === 'ko' ? '두 입력으로 돌아왔습니다' : 'Reset to the two inputs');
    await lab.locator('.journey__detail').click();
    await expect(page).toHaveURL(/#tokens$/);
    await expect(lab).toHaveAttribute('data-stage', 'purpose');
    await expect(page.locator('#tokens')).toBeInViewport();
  });

  test(`${locale}: the main article retains the opening calculation from lookup through readout`, async ({ page }) => {
    await page.goto(`${locale}/walkthrough/`);
    const lab = page.locator('.lab--generation-journey');
    const stage = (name: string) => page.locator(`[data-main-lesson] [data-lesson-stage="${name}"]:visible`);
    await expect(lab.locator('[data-journey-input] .journey-token')).toHaveText(words[locale].slice(0, 2));
    await expect(lab.locator('[data-journey-input] [data-focused=true]')).toHaveText(words[locale][1]);
    await expect(page.locator('#generation-opening')).toHaveCount(1);
    await expect(page.locator('#table-generation')).not.toHaveAttribute('open');
    await expect(page.locator('.lab--next-token')).toHaveCount(0);
    expect(await lab.evaluate(node => Boolean(node.compareDocumentPosition(document.querySelector('#tokens')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await expect(lab.getByRole('button', { name: /^(?:자동으로 보기|재생|일시정지|Play|Pause)$/i })).toHaveCount(0);
    await expect(stage('tokens').locator('[data-embedding-id="0"] > span')).toHaveText(['1', '0', '1', '0']);
    await expect(stage('tokens').locator('[data-embedding-id="1"] > span')).toHaveText(['0', '1', '0', '1']);
    for (const name of ['tokens', 'projection', 'comparison', 'transpose', 'scores', 'shares', 'aggregation']) {
      await expect(stage(name)).toHaveAttribute('data-lesson-prefix', '0,1');
      await expect(stage(name)).not.toContainText(words[locale][2]);
      await expect(stage(name).locator('[data-journey-probabilities]')).toHaveCount(0);
    }
    const projection = stage('projection');
    await expect(projection.locator(':scope > .lesson-value').first().locator('.journey__digits > span')).toHaveText(['0', '1', '0', '1']);
    await expect(projection.locator('[data-projection-coordinate="1"] .journey__digits > span')).toHaveText(['0', '1', '0', '1']);
    await expect(projection.locator('[data-projection-coordinate="1"] .lesson-equation')).toHaveText('0 × 0 + 1 × 1 + 0 × 0 + 1 × 1 = 2');
    await expect(projection.locator(':scope > .lesson-value').last().locator('.journey__digits > span')).toHaveText(['0', '2']);
    await projection.locator('details > summary').click();
    await expect(projection.locator('[data-matrix] .mgrid__value')).toHaveText(['0', '1', '1', '0', '0', '1', '1', '0']);
    const comparison = stage('comparison');
    await expect(comparison.locator(':scope > .lesson-value .journey__digits > span')).toHaveText(['0', '2']);
    await expect(comparison.locator('[data-reference-id="0"] .journey__digits > span')).toHaveText(['0', '2']);
    await expect(comparison.locator('[data-reference-id="0"] [data-lesson-score]')).toHaveText('4');
    await expect(comparison.locator('[data-lesson-score]')).toHaveText(['4', '0']);
    const transpose = stage('transpose');
    await expect(transpose.locator('[data-lesson-transposed] > span')).toHaveText(['0', '2']);
    await expect(transpose.locator('.journey__pair > strong')).toHaveText('4');
    const cells = await transpose.locator('[data-lesson-transposed] > span').evaluateAll(nodes => nodes.map(node => { const r = node.getBoundingClientRect(); return { x: r.x, y: r.y }; }));
    expect(cells[0].x).toBeCloseTo(cells[1].x, 0);
    expect(cells[1].y).toBeGreaterThan(cells[0].y);
    await expect(stage('scores').locator('.lesson-reference-columns .journey-token')).toHaveText(words[locale].slice(0, 2));
    await expect(stage('scores').locator('[data-lesson-score]')).toHaveText(['4', '0']);
    await expect(stage('shares').locator('[data-lesson-share]')).toHaveText(['94.4%', '5.6%']);
    await expect(stage('shares')).toContainText('4 ÷ √2 = 2.828');
    const mixture = stage('aggregation').locator('[data-journey-mixture]');
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
    await stage('aggregation').locator('details > summary').last().click();
    await expect(stage('aggregation').locator('[data-journey-exact-head-output]')).toHaveText(['2.832578', '0.167422']);
    await expect(stage('attention').locator('.lesson-attention-flow')).toContainText('÷ √2');
    await expect(stage('attention').locator('.lesson-attention-flow')).toContainText('× V = (2.833, 0.167)');
    await expect(stage('heads').locator('[data-lesson-head="0"] .lesson-value').last().locator('.journey__digits > span')).toHaveText(['2.833', '0.167']);
    await expect(stage('heads').locator('[data-lesson-head="1"] .lesson-value').last().locator('.journey__digits > span')).toHaveText(['0.670', '0.330']);
    await expect(stage('hidden').locator('.lesson-value').last().locator('.journey__digits > span')).toHaveText(['0.520', '−0.513', '1.313', '−1.320']);
    await expect(stage('readout').locator('.lesson-value').last().locator('.journey__digits > span')).toHaveText(['−0.520', '−0.513', '1.313', '−1.320']);
    await expect(stage('readout').locator('[data-journey-probability]')).toHaveText(['11.5%', '11.6%', '71.8%', '5.2%']);
    await expect(stage('readout').locator('[data-largest=true] .journey-token')).toHaveText(words[locale][2]);
    await expect(lab.locator('[data-journey-input] .journey-token')).toHaveText(words[locale].slice(0, 2));
    await expect(page.locator('#legacy-numbers')).toHaveCount(0);
    await expect(page.locator('#lesson-position-extension')).not.toHaveAttribute('open');
    await expect(stage('mask')).toHaveAttribute('data-lesson-mask', 'on');
  });

  for (const layout of [{ width: 360, zoom: 100 }, { width: 280, zoom: 200 }]) {
    test(`${locale}: all three opening states stay readable at ${layout.width}px and ${layout.zoom}% text`, async ({ page }) => {
      await page.setViewportSize({ width: layout.width, height: 844 });
      await page.goto(`${locale}/walkthrough/`);
      const lab = page.locator('.lab--generation-journey');
      await expect(lab.locator('xpath=ancestor::astro-island')).not.toHaveAttribute('ssr', '');
      await page.evaluate(zoom => document.documentElement.style.fontSize = `${zoom}%`, layout.zoom);
      for (const [index, step] of stages.entries()) {
        await expect(lab).toHaveAttribute('data-stage', step);
        await expect(lab).toHaveAttribute('data-progress', `${index + 1}/3`);
        const bounds = await lab.evaluate(node => {
          const r = node.getBoundingClientRect();
          const text = [...node.querySelectorAll('p, a, button, .journey-token, [data-journey-probability]')].filter(el => el.getClientRects().length);
          return { left: r.left, right: r.right, width: node.clientWidth, scroll: node.scrollWidth, fonts: text.map(el => parseFloat(getComputedStyle(el).fontSize)) };
        });
        expect(bounds.left).toBeGreaterThanOrEqual(0);
        expect(bounds.right).toBeLessThanOrEqual(layout.width + 1);
        expect(bounds.scroll).toBeLessThanOrEqual(bounds.width + 1);
        expect(Math.min(...bounds.fonts)).toBeGreaterThanOrEqual(16 * layout.zoom / 100);
        const probability = lab.locator('[data-journey-probabilities]');
        const fit = await probability.evaluate(node => {
          const r = node.getBoundingClientRect();
          return { width: node.clientWidth, scroll: node.scrollWidth, left: r.left, right: r.right, rows: [...node.querySelectorAll('.journey__probability-row')].map(row => ({ width: row.clientWidth, scroll: row.scrollWidth })) };
        });
        expect(fit.scroll).toBeLessThanOrEqual(fit.width);
        expect(fit.left).toBeGreaterThanOrEqual(bounds.left);
        expect(fit.right).toBeLessThanOrEqual(bounds.right);
        for (const row of fit.rows) expect(row.scroll).toBeLessThanOrEqual(row.width);
        await expect(probability.locator('table, .journey__scroll, .mgrid__scroll')).toHaveCount(0);
        if (index < stages.length - 1) {
          await expect(lab.locator('.journey__next')).toHaveCount(1);
          await lab.locator('.journey__next').click();
        } else {
          await expect(lab.locator('.journey__next')).toHaveCount(0);
          await expect(lab.locator('.journey__restart')).toHaveCount(1);
        }
      }
    });
  }
}
