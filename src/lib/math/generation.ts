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
 * Beam search. A width of 1 is greedy decoding, which is why the article can use
 * one function for both and let the reader change a single number.
 */
export function beamSearch(model: ToyModel, beamWidth: number, maxSteps = 6): GenerationRun {
  if (beamWidth < 1) throw new ShapeError('targetOutOfRange', { target: beamWidth, size: 1 });

  let live: Candidate[] = [start()];
  const finished: Candidate[] = [];
  const steps: GenerationStep[] = [];

  for (let step = 1; step <= maxSteps && live.length > 0; step++) {
    const before = live;
    const expanded: Candidate[] = [];
    for (const c of live) {
      const dist = distributionFor(model, c);
      for (const [token, p] of Object.entries(dist)) expanded.push(extend(c, token, p));
    }

    const ranked = rank(expanded);
    // A finished sequence is put aside; it competes at the end, not for beam slots.
    const kept = ranked.filter((c) => !c.finished).slice(0, beamWidth);
    for (const c of ranked) if (c.finished) finished.push(c);

    steps.push({ step, before, expanded: ranked, kept });
    live = kept;

    // Once every live path is worse than the best finished one, nothing can improve.
    const bestFinished = rank(finished)[0];
    if (bestFinished && live.every((c) => c.probability <= bestFinished.probability)) break;
  }

  const ordered = rank(finished);
  if (ordered.length === 0) throw new ShapeError('emptyDistribution');
  return { beamWidth, steps, finished: ordered, best: ordered[0] };
}

/** Greedy decoding is beam search with one slot. */
export function greedy(model: ToyModel, maxSteps = 6): GenerationRun {
  return beamSearch(model, 1, maxSteps);
}
