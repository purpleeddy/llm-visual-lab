/**
 * Multi-head attention — section 3.2.2 of the paper.
 *
 * Each head runs the very same calculation as `computeAttention`; nothing new
 * happens inside a head. What is new is around it: the heads work on their own
 * projections, their outputs are laid side by side, and one more matrix W_O
 * mixes that back down to d_model.
 *
 * Reusing `computeAttention` per head is deliberate. It keeps one implementation
 * of equation (1), so a head cannot quietly disagree with the single-head lab.
 */

import { ShapeError } from './errors';
import { computeAttention, type AttentionInput, type AttentionResult } from './attention';
import { matmul, shapeOf, type Matrix } from './matrix';

export interface HeadWeights {
  WQ: Matrix;
  WK: Matrix;
  WV: Matrix;
}

export interface MultiHeadInput {
  /** n x d_model */
  X: Matrix;
  /** One set of projections per head */
  heads: HeadWeights[];
  /** (h * d_v) x d_model — mixes the joined heads back down */
  WO: Matrix;
  scaled: boolean;
  masked: boolean;
}

export interface MultiHeadDims {
  n: number;
  dModel: number;
  /** Number of heads */
  h: number;
  dK: number;
  dV: number;
}

export interface MultiHeadResult {
  dims: MultiHeadDims;
  X: Matrix;
  /** The full working of each head, in order */
  perHead: AttentionResult[];
  /** The head outputs laid side by side: n x (h * d_v) */
  concat: Matrix;
  WO: Matrix;
  /** MultiHead(...) = concat * W_O, n x d_model */
  output: Matrix;
}

/** Lays matrices of equal height side by side. */
export function concatColumns(parts: Matrix[]): Matrix {
  if (parts.length === 0) throw new ShapeError('noHeads');
  const rows = parts[0].length;
  return Array.from({ length: rows }, (_, i) => parts.flatMap((m) => m[i]));
}

export function computeMultiHead(input: MultiHeadInput): MultiHeadResult {
  if (input.heads.length === 0) throw new ShapeError('noHeads');

  const perHead = input.heads.map((w) =>
    computeAttention({
      X: input.X,
      WQ: w.WQ,
      WK: w.WK,
      WV: w.WV,
      scaled: input.scaled,
      masked: input.masked,
    } satisfies AttentionInput),
  );

  const dV = perHead[0].dims.dV;
  for (let i = 1; i < perHead.length; i++) {
    if (perHead[i].dims.dV !== dV) {
      throw new ShapeError('headOutputMismatch', {
        head: i + 1,
        got: perHead[i].dims.dV,
        expected: dV,
      });
    }
  }

  const concat = concatColumns(perHead.map((r) => r.output));
  const sConcat = shapeOf(concat);
  const sWO = shapeOf(input.WO);
  if (sWO.rows !== sConcat.cols) {
    throw new ShapeError('outputProjectionMismatch', {
      concatCols: sConcat.cols,
      woRows: sWO.rows,
    });
  }

  const output = matmul(concat, input.WO);

  return {
    dims: {
      n: perHead[0].dims.n,
      dModel: perHead[0].dims.dModel,
      h: perHead.length,
      dK: perHead[0].dims.dK,
      dV,
    },
    X: input.X.map((r) => [...r]),
    perHead,
    concat,
    WO: input.WO.map((r) => [...r]),
    output,
  };
}
