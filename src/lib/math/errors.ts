/**
 * Calculation errors.
 *
 * These errors reach the reader: the attention lab catches them and prints the
 * message in its error panel. So the thrown object carries a `code` and the
 * numbers that explain it, and the UI layer turns that into a sentence in the
 * reader's language. The `message` on the Error itself is English, for logs and
 * for any call site that has no locale to hand.
 *
 * Keep this module free of UI imports — the maths must stay usable on its own.
 */

/** Which matrix an error is about. A key, not a display name — the UI names it. */
export type MatrixKey = 'left' | 'right' | 'X' | 'W_Q' | 'W_K' | 'W_V';

export type CalcErrorCode =
  | 'emptyRows'
  | 'emptyCols'
  | 'raggedRow'
  | 'nonFinite'
  | 'matmulMismatch'
  | 'matmulShape'
  | 'cellOutOfRange'
  | 'dotLengthMismatch'
  | 'maskLengthMismatch'
  | 'rowFullyBlocked'
  | 'projectionMismatch'
  | 'qkDimMismatch'
  | 'noHeads'
  | 'headOutputMismatch'
  | 'outputProjectionMismatch'
  | 'oddModelWidth'
  | 'vectorLengthMismatch'
  | 'zeroVariance'
  | 'emptyDistribution'
  | 'targetOutOfRange';

export type CalcErrorParams = Record<string, string | number>;

/**
 * English message templates. `{name}` placeholders are filled from `params`.
 * The English locale reuses these verbatim, so there is one copy of the wording.
 */
export const EN_CALC_ERRORS: Record<CalcErrorCode, string> = {
  emptyRows: '{matrix} has no rows.',
  emptyCols: '{matrix} has no columns.',
  raggedRow: 'In {matrix}, row {row} has {length} entries but the first row has {expected}.',
  nonFinite: 'In {matrix}, the value at row {row}, column {col} is not a number.',
  matmulMismatch:
    'These matrices cannot be multiplied: the left one is {aRows}×{aCols} and the right one is {bRows}×{bCols}. The columns of the left must match the rows of the right.',
  matmulShape: 'These shapes cannot be multiplied.',
  cellOutOfRange: 'Row {row}, column {col} is outside the result matrix.',
  dotLengthMismatch:
    'These vectors have no dot product: their lengths are {a} and {b}, which differ.',
  maskLengthMismatch: 'The mask has {maskLength} entries but there are {scoreLength} scores.',
  rowFullyBlocked:
    'Every position in row {row} is blocked, so the softmax denominator is zero and no probability is defined. Leave at least one position open in each row.',
  projectionMismatch:
    '{matrix} has {wRows} rows but X has {xCols} columns (d_model), so X·{matrix} cannot be computed.',
  qkDimMismatch:
    'W_Q has {qCols} columns and W_K has {kCols}; they differ, so Q and K have no dot product. Both must be d_k.',
  noHeads: 'Multi-head attention needs at least one head.',
  headOutputMismatch:
    'Head {head} produces vectors of length {got}, but head 1 produces {expected}. Every head must give the same d_v so their outputs can be joined.',
  outputProjectionMismatch:
    'The joined heads are {concatCols} wide but W_O has {woRows} rows, so they cannot be multiplied. W_O must have h x d_v rows.',
  oddModelWidth:
    'Sinusoidal positions need an even d_model, because the dimensions are taken in sin/cos pairs. This one is {dModel}.',
  vectorLengthMismatch:
    '{what} has {got} entries but {expected} were expected.',
  zeroVariance:
    'Every entry of this row is the same, so its variance is zero and it cannot be normalised without dividing by zero.',
  emptyDistribution: 'A probability distribution cannot be empty.',
  targetOutOfRange:
    'The target is position {target}, which is outside a distribution of {size} entries.',
};

/** English names for the matrix keys, used when filling the English templates. */
export const EN_MATRIX_NAMES: Record<MatrixKey, string> = {
  left: 'The left matrix',
  right: 'The right matrix',
  X: 'The input X',
  W_Q: 'W_Q',
  W_K: 'W_K',
  W_V: 'W_V',
};

/** Replaces every `{key}` in `template` with `params[key]`. Unknown keys are left alone. */
export function fillTemplate(template: string, params: CalcErrorParams): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in params ? String(params[key]) : whole,
  );
}

/** Base class for every error the maths throws. Carries enough to re-word it in any language. */
export class CalcError extends Error {
  readonly code: CalcErrorCode;
  readonly params: CalcErrorParams;

  constructor(code: CalcErrorCode, params: CalcErrorParams = {}) {
    const filled: CalcErrorParams = { ...params };
    if (typeof filled.matrix === 'string' && filled.matrix in EN_MATRIX_NAMES) {
      filled.matrix = EN_MATRIX_NAMES[filled.matrix as MatrixKey];
    }
    super(fillTemplate(EN_CALC_ERRORS[code], filled));
    this.name = 'CalcError';
    this.code = code;
    this.params = params;
  }
}

/** The shapes do not fit together. */
export class ShapeError extends CalcError {
  constructor(code: CalcErrorCode, params: CalcErrorParams = {}) {
    super(code, params);
    this.name = 'ShapeError';
  }
}

/** The mask leaves a row with nothing to attend to. */
export class MaskError extends CalcError {
  constructor(code: CalcErrorCode, params: CalcErrorParams = {}) {
    super(code, params);
    this.name = 'MaskError';
  }
}
