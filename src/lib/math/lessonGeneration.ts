/** The opening's fixed, untrained decoder lesson. Existing lab defaults stay separate. */
import { DEFAULT_X, FFN_W1, FFN_B1, FFN_W2, FFN_B2 } from './examples';
import { tinyDecoder } from './model';
import { matmul, type Matrix } from './matrix';
import { softmaxRows } from './softmax';
import { feedForward, residualAndNorm } from './blocks';

export const LESSON_INITIAL_IDS = [0, 1] as const;
export const LESSON_END_ID = 3;
export const LESSON_SETTINGS = { withPositions: false, masked: true } as const;
/** Only the vocabulary projection differs from tinyDecoder's default coefficients. */
export const LESSON_READOUT: Matrix = [[-1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];

export function lessonSnapshot(tokenIds: readonly number[] = LESSON_INITIAL_IDS) {
  if (!tokenIds.length || tokenIds.some(id => !Number.isInteger(id) || id < 0 || id >= DEFAULT_X.length)) {
    throw new RangeError('Lesson inputs must have embedding IDs 0, 1 or 2; end is a stopping signal.');
  }
  const input = tokenIds.map(id => [...DEFAULT_X[id]]);
  const run = tinyDecoder(input, LESSON_SETTINGS.withPositions, LESSON_SETTINGS.masked);
  const logits = matmul(run.hidden, LESSON_READOUT);
  const vocabularySoftmax = softmaxRows(logits);
  const probabilities = vocabularySoftmax.map(row => row.probabilities);
  const lastPosition = tokenIds.length - 1;
  const nextId = probabilities[lastPosition].reduce((best, p, id, row) => p > row[best] ? id : best, 0);
  // Keep the arithmetic available to the folded explanation, using the same operations.
  const attentionResidual = residualAndNorm(run.stages.position, run.attention.output);
  const feed = feedForward(run.stages['attention-residual'], FFN_W1, FFN_B1, FFN_W2, FFN_B2);
  const ffnResidual = residualAndNorm(run.stages['attention-residual'], run.stages['feed-forward']);
  return {
    ...run, tokenIds: [...tokenIds], lastPosition, nextId, logits, probabilities,
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
