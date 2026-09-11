/**
 * Matrix operations. Pure functions only — nothing here knows about the UI.
 * Every matrix is a row-major 2-D array: M[row][col].
 */

import { ShapeError, type MatrixKey } from './errors';

export { ShapeError } from './errors';
export type { MatrixKey } from './errors';

export type Matrix = number[][];
export type Vector = number[];

export interface Shape {
  rows: number;
  cols: number;
}

/** One term of an output cell of a matrix product: A[i][k] * B[k][j]. */
export interface ProductTerm {
  /** Position of this term in the sum, counting from 0 */
  k: number;
  /** The value taken from the left matrix */
  a: number;
  /** The value taken from the right matrix */
  b: number;
  /** The two values multiplied */
  product: number;
  /** The sum up to and including this term */
  runningSum: number;
}

/** The full derivation of one output cell of a matrix product */
export interface CellDerivation {
  row: number;
  col: number;
  terms: ProductTerm[];
  value: number;
}

export function shapeOf(m: Matrix): Shape {
  if (m.length === 0) return { rows: 0, cols: 0 };
  return { rows: m.length, cols: m[0].length };
}

/** Checks that every row has the same length and every value is finite. */
export function assertRectangular(m: Matrix, matrix: MatrixKey): Shape {
  if (m.length === 0) {
    throw new ShapeError('emptyRows', { matrix });
  }
  const cols = m[0].length;
  if (cols === 0) {
    throw new ShapeError('emptyCols', { matrix });
  }
  for (let i = 0; i < m.length; i++) {
    if (m[i].length !== cols) {
      throw new ShapeError('raggedRow', {
        matrix,
        row: i + 1,
        length: m[i].length,
        expected: cols,
      });
    }
    for (let j = 0; j < cols; j++) {
      if (!Number.isFinite(m[i][j])) {
        throw new ShapeError('nonFinite', { matrix, row: i + 1, col: j + 1 });
      }
    }
  }
  return { rows: m.length, cols };
}

export function transpose(m: Matrix): Matrix {
  const { rows, cols } = shapeOf(m);
  const out: Matrix = [];
  for (let j = 0; j < cols; j++) {
    const row: number[] = [];
    for (let i = 0; i < rows; i++) row.push(m[i][j]);
    out.push(row);
  }
  return out;
}

/**
 * Matrix product A(n×p) · B(p×m) = C(n×m).
 * C[i][j] is the dot product of row i of A with column j of B.
 */
export function matmul(a: Matrix, b: Matrix): Matrix {
  const sa = assertRectangular(a, 'left');
  const sb = assertRectangular(b, 'right');
  if (sa.cols !== sb.rows) {
    throw new ShapeError('matmulMismatch', {
      aRows: sa.rows,
      aCols: sa.cols,
      bRows: sb.rows,
      bCols: sb.cols,
    });
  }
  const out: Matrix = [];
  for (let i = 0; i < sa.rows; i++) {
    const row: number[] = [];
    for (let j = 0; j < sb.cols; j++) {
      let sum = 0;
      for (let k = 0; k < sa.cols; k++) sum += a[i][k] * b[k][j];
      row.push(sum);
    }
    out.push(row);
  }
  return out;
}

/**
 * Returns, term by term, the sum that produces C[i][j] in a matrix product.
 * The screen uses this to highlight the row, the column and each product when a
 * cell is selected.
 */
export function cellDerivation(a: Matrix, b: Matrix, i: number, j: number): CellDerivation {
  const sa = assertRectangular(a, 'left');
  const sb = assertRectangular(b, 'right');
  if (sa.cols !== sb.rows) {
    throw new ShapeError('matmulShape');
  }
  if (i < 0 || i >= sa.rows || j < 0 || j >= sb.cols) {
    throw new ShapeError('cellOutOfRange', { row: i, col: j });
  }
  const terms: ProductTerm[] = [];
  let runningSum = 0;
  for (let k = 0; k < sa.cols; k++) {
    const av = a[i][k];
    const bv = b[k][j];
    const product = av * bv;
    runningSum += product;
    terms.push({ k, a: av, b: bv, product, runningSum });
  }
  return { row: i, col: j, terms, value: runningSum };
}

/**
 * The dot product of two vectors, with each product and the running sum.
 * This is the same calculation as one cell of a matrix product, so its result
 * has to agree with cellDerivation.
 */
export function dotProduct(u: Vector, v: Vector): CellDerivation {
  if (u.length !== v.length) {
    throw new ShapeError('dotLengthMismatch', { a: u.length, b: v.length });
  }
  const terms: ProductTerm[] = [];
  let runningSum = 0;
  for (let k = 0; k < u.length; k++) {
    const product = u[k] * v[k];
    runningSum += product;
    terms.push({ k, a: u[k], b: v[k], product, runningSum });
  }
  return { row: 0, col: 0, terms, value: runningSum };
}

/** Multiplies every value in the matrix by the same number. */
export function scaleMatrix(m: Matrix, factor: number): Matrix {
  return m.map((row) => row.map((v) => v * factor));
}

export function cloneMatrix(m: Matrix): Matrix {
  return m.map((row) => [...row]);
}
