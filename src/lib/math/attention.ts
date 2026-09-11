/**
 * The actual computation of equation (1) of the paper:
 * Attention(Q, K, V) = softmax(QKᵀ / √d_k) V.
 *
 * The diagrams, the formulas and the prose all read the result of this one
 * function. Every intermediate matrix is kept so that stepping through the
 * calculation by hand needs no second code path.
 */

import {
  type Matrix,
  assertRectangular,
  matmul,
  scaleMatrix,
  ShapeError,
  transpose,
} from './matrix';
import {
  additiveMask,
  allowAll,
  causalMask,
  softmaxRows,
  type SoftmaxRow,
} from './softmax';

/** Identifiers for the steps. The stepper on screen and the prose use the same ones. */
export const ATTENTION_STEPS = [
  'input',
  'project',
  'scores',
  'scale',
  'mask',
  'softmax',
  'output',
] as const;

export type AttentionStep = (typeof ATTENTION_STEPS)[number];

export interface AttentionInput {
  /** n × d_model. One row per token, holding that token's input vector */
  X: Matrix;
  /** d_model × d_k */
  WQ: Matrix;
  /** d_model × d_k */
  WK: Matrix;
  /** d_model × d_v */
  WV: Matrix;
  /** Whether to divide by √d_k. The paper's default is true */
  scaled: boolean;
  /** Whether to apply the causal mask. True for decoder self-attention */
  masked: boolean;
}

export interface AttentionDims {
  n: number;
  dModel: number;
  dK: number;
  dV: number;
}

export interface AttentionResult {
  dims: AttentionDims;
  /** The inputs, unchanged */
  X: Matrix;
  WQ: Matrix;
  WK: Matrix;
  WV: Matrix;
  /** Q = X·W_Q (n × d_k) */
  Q: Matrix;
  /** K = X·W_K (n × d_k) */
  K: Matrix;
  /** V = X·W_V (n × d_v) */
  V: Matrix;
  /** Kᵀ (d_k × n). Used when drawing the product QKᵀ on screen */
  KT: Matrix;
  /** S = QKᵀ (n × n). The raw scores, before the division */
  scores: Matrix;
  /** 1/√d_k, or 1 when `scaled` is false */
  scaleFactor: number;
  /** The scores after scaling */
  scaledScores: Matrix;
  /** Which positions are open */
  allowed: boolean[][];
  /** The additive mask M: 0 where allowed, -Infinity where blocked */
  M: Matrix;
  /** S/√d_k + M. Blocked positions are -Infinity */
  maskedScores: Matrix;
  /** The softmax working, row by row */
  softmax: SoftmaxRow[];
  /** A = softmax_rows(...) (n × n) */
  weights: Matrix;
  /** O = A·V (n × d_v) */
  output: Matrix;
  /** The settings that produced this result */
  settings: { scaled: boolean; masked: boolean };
}

/**
 * Runs one attention calculation from start to finish.
 * Throws ShapeError when the shapes do not fit, and MaskError when the mask
 * leaves some row with nothing to attend to.
 */
export function computeAttention(input: AttentionInput): AttentionResult {
  const sX = assertRectangular(input.X, 'X');
  const sWQ = assertRectangular(input.WQ, 'W_Q');
  const sWK = assertRectangular(input.WK, 'W_K');
  const sWV = assertRectangular(input.WV, 'W_V');

  for (const [matrix, shape] of [
    ['W_Q', sWQ],
    ['W_K', sWK],
    ['W_V', sWV],
  ] as const) {
    if (shape.rows !== sX.cols) {
      throw new ShapeError('projectionMismatch', {
        matrix,
        wRows: shape.rows,
        xCols: sX.cols,
      });
    }
  }
  if (sWQ.cols !== sWK.cols) {
    throw new ShapeError('qkDimMismatch', { qCols: sWQ.cols, kCols: sWK.cols });
  }

  const dims: AttentionDims = {
    n: sX.rows,
    dModel: sX.cols,
    dK: sWQ.cols,
    dV: sWV.cols,
  };

  const Q = matmul(input.X, input.WQ);
  const K = matmul(input.X, input.WK);
  const V = matmul(input.X, input.WV);

  const KT = transpose(K);
  const scores = matmul(Q, KT);

  const scaleFactor = input.scaled ? 1 / Math.sqrt(dims.dK) : 1;
  const scaledScores = input.scaled ? scaleMatrix(scores, scaleFactor) : scores.map((r) => [...r]);

  const allowed = input.masked ? causalMask(dims.n, dims.n) : allowAll(dims.n, dims.n);
  const M = additiveMask(allowed);

  const maskedScores = scaledScores.map((row, i) =>
    row.map((v, j) => (allowed[i][j] ? v : Number.NEGATIVE_INFINITY)),
  );

  const softmax = softmaxRows(scaledScores, allowed);
  const weights = softmax.map((r) => r.probabilities);

  const output = matmul(weights, V);

  return {
    dims,
    X: input.X.map((r) => [...r]),
    WQ: input.WQ.map((r) => [...r]),
    WK: input.WK.map((r) => [...r]),
    WV: input.WV.map((r) => [...r]),
    Q,
    K,
    V,
    KT,
    scores,
    scaleFactor,
    scaledScores,
    allowed,
    M,
    maskedScores,
    softmax,
    weights,
    output,
    settings: { scaled: input.scaled, masked: input.masked },
  };
}
