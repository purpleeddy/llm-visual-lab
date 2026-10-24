/**
 * The article's worked example: a next-word machine whose numbers can be read.
 *
 * Every vector has named slots (past, future, place, verb) and every coefficient states
 * a rule a person could write down. The values are designed, not learned; the article
 * says so once, and its last chapter contrasts them with a trained model's unreadable
 * slots. All arithmetic goes through the same helpers as the rest of the site.
 */
import type { Locale } from '../i18n/routing';
import { computeAttention, type AttentionResult } from './attention';
import { matmul, type Matrix } from './matrix';
import { softmaxRow, type SoftmaxRow } from './softmax';
import { crossEntropy, oneHot } from './training';

/** Slot names of a word vector. The English sentence uses a person where Korean uses a place. */
export const STORY_FEATURES: Record<Locale, string[]> = {
  ko: ['과거', '미래', '장소', '동작'],
  en: ['past', 'future', 'person', 'verb'],
};
/** Slot names of the comparison values Q and K. */
export const STORY_KEY_FEATURES: Record<Locale, string[]> = {
  ko: ['시간', '장소'],
  en: ['time', 'person'],
};
export const STORY_VOCAB: Record<Locale, string[]> = {
  ko: ['어제', '내일', '학교에', '갔다', '간다', '끝'],
  en: ['Yesterday', 'Tomorrow', 'I', 'went', 'will', 'end'],
};
export const STORY_ID = { past: 0, future: 1, middle: 2, pastVerb: 3, futureVerb: 4, end: 5 } as const;
/** The two sentences the article compares. Only the first word differs. */
export const STORY_PAST: readonly number[] = [STORY_ID.past, STORY_ID.middle];
export const STORY_FUTURE: readonly number[] = [STORY_ID.future, STORY_ID.middle];

/** One row per word: which named slots it has. The end marker is never looked up. */
export const STORY_EMBEDDING: Matrix = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [1, 0, 0, 1],
  [0, 1, 0, 1],
  [0, 0, 0, 0],
];
/** Query: what a position looks for. The place (person) position, which precedes the verb, looks for time. */
export const STORY_WQ: Matrix = [
  [0, 0],
  [0, 0],
  [3, 0],
  [0, 0],
];
/** Key: what a position offers. Past and future offer time; the place (person) slot offers itself. */
export const STORY_WK: Matrix = [
  [1, 0],
  [1, 0],
  [0, 1],
  [0, 0],
];
/** Value: the content taken. Here a word's own slots, unchanged. */
export const STORY_WV: Matrix = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];
/**
 * Next-word scores: one column per candidate, one row per slot. Each column says which
 * slots that word likes after it: 갔다 likes past and a place, dislikes future and a
 * preceding verb; the end marker follows a verb; a time word rarely follows time.
 */
export const STORY_READOUT: Matrix = [
  [-1, -1, 0, 2, -2, 0],
  [-1, -1, 0, -2, 2, 0],
  [0, 0, -2, 1, 1, 0],
  [0, 0, 0, -3, -3, 3],
];

export interface StoryRun {
  tokenIds: number[];
  /** n × 4 word vectors */
  X: Matrix;
  attention: AttentionResult;
  /** X + attention output: each position keeps its own slots and adds what it took */
  mixed: Matrix;
  /** Next-word scores and probabilities at every position */
  scores: Matrix;
  softmax: SoftmaxRow[];
  probabilities: Matrix;
  last: number;
  /** Highest-probability next word at the final position */
  nextId: number;
}

function check(tokenIds: readonly number[]) {
  if (!tokenIds.length || tokenIds.some(id => !Number.isInteger(id) || id < 0 || id >= STORY_ID.end)) {
    throw new RangeError('Story inputs are word IDs 0–4; the end marker stops generation.');
  }
}

function readout(rows: Matrix, weights: Matrix = STORY_READOUT) {
  const scores = matmul(rows, weights);
  const softmax = scores.map((row, i) => softmaxRow(row, undefined, i));
  return { scores, softmax, probabilities: softmax.map(row => row.probabilities) };
}

/** The full machine: look up words, let each position take from the ones it may read, add, score the next word. */
export function storyRun(tokenIds: readonly number[] = STORY_PAST, weights: Matrix = STORY_READOUT): StoryRun {
  check(tokenIds);
  const X = tokenIds.map(id => [...STORY_EMBEDDING[id]]);
  const attention = computeAttention({ X, WQ: STORY_WQ, WK: STORY_WK, WV: STORY_WV, scaled: true, masked: true });
  const mixed = X.map((row, i) => row.map((value, j) => value + attention.output[i][j]));
  const out = readout(mixed, weights);
  const last = tokenIds.length - 1;
  const row = out.probabilities[last];
  const nextId = row.reduce((best, p, id) => (p > row[best] ? id : best), 0);
  return { tokenIds: [...tokenIds], X, attention, mixed, ...out, last, nextId };
}

/** The first machine: score the next word from the last word's own vector, with no context. */
export function storyLastWordOnly(tokenIds: readonly number[] = STORY_PAST) {
  check(tokenIds);
  const lastVector = [...STORY_EMBEDDING[tokenIds[tokenIds.length - 1]]];
  const out = readout([lastVector]);
  return { lastVector, scores: out.scores[0], softmax: out.softmax[0], probabilities: out.probabilities[0] };
}

/** Greedy generation from a prefix until the end marker, recomputing after every appended word. */
export function storyGenerate(prefix: readonly number[] = STORY_PAST, maxSteps = 4) {
  const steps: { tokenIds: number[]; probabilities: number[]; chosen: number }[] = [];
  let ids = [...prefix];
  for (let i = 0; i < maxSteps; i++) {
    const run = storyRun(ids);
    steps.push({ tokenIds: [...ids], probabilities: run.probabilities[run.last], chosen: run.nextId });
    if (run.nextId === STORY_ID.end) break;
    ids = [...ids, run.nextId];
  }
  return steps;
}

/**
 * The machine before it learned that 갔다 follows the past: its 갔다 and 간다 columns
 * ignore time. One cross-entropy gradient step on the past slot of the 갔다 column
 * (all other coefficients fixed) raises the probability of the right word.
 */
export const STORY_UNTRAINED_READOUT: Matrix = STORY_READOUT.map((row, slot) =>
  row.map((value, id) => ((id === STORY_ID.pastVerb || id === STORY_ID.futureVerb) && slot < 2 ? 0 : value)),
);
export function storyLearningStep(learningRate = 1) {
  if (!Number.isFinite(learningRate) || learningRate < 0) throw new RangeError('Learning rate must be finite and nonnegative.');
  const target = STORY_ID.pastVerb;
  const slot = 0;
  const before = storyRun(STORY_PAST, STORY_UNTRAINED_READOUT);
  const h = before.mixed[before.last];
  const p = before.probabilities[before.last];
  const loss = crossEntropy(p, oneHot(p.length, target)).loss;
  const gradient = h[slot] * (p[target] - 1);
  const weights = STORY_UNTRAINED_READOUT.map(row => [...row]);
  const weight = weights[slot][target];
  weights[slot][target] -= learningRate * gradient;
  const after = storyRun(STORY_PAST, weights);
  const pAfter = after.probabilities[after.last];
  return {
    target, slot, learningRate, gradient, weight, nextWeight: weights[slot][target],
    before, after, loss, lossAfter: crossEntropy(pAfter, oneHot(pAfter.length, target)).loss,
  };
}

/** Training pairs from one sentence: every prefix is an input and the next word its target. */
export function storyTrainingPairs(sentence: readonly number[] = [STORY_ID.past, STORY_ID.middle, STORY_ID.pastVerb, STORY_ID.end]) {
  const inputs = sentence.slice(0, -1);
  const run = storyRun(inputs);
  return inputs.map((_, i) => {
    const target = sentence[i + 1];
    const probabilities = run.probabilities[i];
    return { input: inputs.slice(0, i + 1), target, probability: probabilities[target], loss: crossEntropy(probabilities, oneHot(probabilities.length, target)).loss };
  });
}
