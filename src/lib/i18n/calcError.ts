/**
 * Turns a calculation error into a sentence in the reader's language.
 *
 * The maths layer throws an English message plus a `code` and the numbers that
 * explain it (see `src/lib/math/errors.ts`). This is where those become prose.
 * Anything that is not a CalcError — a bug, most likely — falls back to whatever
 * message it carries, because showing the raw text beats showing nothing.
 */

import { CalcError, EN_MATRIX_NAMES, fillTemplate, type MatrixKey } from '../math/errors';
import type { UIStrings } from './ui';

export function formatCalcError(e: unknown, ui: UIStrings): string {
  if (!(e instanceof CalcError)) {
    return e instanceof Error ? e.message : String(e);
  }
  const params = { ...e.params };
  if (typeof params.matrix === 'string' && params.matrix in EN_MATRIX_NAMES) {
    params.matrix = ui.lab.matrixNames[params.matrix as MatrixKey];
  }
  return fillTemplate(ui.lab.errors[e.code], params);
}
