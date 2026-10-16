/** The article's shared fixed, untrained decoder lesson. Independent lab defaults stay separate. */
import { DEFAULT_X, FFN_W1, FFN_B1, FFN_W2, FFN_B2 } from './examples';
import { tinyDecoder } from './model';
import { matmul, type Matrix } from './matrix';
import { softmaxRows } from './softmax';
import { feedForward, residualAndNorm } from './blocks';
import { crossEntropy, oneHot } from './training';

export const LESSON_INITIAL_IDS = [0, 1] as const;
export const LESSON_END_ID = 3;
export const LESSON_SETTINGS = { withPositions: false, masked: true } as const;
/** Only the vocabulary projection differs from tinyDecoder's default coefficients. */
export const LESSON_READOUT: Matrix = [[-1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];

export function lessonSnapshot(tokenIds: readonly number[] = LESSON_INITIAL_IDS, withPositions: boolean = LESSON_SETTINGS.withPositions, readout: Matrix = LESSON_READOUT) {
  if (!tokenIds.length || tokenIds.some(id => !Number.isInteger(id) || id < 0 || id >= DEFAULT_X.length)) {
    throw new RangeError('Lesson inputs must have embedding IDs 0, 1 or 2; end is a stopping signal.');
  }
  const input = tokenIds.map(id => [...DEFAULT_X[id]]);
  const run = tinyDecoder(input, withPositions, LESSON_SETTINGS.masked);
  const logits = matmul(run.hidden, readout);
  const vocabularySoftmax = softmaxRows(logits);
  const probabilities = vocabularySoftmax.map(row => row.probabilities);
  const lastPosition = tokenIds.length - 1;
  const nextId = probabilities[lastPosition].reduce((best, p, id, row) => p > row[best] ? id : best, 0);
  // Keep the arithmetic available to the folded explanation, using the same operations.
  const attentionResidual = residualAndNorm(run.stages.position, run.attention.output);
  const feed = feedForward(run.stages['attention-residual'], FFN_W1, FFN_B1, FFN_W2, FFN_B2);
  const ffnResidual = residualAndNorm(run.stages['attention-residual'], run.stages['feed-forward']);
  return {
    ...run, tokenIds: [...tokenIds], lastPosition, nextId, logits, probabilities, settings: { withPositions, masked: LESSON_SETTINGS.masked }, readout: readout.map(values => [...values]),
    stages: { ...run.stages, logits, probabilities },
    vocabularySoftmax, workings: { attentionResidual, feed, ffnResidual },
  };
}

export type LessonSnapshot = ReturnType<typeof lessonSnapshot>;

/** Choose from computed probabilities. End never goes through embedding lookup. */
export function advanceLesson(run: LessonSnapshot) {
  const finished = run.nextId === LESSON_END_ID;
  return {
    tokenId: run.nextId, finished,
    tokenIds: finished ? [...run.tokenIds] : [...run.tokenIds, run.nextId],
  };
}

/** One actual cross-entropy gradient step on readout[2][2]; all other coefficients stay fixed. */
export function lessonReadoutStep(learningRate = 0.2) {
  if (!Number.isFinite(learningRate) || learningRate < 0) throw new RangeError('Learning rate must be finite and nonnegative.');
  const before = lessonSnapshot();
  const targetId = 2;
  const feature = 2;
  const target = oneHot(4, targetId);
  const gradient = before.hidden[before.lastPosition][feature] * (before.probabilities[before.lastPosition][targetId] - 1);
  const readout = LESSON_READOUT.map(values => [...values]);
  const weight = readout[feature][targetId];
  readout[feature][targetId] -= learningRate * gradient;
  const after = lessonSnapshot(LESSON_INITIAL_IDS, false, readout);
  return { before, after, targetId, feature, weight, nextWeight: readout[feature][targetId], learningRate, gradient,
    beforeLoss: crossEntropy(before.probabilities[before.lastPosition], target).loss,
    afterLoss: crossEntropy(after.probabilities[after.lastPosition], target).loss };
}
