import { describe, expect, it } from 'vitest';
import {
  STORY_EMBEDDING, STORY_FEATURES, STORY_ID, STORY_FUTURE, STORY_KEY_FEATURES, STORY_PAST, STORY_READOUT,
  STORY_UNTRAINED_READOUT, STORY_VOCAB, storyGenerate, storyLastWordOnly, storyLearningStep, storyRun, storyTrainingPairs,
} from '../../src/lib/math/story';

/** The article's claims, in the order its chapters make them. */
describe('the readable next-word machine', () => {
  it('names every slot and word in both languages with matching shapes', () => {
    for (const locale of ['ko', 'en'] as const) {
      expect(STORY_FEATURES[locale]).toHaveLength(STORY_EMBEDDING[0].length);
      expect(STORY_KEY_FEATURES[locale]).toHaveLength(2);
      expect(STORY_VOCAB[locale]).toHaveLength(STORY_READOUT[0].length);
    }
    expect(STORY_EMBEDDING).toHaveLength(STORY_VOCAB.ko.length);
    expect(STORY_PAST.slice(1)).toEqual(STORY_FUTURE.slice(1));
  });

  it('cannot tell 갔다 from 간다 when it sees only the last word, for either sentence', () => {
    const past = storyLastWordOnly(STORY_PAST);
    const future = storyLastWordOnly(STORY_FUTURE);
    expect(past.probabilities).toEqual(future.probabilities);
    expect(past.probabilities[STORY_ID.pastVerb]).toBeCloseTo(past.probabilities[STORY_ID.futureVerb], 12);
    expect(past.probabilities[STORY_ID.pastVerb]).toBeCloseTo(0.317, 3);
  });

  it('takes most of its time information from the first word and adds it to the place slot', () => {
    const run = storyRun(STORY_PAST);
    expect(run.attention.Q[run.last]).toEqual([3, 0]);
    expect(run.attention.K).toEqual([[1, 0], [0, 1]]);
    expect(run.attention.scores[run.last]).toEqual([3, 0]);
    expect(run.attention.weights[run.last][0]).toBeCloseTo(0.893, 3);
    expect(run.attention.weights[run.last][0] + run.attention.weights[run.last][1]).toBeCloseTo(1, 12);
    expect(run.mixed[run.last][0]).toBeCloseTo(0.893, 3);
    expect(run.mixed[run.last][2]).toBeCloseTo(1.107, 3);
    // The causal mask: the first word sees only itself.
    expect(run.attention.weights[0]).toEqual([1, 0]);
  });

  it('then prefers 갔다 after 어제 and 간다 after 내일 with the same coefficients', () => {
    const past = storyRun(STORY_PAST);
    const future = storyRun(STORY_FUTURE);
    expect(past.nextId).toBe(STORY_ID.pastVerb);
    expect(future.nextId).toBe(STORY_ID.futureVerb);
    expect(past.probabilities[past.last][STORY_ID.pastVerb]).toBeCloseTo(0.881, 3);
    expect(future.probabilities[future.last][STORY_ID.futureVerb]).toBeCloseTo(past.probabilities[past.last][STORY_ID.pastVerb], 12);
    for (const run of [past, future]) expect(run.probabilities[run.last].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  it('appends its choice, recomputes and stops at the end marker without looking it up', () => {
    const steps = storyGenerate(STORY_PAST);
    expect(steps.map(s => s.chosen)).toEqual([STORY_ID.pastVerb, STORY_ID.end]);
    expect(steps[1].tokenIds).toEqual([...STORY_PAST, STORY_ID.pastVerb]);
    expect(steps[1].probabilities[STORY_ID.end]).toBeCloseTo(0.971, 3);
    expect(() => storyRun([...STORY_PAST, STORY_ID.end])).toThrow(RangeError);
  });

  it('turns one sentence into three training pairs computed in one masked pass', () => {
    const pairs = storyTrainingPairs();
    expect(pairs.map(p => p.target)).toEqual([STORY_ID.middle, STORY_ID.pastVerb, STORY_ID.end]);
    expect(pairs[0].probability).toBeCloseTo(0.0176, 4);
    expect(pairs[1].probability).toBeCloseTo(0.881, 3);
    // A prefix's prediction does not change when later words are present.
    expect(pairs[1].probability).toBeCloseTo(storyRun(STORY_PAST).probabilities[1][STORY_ID.pastVerb], 12);
    for (const p of pairs) expect(p.loss).toBeCloseTo(-Math.log(p.probability), 12);
  });

  it('learns the past→갔다 rule with one gradient step from a table that ignores time', () => {
    expect(STORY_UNTRAINED_READOUT.map(row => row[STORY_ID.pastVerb])).toEqual(STORY_UNTRAINED_READOUT.map(row => row[STORY_ID.futureVerb]));
    const step = storyLearningStep(1);
    const before = step.before.probabilities[1];
    const after = step.after.probabilities[1];
    expect(before[STORY_ID.pastVerb]).toBeCloseTo(before[STORY_ID.futureVerb], 12);
    expect(before[STORY_ID.pastVerb]).toBeCloseTo(0.379, 3);
    expect(step.gradient).toBeLessThan(0);
    expect(step.nextWeight).toBeGreaterThan(step.weight);
    expect(after[STORY_ID.pastVerb]).toBeCloseTo(0.5, 3);
    expect(step.lossAfter).toBeLessThan(step.loss);
    // The gradient matches a finite difference of the loss: moving the weight by h changes the loss by about gradient × h.
    const h = 1e-6;
    const nudged = storyLearningStep(h / -step.gradient);
    expect((nudged.lossAfter - step.loss) / h).toBeCloseTo(step.gradient, 4);
    expect(() => storyLearningStep(-1)).toThrow(RangeError);
  });
});
