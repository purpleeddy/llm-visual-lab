import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { computeAttention } from '../../src/lib/math/attention';
import { defaultAttentionInput } from '../../src/lib/math/examples';
import { attentionStepText, WALK_TEXT } from '../../src/lib/i18n/labText';
import { MatrixGrid } from '../../src/components/lab/MatrixGrid';

describe('causal mask presentation keeps scores and probabilities distinct', () => {
  it('shows blocked attention probabilities as numeric zero', () => {
    const html = renderToStaticMarkup(createElement(MatrixGrid, {
      matrix: [[1, 0, 0]], name: 'A', tone: 'weight', allowed: [[true, false, false]],
    }));
    expect(html).not.toContain('−∞');
    expect(html.match(/>0\.000</g)).toHaveLength(2);
  });
  it('shows blocked scores as negative infinity', () => {
    const html = renderToStaticMarkup(createElement(MatrixGrid, {
      matrix: [[0, 2, 1]], name: 'S′', tone: 'score', allowed: [[true, false, false]],
    }));
    expect(html.match(/>−∞</g)).toHaveLength(2);
  });
});


describe('attention guidance follows edits and settings', () => {
  const edited = defaultAttentionInput();
  edited.X[0][0] = 3;
  const result = computeAttention(edited);
  for (const locale of ['ko', 'en'] as const) {
    it(`${locale}: scores and output explanations use the recomputed values`, () => {
      const scores = attentionStepText(locale, 'scores', result);
      expect(scores.why).toContain('(4, 0)');
      expect(scores.why).toContain('(0, 8, 4)');
      expect(scores.why).toContain('(4, 2, 2)');
      const weights = attentionStepText(locale, 'softmax', result);
      expect(weights.tryThis).toContain('(0.673, 0.164, 0.164)');
      expect(weights.tryThis).not.toContain('1/3');
      expect(attentionStepText(locale, 'output', result).tryThis).toContain('(3.528, 0.654)');
    });
    it(`${locale}: masked weights are zero in the live explanation`, () => {
      const masked = computeAttention({ ...edited, masked: true });
      expect(attentionStepText(locale, 'softmax', masked).why).toContain('(1.000, 0.000, 0.000)');
    });
  }
});


describe('encoder prose distinguishes representations from model blocks', () => {
  it('passes an output matrix between layers while retaining the six-block architecture', () => {
    const description = WALK_TEXT.en.steps.encoder.what;
    expect(description).toContain('The matrix one layer puts out');
    expect(description).not.toContain('The block one layer puts out');
    expect(description).toContain('six blocks of this structure');
  });
});
