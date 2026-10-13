/**
 * Producing a sentence — one word at a time.
 *
 * Training runs every position at once, because the answer is already known.
 * Generation cannot: each word has to be chosen before the next one can be
 * predicted. This module runs that loop over a tiny, explicitly written model so
 * the article can show why taking the best word at every step is not the same as
 * finding the best sentence.
 *
 * The probabilities here are written down by hand, not learned. They are small
 * enough to check on paper, which is the whole point.
 */

import { ShapeError } from './errors';
import { softmaxRow } from './softmax';

/** A sentence ends when this is produced. The paper writes it <eos>. */
export const END = '.';

/**
 * A toy model: for each prefix, what it thinks comes next.
 * The key is the prefix joined by spaces; the empty string is the start.
 */
export type ToyModel = Record<string, Record<string, number>>;

export interface Candidate {
  /** The tokens chosen so far, the end marker included once produced */
  tokens: string[];
  /** The product of the probabilities along this path */
  probability: number;
  /** The sum of their logs — what an implementation would actually add up */
  logProbability: number;
  finished: boolean;
}

export interface GenerationStep {
  step: number;
  /** What was on the table at the start of this step */
  before: Candidate[];
  /** Everything one more word could produce */
  expanded: Candidate[];
  /** What survived to the next step */
  kept: Candidate[];
}

export interface GenerationRun {
  beamWidth: number;
  steps: GenerationStep[];
  /** The finished sequences, best first */
  finished: Candidate[];
  best: Candidate;
}

function start(): Candidate {
  return { tokens: [], probability: 1, logProbability: 0, finished: false };
}

function extend(c: Candidate, token: string, p: number): Candidate {
  return {
    tokens: [...c.tokens, token],
    probability: c.probability * p,
    logProbability: c.logProbability + Math.log(p),
    finished: token === END,
  };
}

function distributionFor(model: ToyModel, c: Candidate): Record<string, number> {
  const key = c.tokens.join(' ');
  const dist = model[key];
  if (!dist) throw new ShapeError('emptyDistribution');
  return dist;
}

/** Sorts by probability, highest first, and breaks ties by token order so runs repeat. */
function rank(list: Candidate[]): Candidate[] {
  return [...list].sort(
    (a, b) => b.probability - a.probability || a.tokens.join(' ').localeCompare(b.tokens.join(' ')),
  );
}

/**
 * Beam search keeps the highest-probability candidates, including finished ones.
 * An end token competes for a slot like every other token. With one slot this
 * chooses exactly the best next token and can never resurrect an unchosen end.
 */
export function beamSearch(model: ToyModel, beamWidth: number, maxSteps = 6): GenerationRun {
  if (beamWidth < 1) throw new ShapeError('targetOutOfRange', { target: beamWidth, size: 1 });

  let beam: Candidate[] = [start()];
  const steps: GenerationStep[] = [];

  for (let step = 1; step <= maxSteps; step++) {
    const before = beam;
    const expanded: Candidate[] = [];
    for (const c of beam) {
      if (c.finished) {
        expanded.push(c);
      } else {
        const dist = distributionFor(model, c);
        for (const [token, p] of Object.entries(dist)) expanded.push(extend(c, token, p));
      }
    }

    const ranked = rank(expanded);
    beam = ranked.slice(0, beamWidth);
    steps.push({ step, before, expanded: ranked, kept: beam });

    // Each future probability is at most 1, so a live path cannot get larger.
    const finished = beam.filter((c) => c.finished);
    const live = beam.filter((c) => !c.finished);
    if (finished[0] && live.every((c) => c.probability <= finished[0].probability)) break;
  }

  const finished = beam.filter((c) => c.finished);
  if (finished.length === 0) throw new ShapeError('emptyDistribution');
  return { beamWidth, steps, finished, best: finished[0] };
}

/** Greedy decoding is beam search with one slot. */
export function greedy(model: ToyModel, maxSteps = 6): GenerationRun {
  return beamSearch(model, 1, maxSteps);
}

/** Vocabulary probabilities at temperature T; this is separate from attention scaling. */
export function temperatureProbabilities(logits: number[], temperature = 1): number[] {
  if (!Number.isFinite(temperature) || temperature <= 0 || !logits.every(Number.isFinite)) {
    throw new RangeError('Temperature must be positive and logits must be finite.');
  }
  return softmaxRow(logits.map(value => value / temperature)).probabilities;
}

/** Pick the bin containing a uniform draw u in [0, 1). Zero-width bins are never picked. */
export function sampleIndex(probabilities: number[], u: number): number {
  const total = probabilities.reduce((sum, p) => sum + p, 0);
  if (!Number.isFinite(u) || u < 0 || u >= 1 || probabilities.length === 0 ||
      probabilities.some(p => !Number.isFinite(p) || p < 0 || p > 1) || Math.abs(total - 1) > 1e-9) {
    throw new RangeError('Use a probability distribution and a draw in [0, 1).');
  }
  let cumulative = 0;
  let lastPositive = 0;
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i];
    if (probabilities[i] > 0) lastPositive = i;
    if (u < cumulative) return i;
  }
  return lastPositive; // rounding can leave the sum a few ulps below 1
}
