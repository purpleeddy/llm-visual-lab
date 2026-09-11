/**
 * How the model learns — section 5 of the paper.
 *
 * - the loss: how wrong one prediction is, as a single number
 * - label smoothing (§5.4): the target is not quite 1 for the right word
 * - the learning-rate schedule, equation (3)
 *
 * The gradients themselves are not computed here. The article explains what
 * direction they point in and why, which does not need the derivatives written
 * out; anything it claims numerically is computed.
 */

import { ShapeError } from './errors';

export interface CrossEntropyTerm {
  index: number;
  /** What the model predicted for this word */
  probability: number;
  /** How much of the target sits on this word */
  target: number;
  /** ln(probability) */
  logProbability: number;
  /** −target · ln(probability): this word's share of the loss */
  contribution: number;
}

export interface CrossEntropy {
  terms: CrossEntropyTerm[];
  /** The sum of the contributions */
  loss: number;
}

function assertDistribution(p: number[]): void {
  if (p.length === 0) throw new ShapeError('emptyDistribution');
}

/**
 * Cross-entropy against a target distribution.
 *
 * With a one-hot target this collapses to −ln(p of the right word), which is
 * why the article can introduce the loss as "how surprised the model was".
 */
export function crossEntropy(probabilities: number[], target: number[]): CrossEntropy {
  assertDistribution(probabilities);
  if (target.length !== probabilities.length) {
    throw new ShapeError('vectorLengthMismatch', {
      what: 'the target',
      got: target.length,
      expected: probabilities.length,
    });
  }

  const terms = probabilities.map((probability, index) => {
    const logProbability = Math.log(probability);
    const t = target[index];
    // 0 · ln(0) is 0 here, not NaN: a word with no target mass costs nothing.
    const contribution = t === 0 ? 0 : -t * logProbability;
    return { index, probability, target: t, logProbability, contribution };
  });

  return { terms, loss: terms.reduce((a, t) => a + t.contribution, 0) };
}

/** A target that puts everything on one word. */
export function oneHot(size: number, target: number): number[] {
  if (size <= 0) throw new ShapeError('emptyDistribution');
  if (target < 0 || target >= size) throw new ShapeError('targetOutOfRange', { target, size });
  return Array.from({ length: size }, (_, i) => (i === target ? 1 : 0));
}

/**
 * Label smoothing, §5.4, with ε_ls = 0.1 in the paper.
 *
 * The right word gets 1 − ε and the rest share ε. The paper notes this *hurts*
 * perplexity — the model is being told to stay unsure — and improves BLEU and
 * accuracy anyway.
 */
export function labelSmoothed(size: number, target: number, epsilon: number): number[] {
  if (size <= 0) throw new ShapeError('emptyDistribution');
  if (target < 0 || target >= size) throw new ShapeError('targetOutOfRange', { target, size });
  const spread = epsilon / size;
  return Array.from({ length: size }, (_, i) => (i === target ? 1 - epsilon + spread : spread));
}

export interface LearningRatePoint {
  step: number;
  /** step^(−0.5) */
  decay: number;
  /** step · warmup^(−1.5) */
  warmupRamp: number;
  /** Which of the two the min() picked */
  phase: 'warmup' | 'decay';
  rate: number;
}

/**
 * Equation (3): lrate = d_model^(−0.5) · min(step^(−0.5), step · warmup^(−1.5)).
 *
 * Two straight lines on a log-log plot meeting at `warmup`. Before it the rate
 * climbs, after it the rate falls off as one over the square root of the step.
 */
export function learningRate(step: number, dModel = 512, warmupSteps = 4000): LearningRatePoint {
  if (step < 1) throw new ShapeError('targetOutOfRange', { target: step, size: 1 });
  const decay = Math.pow(step, -0.5);
  const warmupRamp = step * Math.pow(warmupSteps, -1.5);
  const rate = Math.pow(dModel, -0.5) * Math.min(decay, warmupRamp);
  return { step, decay, warmupRamp, phase: warmupRamp < decay ? 'warmup' : 'decay', rate };
}

/** The step at which the schedule turns over. It is exactly `warmupSteps`. */
export function learningRatePeak(dModel = 512, warmupSteps = 4000): LearningRatePoint {
  return learningRate(warmupSteps, dModel, warmupSteps);
}
