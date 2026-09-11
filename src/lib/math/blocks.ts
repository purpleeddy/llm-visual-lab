/**
 * The parts of a layer that are not attention — sections 3.1 and 3.3.
 *
 * - the residual path, x + Sublayer(x)
 * - layer normalization, applied per row
 * - the position-wise feed-forward network, equation (2)
 *
 * The paper puts them together as LayerNorm(x + Sublayer(x)): post-norm. That
 * ordering is kept here, because it is what the paper describes.
 *
 * As everywhere else, the intermediate values are kept so the screen can show
 * the working rather than only the answer.
 */

import { ShapeError } from './errors';
import { matmul, shapeOf, type Matrix, type Vector } from './matrix';

/** The paper's epsilon is not stated; this is the usual one. */
export const LN_EPS = 1e-5;

export interface LayerNormRow {
  input: Vector;
  mean: number;
  /** The biased variance, the mean of the squared deviations */
  variance: number;
  /** sqrt(variance + eps) */
  denominator: number;
  /** Each entry minus the mean */
  centred: Vector;
  /** centred / denominator, before gain and bias */
  normalized: Vector;
  output: Vector;
}

/**
 * Normalizes one row to mean 0 and variance 1, then rescales it.
 *
 * This works across the features of a single token, not across the batch — which
 * is why it does not care how many tokens arrive together.
 */
export function layerNormRow(
  x: Vector,
  gamma?: Vector,
  beta?: Vector,
  eps: number = LN_EPS,
): LayerNormRow {
  const d = x.length;
  if (d === 0) throw new ShapeError('emptyCols', { matrix: 'left' });
  if (gamma && gamma.length !== d) {
    throw new ShapeError('vectorLengthMismatch', { what: 'gamma', got: gamma.length, expected: d });
  }
  if (beta && beta.length !== d) {
    throw new ShapeError('vectorLengthMismatch', { what: 'beta', got: beta.length, expected: d });
  }

  const mean = x.reduce((a, b) => a + b, 0) / d;
  const centred = x.map((v) => v - mean);
  const variance = centred.reduce((a, c) => a + c * c, 0) / d;
  const denominator = Math.sqrt(variance + eps);
  const normalized = centred.map((c) => c / denominator);
  const output = normalized.map((v, i) => v * (gamma?.[i] ?? 1) + (beta?.[i] ?? 0));

  return { input: [...x], mean, variance, denominator, centred, normalized, output };
}

export function layerNorm(
  m: Matrix,
  gamma?: Vector,
  beta?: Vector,
  eps: number = LN_EPS,
): { rows: LayerNormRow[]; output: Matrix } {
  const rows = m.map((r) => layerNormRow(r, gamma, beta, eps));
  return { rows, output: rows.map((r) => r.output) };
}

/** The residual path. Nothing but an addition — which is the point of it. */
export function addResidual(x: Matrix, sublayer: Matrix): Matrix {
  const sx = shapeOf(x);
  const ss = shapeOf(sublayer);
  if (sx.rows !== ss.rows || sx.cols !== ss.cols) {
    throw new ShapeError('vectorLengthMismatch', {
      what: 'the sublayer output',
      got: `${ss.rows}x${ss.cols}`,
      expected: `${sx.rows}x${sx.cols}`,
    });
  }
  return x.map((row, i) => row.map((v, j) => v + sublayer[i][j]));
}

export function relu(x: number): number {
  return Math.max(0, x);
}

export interface FeedForwardResult {
  /** n x d_ff, before the ReLU */
  hidden: Matrix;
  /** n x d_ff, after it */
  activated: Matrix;
  /** n x d_model */
  output: Matrix;
  dims: { n: number; dModel: number; dFF: number };
  /** How many hidden entries the ReLU set to zero */
  zeroed: number;
}

/**
 * Equation (2): FFN(x) = max(0, x·W1 + b1)·W2 + b2.
 *
 * "Position-wise" means the same weights are applied to every token separately.
 * Nothing here moves information between positions — only attention does that.
 */
export function feedForward(
  X: Matrix,
  W1: Matrix,
  b1: Vector,
  W2: Matrix,
  b2: Vector,
): FeedForwardResult {
  const sX = shapeOf(X);
  const sW1 = shapeOf(W1);
  const sW2 = shapeOf(W2);
  if (b1.length !== sW1.cols) {
    throw new ShapeError('vectorLengthMismatch', { what: 'b1', got: b1.length, expected: sW1.cols });
  }
  if (b2.length !== sW2.cols) {
    throw new ShapeError('vectorLengthMismatch', { what: 'b2', got: b2.length, expected: sW2.cols });
  }

  const hidden = matmul(X, W1).map((row) => row.map((v, j) => v + b1[j]));
  const activated = hidden.map((row) => row.map(relu));
  const output = matmul(activated, W2).map((row) => row.map((v, j) => v + b2[j]));
  const zeroed = hidden.flat().filter((v) => v <= 0).length;

  return {
    hidden,
    activated,
    output,
    dims: { n: sX.rows, dModel: sX.cols, dFF: sW1.cols },
    zeroed,
  };
}

export interface SublayerResult {
  sublayerOutput: Matrix;
  /** x + Sublayer(x) */
  residual: Matrix;
  norm: { rows: LayerNormRow[]; output: Matrix };
}

/** LayerNorm(x + Sublayer(x)) — the wrapper the paper puts around every sub-layer. */
export function residualAndNorm(x: Matrix, sublayerOutput: Matrix): SublayerResult {
  const residual = addResidual(x, sublayerOutput);
  return { sublayerOutput, residual, norm: layerNorm(residual) };
}
