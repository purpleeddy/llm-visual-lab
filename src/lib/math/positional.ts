/**
 * Sinusoidal positional encoding — section 3.5 of the paper.
 *
 *   PE(pos, 2i)   = sin(pos / 10000^(2i/d_model))
 *   PE(pos, 2i+1) = cos(pos / 10000^(2i/d_model))
 *
 * Dimensions are taken in pairs: the pair at index i shares one frequency, sin
 * in the even slot and cos in the odd one. Across the pairs the wavelength runs
 * from 2π up to 10000·2π as a geometric progression, so each pair is a slower
 * hand on the same clock.
 *
 * Every intermediate value is kept, because the point of the section is showing
 * where the angle comes from, not only what comes out.
 */

import { ShapeError } from './errors';
import type { Matrix } from './matrix';

/** The paper's constant. Only the base of the geometric progression. */
export const PE_BASE = 10000;

export interface PositionalTerm {
  /** Token position, from 0 */
  pos: number;
  /** Which dimension of the vector, from 0 */
  dim: number;
  /** Which sin/cos pair this dimension belongs to, from 0 */
  pair: number;
  kind: 'sin' | 'cos';
  /** 10000^(2i/d_model) — how much the position is slowed down */
  divisor: number;
  /** pos / divisor, the angle handed to sin or cos */
  angle: number;
  /** The length of one full turn of this pair, in positions */
  wavelength: number;
  value: number;
}

export interface PositionalEncoding {
  n: number;
  dModel: number;
  /** n x d_model */
  matrix: Matrix;
  /** The working, one row per position */
  terms: PositionalTerm[][];
  /** One wavelength per pair, slowest last */
  wavelengths: number[];
}

export function positionalEncoding(n: number, dModel: number): PositionalEncoding {
  if (dModel % 2 !== 0) throw new ShapeError('oddModelWidth', { dModel });

  const pairs = dModel / 2;
  const terms: PositionalTerm[][] = [];
  const matrix: Matrix = [];

  for (let pos = 0; pos < n; pos++) {
    const row: PositionalTerm[] = [];
    const values: number[] = [];
    for (let pair = 0; pair < pairs; pair++) {
      const divisor = Math.pow(PE_BASE, (2 * pair) / dModel);
      const angle = pos / divisor;
      const wavelength = 2 * Math.PI * divisor;
      const sin = Math.sin(angle);
      const cos = Math.cos(angle);
      row.push({ pos, dim: 2 * pair, pair, kind: 'sin', divisor, angle, wavelength, value: sin });
      row.push({
        pos,
        dim: 2 * pair + 1,
        pair,
        kind: 'cos',
        divisor,
        angle,
        wavelength,
        value: cos,
      });
      values.push(sin, cos);
    }
    terms.push(row);
    matrix.push(values);
  }

  const wavelengths = Array.from(
    { length: pairs },
    (_, pair) => 2 * Math.PI * Math.pow(PE_BASE, (2 * pair) / dModel),
  );

  return { n, dModel, matrix, terms, wavelengths };
}

/** Adds the positional encoding to an embedding block, which is all the paper does with it. */
export function addPositions(embeddings: Matrix): { pe: Matrix; sum: Matrix } {
  const n = embeddings.length;
  const dModel = embeddings[0]?.length ?? 0;
  const { matrix: pe } = positionalEncoding(n, dModel);
  const sum = embeddings.map((row, i) => row.map((v, j) => v + pe[i][j]));
  return { pe, sum };
}
