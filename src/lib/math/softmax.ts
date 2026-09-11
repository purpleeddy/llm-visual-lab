/**
 * Softmax and the additive mask.
 *
 * Softmax in equation (1) of the paper is computed independently per row.
 * Every intermediate value is kept here so the screen can show the working.
 */

import type { Matrix } from './matrix';
import { MaskError } from './errors';

export { MaskError } from './errors';

/** The working for one term of a softmax */
export interface SoftmaxTerm {
  index: number;
  /** The original score, before the mask is added */
  score: number;
  /** Whether the mask allows this position */
  allowed: boolean;
  /** The score minus the row maximum, for a stable exponential. null when blocked */
  shifted: number | null;
  /** exp(shifted). 0 when blocked */
  exp: number;
  /** The resulting probability */
  probability: number;
}

export interface SoftmaxRow {
  row: number;
  terms: SoftmaxTerm[];
  /** The largest allowed score — what gets subtracted for stability */
  max: number;
  /** The sum of the exponentials (the denominator of the softmax) */
  sumExp: number;
  probabilities: number[];
}

/**
 * Softmax over one row.
 *
 * For stability it first subtracts the largest **allowed** score. Taking the
 * maximum over blocked positions too would drag -Infinity into the arithmetic
 * and the whole row would collapse.
 *
 * @param scores the scores before the mask is added
 * @param allowed which positions are open; all of them when omitted
 */
export function softmaxRow(scores: number[], allowed?: boolean[], rowIndex = 0): SoftmaxRow {
  const mask = allowed ?? scores.map(() => true);
  if (mask.length !== scores.length) {
    throw new MaskError('maskLengthMismatch', {
      maskLength: mask.length,
      scoreLength: scores.length,
    });
  }

  const allowedScores = scores.filter((_, i) => mask[i]);
  if (allowedScores.length === 0) {
    throw new MaskError('rowFullyBlocked', { row: rowIndex + 1 });
  }

  const max = Math.max(...allowedScores);

  const terms: SoftmaxTerm[] = [];
  let sumExp = 0;
  for (let i = 0; i < scores.length; i++) {
    if (mask[i]) {
      const shifted = scores[i] - max;
      const e = Math.exp(shifted);
      sumExp += e;
      terms.push({
        index: i,
        score: scores[i],
        allowed: true,
        shifted,
        exp: e,
        probability: 0,
      });
    } else {
      terms.push({
        index: i,
        score: scores[i],
        allowed: false,
        shifted: null,
        exp: 0,
        probability: 0,
      });
    }
  }

  for (const t of terms) t.probability = t.exp / sumExp;

  return {
    row: rowIndex,
    terms,
    max,
    sumExp,
    probabilities: terms.map((t) => t.probability),
  };
}

/** Applies softmax to every row. */
export function softmaxRows(scores: Matrix, allowed?: boolean[][]): SoftmaxRow[] {
  return scores.map((row, i) => softmaxRow(row, allowed?.[i], i));
}

/**
 * The causal mask: row i (the query) may only look up to its own position.
 * allowed[i][j] = j <= i
 */
export function causalMask(rows: number, cols: number): boolean[][] {
  const out: boolean[][] = [];
  for (let i = 0; i < rows; i++) {
    const row: boolean[] = [];
    for (let j = 0; j < cols; j++) row.push(j <= i);
    out.push(row);
  }
  return out;
}

export function allowAll(rows: number, cols: number): boolean[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => true));
}

/**
 * Turns the allow-flags into the additive mask matrix M the paper describes:
 * 0 where allowed, -Infinity where blocked, added to the scores.
 */
export function additiveMask(allowed: boolean[][]): Matrix {
  return allowed.map((row) => row.map((ok) => (ok ? 0 : Number.NEGATIVE_INFINITY)));
}
