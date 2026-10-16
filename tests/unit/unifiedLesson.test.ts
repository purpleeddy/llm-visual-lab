import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { lessonSnapshot, lessonReadoutStep, LESSON_INITIAL_IDS, LESSON_READOUT } from '../../src/lib/math/lessonGeneration';
import { addPositions } from '../../src/lib/math/positional';
import { LessonComputation, LESSON_STAGES } from '../../src/components/lab/LessonComputation';
import { LessonGeneration } from '../../src/components/lab/LessonGeneration';
import { LessonLearning } from '../../src/components/lab/LessonLearning';

const lossAt = (weight: number) => {
  const readout = LESSON_READOUT.map(row => [...row]);
  readout[2][2] = weight;
  return -Math.log(lessonSnapshot(LESSON_INITIAL_IDS, false, readout).probabilities[1][2]);
};

describe('one snapshot through the complete reading path', () => {
  it('keeps the baseline contract while an explicit position addition recomputes later stages', () => {
    const before = lessonSnapshot();
    const after = lessonSnapshot(LESSON_INITIAL_IDS, true);
    expect(before.stages.position).toEqual(before.stages.embedding);
    expect(after.stages.embedding).toEqual(before.stages.embedding);
    expect(after.stages.position).toEqual(addPositions(before.stages.embedding).sum);
    expect(after.attention.X).toEqual(after.stages.position);
    expect(after.attention.perHead[0].Q).not.toEqual(before.attention.perHead[0].Q);
    expect(after.hidden).not.toEqual(before.hidden);
    expect(after.logits).not.toEqual(before.logits);
    expect(after.probabilities).not.toEqual(before.probabilities);
    expect(after.readout).toEqual(before.readout);
    expect(after.stages.logits).toEqual(after.logits);
    expect(after.stages.probabilities).toEqual(after.probabilities);
    expect(after.attention.perHead.every(head => head.settings.masked)).toBe(true);
    expect(lessonSnapshot()).toEqual(before);
  });

  it('takes an actual four-candidate gradient step on one vocabulary coefficient', () => {
    const original = LESSON_READOUT.map(row => [...row]);
    const step = lessonReadoutStep();
    expect(step.before.tokenIds).toEqual([0, 1]);
    expect(step.after.tokenIds).toEqual([0, 1]);
    expect(step.targetId).toBe(2);
    expect(step.before.hidden).toEqual(step.after.hidden);
    expect(step.before.attention).toEqual(step.after.attention);
    expect(step.before.probabilities[1][2]).toBeCloseTo(0.7179269189523142, 12);
    expect(step.beforeLoss).toBeCloseTo(-Math.log(0.7179269189523142), 12);
    const epsilon = 1e-5;
    const finiteDifference = (lossAt(step.weight + epsilon) - lossAt(step.weight - epsilon)) / (2 * epsilon);
    expect(step.gradient).toBeCloseTo(finiteDifference, 7);
    expect(step.nextWeight).toBeCloseTo(step.weight - step.learningRate * step.gradient, 12);
    expect(step.after.probabilities[1][2]).toBeGreaterThan(step.before.probabilities[1][2]);
    expect(step.afterLoss).toBeLessThan(step.beforeLoss);
    step.after.readout.forEach((row, i) => row.forEach((value, j) => {
      if (i !== 2 || j !== 2) expect(value).toBe(original[i][j]);
    }));
    for (const row of step.after.probabilities) expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(step.after.stages.logits).toEqual(step.after.logits);
    expect(step.after.stages.probabilities).toEqual(step.after.probabilities);
    expect(LESSON_READOUT).toEqual(original);
    expect(lessonReadoutStep(0).after).toEqual(step.before);
    expect(() => lessonReadoutStep(-0.1)).toThrow(RangeError);
  });

  for (const locale of ['ko', 'en'] as const) {
    it(`${locale}: every read-only stage uses two inputs and contains no legacy three-token calculation`, () => {
      for (const stage of LESSON_STAGES) {
        const html = renderToStaticMarkup(createElement(LessonComputation, { locale, stage }));
        expect(html).toContain(`data-lesson-stage="${stage}"`);
        expect(html).toContain('data-lesson-prefix="0,1"');
        expect(html).toContain('data-lesson-focus="1"');
        expect(html).toContain('data-lesson-position="off"');
        expect(html).toContain('data-lesson-mask="on"');
        expect(html).not.toContain('(0, 4, 2)');
        expect(html).not.toContain('76.8%');
        expect(html).not.toContain('<button');
        expect(html).not.toContain('stepper');
        const input = html.match(/<p class="lesson-context">[\s\S]*?<\/p>/)![0];
        expect(input).toContain('data-token-id="0"');
        expect(input).toContain('data-token-id="1"');
        expect(input).not.toContain('data-token-id="2"');
      }
    });
    it(`${locale}: training and generation begin with the same two inputs and actual target probability`, () => {
      const learning = renderToStaticMarkup(createElement(LessonLearning, { locale }));
      const generation = renderToStaticMarkup(createElement(LessonGeneration, { locale }));
      expect(learning).toContain('data-learning-prefix="0,1"');
      expect(learning).toContain('0.7179269');
      expect(generation).toContain('data-generation-prefix="0,1"');
      expect(generation).toContain('71.8%');
      expect(generation).toContain('T = 1');
      expect(learning.match(/data-learning-input="[^"]*"[\s\S]*?<\/p>/)![0]).not.toContain('data-token-id="2"');
      expect(generation.match(/data-generation-input="[^"]*"[\s\S]*?<\/p>/)![0]).not.toContain('data-token-id="2"');
    });
  }
});
