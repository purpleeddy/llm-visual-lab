/**
 * Checks on the maths.
 *
 * The reference values live in tests/fixtures/reference.json, produced by
 * tests/fixtures/generate_fixtures.py with numpy, Fraction and Decimal. They
 * come from a different route than the TypeScript, so they are an independent
 * check rather than a restatement of it.
 */

import { describe, expect, it } from 'vitest';
import reference from '../fixtures/reference.json' with { type: 'json' };

import {
  cellDerivation,
  dotProduct,
  matmul,
  ShapeError,
  transpose,
  type Matrix,
} from '../../src/lib/math/matrix';
import {
  causalMask,
  MaskError,
  softmaxRow,
} from '../../src/lib/math/softmax';
import {
  CalcError,
  EN_CALC_ERRORS,
  type CalcErrorCode,
} from '../../src/lib/math/errors';
import { formatCalcError } from '../../src/lib/i18n/calcError';
import { t } from '../../src/lib/i18n/ui';
import { computeAttention } from '../../src/lib/math/attention';
import { computeMultiHead } from '../../src/lib/math/multihead';
import { positionalEncoding } from '../../src/lib/math/positional';
import { feedForward, layerNormRow, addResidual, residualAndNorm } from '../../src/lib/math/blocks';
import { crossEntropy, labelSmoothed, learningRate, oneHot } from '../../src/lib/math/training';
import { beamSearch, greedy } from '../../src/lib/math/generation';
import { EN_FR_DISCREPANCY, TABLE2, TABLE3, TABLE4, TRAINING } from '../../src/lib/paper';
import { fmt, fmtCompact, fmtInput, parseNumber } from '../../src/lib/math/format';
import {
  defaultAttentionInput,
  defaultMultiHeadInput,
  FFN_B1,
  FFN_B2,
  FFN_W1,
  FFN_W2,
  DEFAULT_X,
  LABEL_SMOOTHING,
  LOSS_EXAMPLE,
  SCHEDULE,
  TOY_MODEL,
} from '../../src/lib/math/examples';

/** The tolerance set in section 11 of docs/plan.md: 1e-9, absolute or relative */
const TOL = 1e-9;

function expectClose(actual: number, expected: number, what: string) {
  const absErr = Math.abs(actual - expected);
  const relErr = expected === 0 ? absErr : absErr / Math.abs(expected);
  expect(
    absErr <= TOL || relErr <= TOL,
    `${what}: got ${actual}, expected ${expected}, absolute error ${absErr}, relative error ${relErr}`,
  ).toBe(true);
}

function expectMatrixClose(actual: Matrix, expected: number[][], what: string) {
  expect(actual.length, `${what}: number of rows`).toBe(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(actual[i].length, `${what}: number of columns in row ${i}`).toBe(expected[i].length);
    for (let j = 0; j < expected[i].length; j++) {
      expectClose(actual[i][j], expected[i][j], `${what} (${i}, ${j})`);
    }
  }
}

/**
 * Asserts that `run` throws a CalcError carrying `code`.
 *
 * The assertion is on the code, not on the wording: the message is English and
 * the reader sees a translated one, so matching prose here would pin the wrong
 * thing and would break the moment the sentence is reworded.
 */
function expectCalcError(run: () => unknown, code: CalcErrorCode) {
  let thrown: unknown;
  try {
    run();
  } catch (e) {
    thrown = e;
  }
  expect(thrown, `expected a CalcError with code "${code}"`).toBeInstanceOf(CalcError);
  expect((thrown as CalcError).code).toBe(code);
  expect((thrown as CalcError).message.length, 'the English message must not be empty').toBeGreaterThan(0);
}

describe('matrix product', () => {
  for (const c of reference.matmul) {
    it(`agrees with the reference: ${c.name}`, () => {
      expectMatrixClose(matmul(c.a, c.b), c.result, c.name);
    });
  }

  it('the term-by-term derivation of a cell agrees with the product', () => {
    const a = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    const b = [
      [7, 8],
      [9, 10],
      [11, 12],
    ];
    const product = matmul(a, b);
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 2; j++) {
        const d = cellDerivation(a, b, i, j);
        expectClose(d.value, product[i][j], `cell (${i}, ${j})`);
        // the running sum of the last term is the cell value
        expectClose(d.terms.at(-1)!.runningSum, product[i][j], `running sum (${i}, ${j})`);
        // there are as many terms as the left matrix has columns
        expect(d.terms.length).toBe(3);
      }
    }
  });

  it('refuses shapes that do not fit, and says which', () => {
    expect(() => matmul([[1, 2]], [[1, 2]])).toThrow(ShapeError);
    expectCalcError(() => matmul([[1, 2]], [[1, 2]]), 'matmulMismatch');
  });

  it('transposing twice gives back the original', () => {
    const m = [
      [1, 2, 3],
      [4, 5, 6],
    ];
    expect(transpose(transpose(m))).toEqual(m);
  });
});

describe('dot product', () => {
  for (const c of reference.dotProduct) {
    it(`agrees with the reference: ${c.name}`, () => {
      expectClose(dotProduct(c.u, c.v).value, c.result, c.name);
    });
  }

  it('is the same calculation as one cell of a matrix product', () => {
    const u = [2, 0];
    const v = [2, 0];
    const dot = dotProduct(u, v);
    const cell = cellDerivation([u], transpose([v]), 0, 0);
    expectClose(dot.value, cell.value, 'dot product against matrix-product cell');
    expect(dot.terms.map((t) => t.product)).toEqual(cell.terms.map((t) => t.product));
  });

  it('refuses vectors of different lengths', () => {
    expectCalcError(() => dotProduct([1, 2], [1, 2, 3]), 'dotLengthMismatch');
  });
});

describe('softmax', () => {
  for (const c of reference.softmax) {
    it(`agrees with the reference: ${c.name}`, () => {
      const r = softmaxRow(c.scores, c.allowed);
      for (let i = 0; i < c.probabilities.length; i++) {
        expectClose(r.probabilities[i], c.probabilities[i], `${c.name} [${i}]`);
      }
    });
  }

  it('the probabilities sum to 1', () => {
    for (const c of reference.softmax) {
      const r = softmaxRow(c.scores, c.allowed);
      expectClose(
        r.probabilities.reduce((a, b) => a + b, 0),
        1,
        `${c.name}, sum`,
      );
    }
  });

  it('adding the same number to every score leaves the probabilities alone', () => {
    const base = softmaxRow([0, 4, 2]);
    const shifted = softmaxRow([100, 104, 102]);
    for (let i = 0; i < 3; i++) {
      expectClose(shifted.probabilities[i], base.probabilities[i], `shift invariance [${i}]`);
    }
  });

  it('a blocked position gets exactly 0', () => {
    const r = softmaxRow([0, 4, 2], [true, false, false]);
    expect(r.probabilities[1]).toBe(0);
    expect(r.probabilities[2]).toBe(0);
    expect(r.probabilities[0]).toBe(1);
  });

  it('a single open position gets exactly 1', () => {
    const r = softmaxRow([-3.7, 100, 2], [true, false, false]);
    expect(r.probabilities[0]).toBe(1);
  });

  it('large scores do not overflow', () => {
    const r = softmaxRow([1000, 1001, 999]);
    expect(r.probabilities.every((p) => Number.isFinite(p))).toBe(true);
    expectClose(r.probabilities.reduce((a, b) => a + b, 0), 1, 'sum for large scores');
  });

  it('refuses a row where every position is blocked', () => {
    expect(() => softmaxRow([1, 2, 3], [false, false, false])).toThrow(MaskError);
    expectCalcError(() => softmaxRow([1, 2, 3], [false, false, false]), 'rowFullyBlocked');
  });

  it('subtracts the largest allowed score, not the largest score', () => {
    // Position 2 is the largest but it is blocked. The maximum has to be 4.
    const r = softmaxRow([0, 4, 999], [true, true, false]);
    expect(r.max).toBe(4);
    expect(Number.isFinite(r.sumExp)).toBe(true);
    expectClose(r.probabilities.reduce((a, b) => a + b, 0), 1, 'sum with a blocked position');
  });
});

describe('causal mask', () => {
  it('row i is open up to position i', () => {
    expect(causalMask(3, 3)).toEqual([
      [true, false, false],
      [true, true, false],
      [true, true, true],
    ]);
  });
});

describe('the whole attention calculation', () => {
  for (const c of reference.attention) {
    describe(c.name, () => {
      const result = computeAttention({
        X: c.X,
        WQ: c.WQ,
        WK: c.WK,
        WV: c.WV,
        scaled: c.settings.scaled,
        masked: c.settings.masked,
      });

      it('the dimensions agree', () => {
        expect(result.dims).toEqual(c.dims);
      });
      it('Q = X·W_Q', () => expectMatrixClose(result.Q, c.Q, 'Q'));
      it('K = X·W_K', () => expectMatrixClose(result.K, c.K, 'K'));
      it('V = X·W_V', () => expectMatrixClose(result.V, c.V, 'V'));
      it('Kᵀ', () => expectMatrixClose(result.KT, c.KT, 'KT'));
      it('S = QKᵀ', () => expectMatrixClose(result.scores, c.scores, 'S'));
      it('the scaling factor', () => expectClose(result.scaleFactor, c.scaleFactor, 'scaleFactor'));
      it('the scaled scores', () =>
        expectMatrixClose(result.scaledScores, c.scaledScores, 'scaledScores'));
      it('which positions are open', () => expect(result.allowed).toEqual(c.allowed));
      it('A = softmax(...)', () => expectMatrixClose(result.weights, c.weights, 'A'));
      it('O = A·V', () => expectMatrixClose(result.output, c.output, 'O'));

      it('blocked positions stay at -Infinity', () => {
        for (let i = 0; i < c.maskedScores.length; i++) {
          for (let j = 0; j < c.maskedScores[i].length; j++) {
            const expected = c.maskedScores[i][j];
            if (expected === null) {
              expect(result.maskedScores[i][j]).toBe(Number.NEGATIVE_INFINITY);
              expect(result.M[i][j]).toBe(Number.NEGATIVE_INFINITY);
            } else {
              expectClose(result.maskedScores[i][j], expected, `maskedScores (${i}, ${j})`);
              expect(result.M[i][j]).toBe(0);
            }
          }
        }
      });

      it('every row of probabilities sums to 1', () => {
        for (const row of result.weights) {
          expectClose(row.reduce((a, b) => a + b, 0), 1, 'row sum');
        }
      });
    });
  }

  it('switching the division off makes the scores larger by a factor of √d_k', () => {
    const on = computeAttention({ ...defaultAttentionInput(), scaled: true });
    const off = computeAttention({ ...defaultAttentionInput(), scaled: false });
    expect(off.scaleFactor).toBe(1);
    for (let i = 0; i < on.dims.n; i++) {
      for (let j = 0; j < on.dims.n; j++) {
        expectClose(
          off.scaledScores[i][j],
          on.scaledScores[i][j] * Math.sqrt(on.dims.dK),
          'scaling ratio',
        );
      }
    }
  });

  it('refuses W_Q whose row count differs from d_model, and says which', () => {
    const bad = defaultAttentionInput();
    bad.WQ = [[1, 0], [0, 1]];
    expect(() => computeAttention(bad)).toThrow(ShapeError);
    expectCalcError(() => computeAttention(bad), 'projectionMismatch');
  });

  it('refuses W_Q and W_K with different column counts', () => {
    const bad = defaultAttentionInput();
    bad.WK = [[1, 0, 0], [0, 1, 0], [0, 0, 1], [1, 1, 1]];
    expectCalcError(() => computeAttention(bad), 'qkDimMismatch');
  });
});

describe('the numbers the prose quotes', () => {
  const q = reference.quotedInProse;
  const base = computeAttention(defaultAttentionInput());
  const causal = computeAttention({ ...defaultAttentionInput(), masked: true });

  it('the first row of scores is [0, 4, 2]', () => {
    expect(base.scores[0]).toEqual([0, 4, 2]);
    expect(q.scoresRow1).toEqual([0, 4, 2]);
  });

  it('the first row of weights is 0.045 / 0.768 / 0.187 to three places', () => {
    const rounded = base.weights[0].map((v) => Math.round(v * 1000) / 1000);
    expect(rounded).toEqual([0.045, 0.768, 0.187]);
    expect(q.weightsRow1_3dp).toEqual([0.045, 0.768, 0.187]);
  });

  it('row three has equal scores, so its weights are exactly one third each', () => {
    for (const p of base.weights[2]) expectClose(p, 1 / 3, 'equal weights');
  });

  it('row three of the output is the mean of the three rows of V: (4/3, 4/3)', () => {
    expectClose(base.output[2][0], 4 / 3, 'output row 3, column 1');
    expectClose(base.output[2][1], 4 / 3, 'output row 3, column 2');
  });

  it('with the causal mask, row one sees only itself and its output equals row one of V', () => {
    expect(causal.weights[0]).toEqual([1, 0, 0]);
    expect(causal.output[0]).toEqual(base.V[0]);
    expect(causal.output[0]).toEqual([3, 0]);
  });

  it('with the causal mask, row two of the weights is 0.944 / 0.056', () => {
    const rounded = causal.weights[1].map((v) => Math.round(v * 1000) / 1000);
    expect(rounded).toEqual([0.944, 0.056, 0]);
  });

  it('the first row of the output is (0.323, 2.490)', () => {
    const rounded = base.output[0].map((v) => Math.round(v * 1000) / 1000);
    expect(rounded).toEqual([0.323, 2.49]);
  });

  it('with the division off, the first row of weights is 0.016 / 0.867 / 0.117', () => {
    const off = computeAttention({ ...defaultAttentionInput(), scaled: false });
    const rounded = off.weights[0].map((v) => Math.round(v * 1000) / 1000);
    expect(rounded).toEqual([0.016, 0.867, 0.117]);
  });

  it('changing X(1,1) from 1 to 3 takes S(1,2) from 4 to 8', () => {
    // The prose and the browser checks both use this example.
    const changed = defaultAttentionInput();
    changed.X[0][0] = 3;
    const r = computeAttention(changed);
    expect(r.Q[0]).toEqual([4, 0]);
    expect(r.scores[0][1]).toBe(8);
  });

  it('√2 is about 1.414', () => {
    expect(Math.round(Math.sqrt(2) * 1000) / 1000).toBe(1.414);
    expect(q.sqrt2).toBeCloseTo(Math.SQRT2, 12);
  });

  it('the exponentials and the sum written out in the prose are right', () => {
    // the numbers quoted in the softmax section
    expect(Math.round(Math.exp(4) * 1000) / 1000).toBe(54.598);
    expect(Math.round(Math.exp(2) * 1000) / 1000).toBe(7.389);
    const sum = Math.exp(0) + Math.exp(4) + Math.exp(2);
    expect(Math.round(sum * 1000) / 1000).toBe(62.987);
  });
});

describe('multi-head attention', () => {
  for (const c of reference.multiHead) {
    describe(`scaled=${c.settings.scaled}, masked=${c.settings.masked}`, () => {
      const result = computeMultiHead({
        ...defaultMultiHeadInput(),
        scaled: c.settings.scaled,
        masked: c.settings.masked,
      });

      it('each head agrees with the reference', () => {
        for (let i = 0; i < c.perHeadOutput.length; i++) {
          expectMatrixClose(result.perHead[i].output, c.perHeadOutput[i], `head ${i + 1}`);
        }
      });
      it('the heads are laid side by side in order', () =>
        expectMatrixClose(result.concat, c.concat, 'concat'));
      it('MultiHead = concat · W_O', () =>
        expectMatrixClose(result.output, c.output, 'output'));
    });
  }

  it('comes back to d_model, whatever happens in between', () => {
    const r = computeMultiHead(defaultMultiHeadInput());
    expect(r.dims.h).toBe(2);
    expect(r.concat[0].length).toBe(r.dims.h * r.dims.dV);
    expect(r.output[0].length).toBe(r.dims.dModel);
    expect(r.output.length).toBe(r.dims.n);
  });

  it('one head with an identity W_O is plain attention', () => {
    const base = defaultMultiHeadInput();
    const single = computeMultiHead({
      ...base,
      heads: [base.heads[0]],
      WO: [
        [1, 0],
        [0, 1],
      ],
    });
    const plain = computeAttention(defaultAttentionInput());
    expectMatrixClose(single.output, plain.output, 'one head against plain attention');
  });

  it('the heads really do differ — otherwise the section has no point', () => {
    const r = computeMultiHead(defaultMultiHeadInput());
    expect(r.perHead[0].weights).not.toEqual(r.perHead[1].weights);
  });

  it('refuses a W_O that does not fit the joined heads', () => {
    const bad = defaultMultiHeadInput();
    bad.WO = [
      [1, 0],
      [0, 1],
    ];
    expectCalcError(() => computeMultiHead(bad), 'outputProjectionMismatch');
  });

  it('refuses an empty set of heads', () => {
    expectCalcError(() => computeMultiHead({ ...defaultMultiHeadInput(), heads: [] }), 'noHeads');
  });
});

describe('positional encoding', () => {
  const ref = reference.positional;
  const pe = positionalEncoding(ref.n, ref.dModel);

  it('agrees with the reference', () => expectMatrixClose(pe.matrix, ref.matrix, 'PE'));

  it('the wavelengths run from 2π up as a geometric progression', () => {
    for (let i = 0; i < ref.wavelengths.length; i++) {
      expectClose(pe.wavelengths[i], ref.wavelengths[i], `wavelength ${i}`);
    }
    expectClose(pe.wavelengths[0], 2 * Math.PI, 'the first wavelength is 2π');
  });

  it('position 0 is exactly sin 0 and cos 0, alternating', () => {
    expect(pe.matrix[0]).toEqual([0, 1, 0, 1]);
  });

  it('every value stays between −1 and 1, whatever the position', () => {
    const far = positionalEncoding(500, 8);
    for (const row of far.matrix) for (const v of row) expect(Math.abs(v)).toBeLessThanOrEqual(1);
  });

  it('even dimensions are sin and odd ones cos, sharing a pair', () => {
    const row = pe.terms[3];
    for (const t of row) {
      expect(t.kind).toBe(t.dim % 2 === 0 ? 'sin' : 'cos');
      expectClose(t.value, t.kind === 'sin' ? Math.sin(t.angle) : Math.cos(t.angle), 'term');
    }
    expect(row[0].pair).toBe(row[1].pair);
    expect(row[0].angle).toBe(row[1].angle);
  });

  it('refuses an odd d_model, because the dimensions come in pairs', () => {
    expectCalcError(() => positionalEncoding(3, 5), 'oddModelWidth');
  });
});

describe('residual, normalization and the feed-forward network', () => {
  it('layer normalization agrees with the reference', () => {
    for (const c of reference.layerNorm) {
      const r = layerNormRow(c.input);
      expectClose(r.mean, c.mean, 'mean');
      expectClose(r.variance, c.variance, 'variance');
      for (let i = 0; i < c.output.length; i++) {
        expectClose(r.output[i], c.output[i], `normalized [${i}]`);
      }
    }
  });

  it('a normalized row has mean 0 and variance 1', () => {
    const r = layerNormRow([2, 8, 4, 6]);
    const mean = r.output.reduce((a, b) => a + b, 0) / r.output.length;
    const variance = r.output.reduce((a, v) => a + (v - mean) ** 2, 0) / r.output.length;
    expectClose(mean, 0, 'mean after normalizing');
    // eps in the denominator keeps this a hair under 1, which is the point of eps
    expect(variance).toBeGreaterThan(0.999);
    expect(variance).toBeLessThanOrEqual(1);
  });

  it('normalizing is unaffected by adding the same number to every entry', () => {
    const a = layerNormRow([2, 8, 4, 6]);
    const b = layerNormRow([102, 108, 104, 106]);
    for (let i = 0; i < a.output.length; i++) {
      expectClose(b.output[i], a.output[i], `shift invariance [${i}]`);
    }
  });

  it('the feed-forward network agrees with the reference', () => {
    const r = feedForward(DEFAULT_X, FFN_W1, FFN_B1, FFN_W2, FFN_B2);
    expectMatrixClose(r.hidden, reference.feedForward.hidden, 'hidden');
    expectMatrixClose(r.activated, reference.feedForward.activated, 'after ReLU');
    expectMatrixClose(r.output, reference.feedForward.output, 'FFN output');
    expect(r.zeroed).toBe(reference.feedForward.zeroed);
  });

  it('the ReLU zeroes exactly the negative entries, and nothing else', () => {
    const r = feedForward(DEFAULT_X, FFN_W1, FFN_B1, FFN_W2, FFN_B2);
    for (let i = 0; i < r.hidden.length; i++) {
      for (let j = 0; j < r.hidden[i].length; j++) {
        expect(r.activated[i][j]).toBe(r.hidden[i][j] > 0 ? r.hidden[i][j] : 0);
      }
    }
  });

  it('the feed-forward network treats each position on its own', () => {
    // One row alone must give the same answer as that row inside the block.
    const all = feedForward(DEFAULT_X, FFN_W1, FFN_B1, FFN_W2, FFN_B2);
    const alone = feedForward([DEFAULT_X[1]], FFN_W1, FFN_B1, FFN_W2, FFN_B2);
    expectMatrixClose([all.output[1]], alone.output, 'row 2 on its own');
  });

  it('the residual path is an addition and nothing else', () => {
    const sub = [
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [-1, 0, 1, 0],
    ];
    const r = addResidual(DEFAULT_X, sub);
    for (let i = 0; i < DEFAULT_X.length; i++) {
      for (let j = 0; j < DEFAULT_X[i].length; j++) {
        expect(r[i][j]).toBe(DEFAULT_X[i][j] + sub[i][j]);
      }
    }
  });

  it('a sublayer that returns zeros leaves the input untouched through the residual', () => {
    const zeros = DEFAULT_X.map((r) => r.map(() => 0));
    expect(addResidual(DEFAULT_X, zeros)).toEqual(DEFAULT_X);
    // and then normalization still fires, because the paper normalizes after adding
    const r = residualAndNorm(DEFAULT_X, zeros);
    expectMatrixClose(r.residual, DEFAULT_X, 'residual');
    expect(r.norm.output[0]).not.toEqual(DEFAULT_X[0]);
  });
});

describe('the loss and the learning rate', () => {
  const { probabilities, target } = LOSS_EXAMPLE;

  it('cross-entropy against a one-hot target agrees with the reference', () => {
    const r = crossEntropy(probabilities, oneHot(probabilities.length, target));
    expectClose(r.loss, reference.loss.oneHot.loss, 'one-hot loss');
  });

  it('with a one-hot target the loss is just −ln(p) of the right word', () => {
    const r = crossEntropy(probabilities, oneHot(probabilities.length, target));
    expectClose(r.loss, -Math.log(probabilities[target]), 'collapses to −ln p');
  });

  it('being more confident about the right word lowers the loss', () => {
    const t = oneHot(4, 1);
    const unsure = crossEntropy([0.25, 0.25, 0.25, 0.25], t).loss;
    const sure = crossEntropy([0.02, 0.94, 0.02, 0.02], t).loss;
    expect(sure).toBeLessThan(unsure);
  });

  it('label smoothing agrees with the reference and still sums to 1', () => {
    const smoothed = labelSmoothed(probabilities.length, target, LABEL_SMOOTHING);
    for (let i = 0; i < smoothed.length; i++) {
      expectClose(smoothed[i], reference.loss.labelSmoothedTarget[i], `smoothed [${i}]`);
    }
    expectClose(
      smoothed.reduce((a, b) => a + b, 0),
      1,
      'the smoothed target is still a distribution',
    );
    expectClose(
      crossEntropy(probabilities, smoothed).loss,
      reference.loss.labelSmoothed.loss,
      'smoothed loss',
    );
  });

  it('smoothing raises the loss — the paper says it hurts perplexity on purpose', () => {
    const hard = crossEntropy(probabilities, oneHot(4, target)).loss;
    const soft = crossEntropy(probabilities, labelSmoothed(4, target, LABEL_SMOOTHING)).loss;
    expect(soft).toBeGreaterThan(hard);
  });

  it('the learning-rate schedule agrees with the reference', () => {
    for (const p of reference.learningRate) {
      expectClose(learningRate(p.step, SCHEDULE.dModel, SCHEDULE.warmupSteps).rate, p.rate, `step ${p.step}`);
    }
  });

  it('the schedule peaks exactly at the end of the warmup', () => {
    const { warmupSteps, dModel } = SCHEDULE;
    const peak = learningRate(warmupSteps, dModel, warmupSteps).rate;
    expect(learningRate(warmupSteps - 1, dModel, warmupSteps).rate).toBeLessThan(peak);
    expect(learningRate(warmupSteps + 1, dModel, warmupSteps).rate).toBeLessThan(peak);
    expect(learningRate(warmupSteps, dModel, warmupSteps).phase).toBe('decay');
    expect(learningRate(1, dModel, warmupSteps).phase).toBe('warmup');
  });

  it('the rate rises through the warmup and falls after it', () => {
    const { warmupSteps: w, dModel: d } = SCHEDULE;
    expect(learningRate(10, d, w).rate).toBeLessThan(learningRate(1000, d, w).rate);
    expect(learningRate(100000, d, w).rate).toBeLessThan(learningRate(10000, d, w).rate);
  });
});

describe('producing a sentence', () => {
  it('greedy and beam search agree with the reference', () => {
    for (const c of reference.beam) {
      const r = beamSearch(TOY_MODEL, c.width);
      expect(r.best.tokens).toEqual(c.best.tokens);
      expectClose(r.best.probability, c.best.probability, `beam ${c.width}`);
    }
  });

  it('greedy is beam search with one slot', () => {
    expect(greedy(TOY_MODEL).best).toEqual(beamSearch(TOY_MODEL, 1).best);
  });

  it('taking the best word each time does not give the best sentence', () => {
    const g = greedy(TOY_MODEL);
    const b = beamSearch(TOY_MODEL, 2);
    expect(g.best.tokens.join(' ')).toBe('a .');
    expect(b.best.tokens.join(' ')).toBe('b a .');
    expect(b.best.probability).toBeGreaterThan(g.best.probability);
    // greedy took the better first word and still lost
    expect(TOY_MODEL[''].a).toBeGreaterThan(TOY_MODEL[''].b);
  });

  it('the probability of a sequence is the product along it', () => {
    const b = beamSearch(TOY_MODEL, 2);
    expectClose(b.best.probability, 0.4 * 0.9 * 0.95, 'b → a → .');
    expectClose(Math.exp(b.best.logProbability), b.best.probability, 'logs add to the same thing');
  });

  it('a wider beam never finds a worse sentence', () => {
    let previous = 0;
    for (const width of [1, 2, 3, 4]) {
      const p = beamSearch(TOY_MODEL, width).best.probability;
      expect(p).toBeGreaterThanOrEqual(previous - TOL);
      previous = p;
    }
  });
});

describe('reporting a calculation error', () => {
  const codes = Object.keys(EN_CALC_ERRORS) as CalcErrorCode[];

  it('every code has a sentence in both languages', () => {
    for (const locale of ['ko', 'en'] as const) {
      const ui = t(locale);
      for (const code of codes) {
        expect(ui.lab.errors[code], `${locale}: ${code}`).toBeTruthy();
      }
    }
  });

  it('the reader gets the message in their own language', () => {
    const e = new CalcError('rowFullyBlocked', { row: 2 });
    expect(formatCalcError(e, t('en'))).toContain('Every position in row 2 is blocked');
    expect(formatCalcError(e, t('ko'))).toContain('2번째 행의 모든 위치가 차단');
  });

  it('the matrix an error is about is named in that language too', () => {
    const e = new CalcError('emptyRows', { matrix: 'left' });
    expect(formatCalcError(e, t('en'))).toContain('The left matrix');
    expect(formatCalcError(e, t('ko'))).toContain('왼쪽 행렬');
    // The English message on the Error itself is already filled in
    expect(e.message).toContain('The left matrix');
  });

  it('no placeholder is left unfilled in either language', () => {
    const params = {
      matrix: 'W_Q',
      row: 1,
      col: 2,
      length: 3,
      expected: 4,
      aRows: 1,
      aCols: 2,
      bRows: 3,
      bCols: 4,
      a: 2,
      b: 3,
      maskLength: 2,
      scoreLength: 3,
      wRows: 2,
      xCols: 4,
      qCols: 2,
      kCols: 3,
      head: 2,
      got: 3,
      concatCols: 4,
      woRows: 2,
      dModel: 5,
      what: 'gamma',
      target: 7,
      size: 4,
    };
    for (const locale of ['ko', 'en'] as const) {
      for (const code of codes) {
        const text = formatCalcError(new CalcError(code, params), t(locale));
        expect(text, `${locale}: ${code}`).not.toMatch(/\{\w+\}/);
      }
    }
  });

  it('falls back to the raw message for anything that is not a CalcError', () => {
    expect(formatCalcError(new Error('something else'), t('ko'))).toBe('something else');
    expect(formatCalcError('a string', t('ko'))).toBe('a string');
  });
});

describe("the paper's own numbers", () => {
  // These are the only figures on the site that were not computed here. They were
  // transcribed once from the PDF, so what this pins is the transcription.
  it('Table 2 holds the rows the prose quotes', () => {
    const base = TABLE2.find((m) => m.model === 'Transformer (base model)')!;
    const big = TABLE2.find((m) => m.model === 'Transformer (big)')!;
    expect(base.bleuEnDe).toBe(27.3);
    expect(big.bleuEnDe).toBe(28.4);
    expect(big.bleuEnFr).toBe(41.8);
    expect(base.flopsEnDe).toBe(3.3e18);

    // The claim in the prose: the base model beats everything earlier, for less.
    const earlier = TABLE2.filter((m) => !m.transformer && m.bleuEnDe !== null);
    expect(earlier.every((m) => m.bleuEnDe! < base.bleuEnDe!)).toBe(true);
    expect(
      earlier.filter((m) => m.flopsEnDe !== null).every((m) => m.flopsEnDe! > base.flopsEnDe!),
    ).toBe(true);
  });

  it('the discrepancy inside the paper is recorded, not smoothed over', () => {
    expect(EN_FR_DISCREPANCY.table2).toBe(41.8);
    expect(EN_FR_DISCREPANCY.body).toBe(41.0);
    expect(EN_FR_DISCREPANCY.table2).not.toBe(EN_FR_DISCREPANCY.body);
  });

  it('Table 3 holds the ablations the prose quotes', () => {
    const find = (change: string) => TABLE3.find((a) => a.change.startsWith(change))!;
    expect(TABLE3[0].bleu).toBe(25.8);
    expect(find('h=1').bleu).toBe(24.9);
    expect(find('h=32').bleu).toBe(25.4);
    expect(find('d_k=16').bleu).toBe(25.1);
    expect(find('N=2').bleu).toBe(23.7);
    expect(find('N=8').bleu).toBe(25.5);
    expect(find('d_ff=4096').bleu).toBe(26.2);
    expect(find('P_drop=0.0').bleu).toBe(24.6);
    expect(find('ε_ls=0.0').bleu).toBe(25.3);
    expect(find('learned positional').bleu).toBe(25.7);

    // The prose says depth costs the most of anything tried.
    const drops = TABLE3.filter((a) => a.group !== 'base' && a.group !== 'big').map(
      (a) => TABLE3[0].bleu - a.bleu,
    );
    expect(Math.max(...drops)).toBe(TABLE3[0].bleu - find('N=2').bleu);
  });

  it('Table 4 holds the parsing scores the prose quotes', () => {
    const ours = TABLE4.filter((r) => r.parser.startsWith('Transformer'));
    expect(ours.map((r) => r.f1)).toEqual([91.3, 92.7]);
  });

  it('the training conditions match the prose', () => {
    expect(TRAINING.gpus).toBe(8);
    expect(TRAINING.warmupSteps).toBe(4000);
    expect(TRAINING.beamSize).toBe(4);
    expect(TRAINING.lengthPenalty).toBe(0.6);
    expect(TRAINING.labelSmoothing).toBe(LABEL_SMOOTHING);
    // the article's schedule figure uses these, so they must agree
    expect(TRAINING.warmupSteps).toBe(SCHEDULE.warmupSteps);
  });
});

describe('displaying numbers', () => {
  it('uses U+2212 on screen and an ASCII hyphen in input fields', () => {
    // A U+2212 inside <input type="number"> makes the browser blank the field.
    expect(fmt(-2.828)).toBe('−2.828');
    expect(fmtCompact(-4)).toBe('−4');
    expect(fmtInput(-4)).toBe('-4');
    expect(fmtInput(-2.5)).toBe('-2.5');
  });

  it('writes infinity and negative zero in a way a person can read', () => {
    expect(fmt(Number.NEGATIVE_INFINITY)).toBe('−∞');
    expect(fmt(-0)).toBe('0.000');
    expect(fmtCompact(-0)).toBe('0');
  });

  it('keeps the number of decimal places fixed whatever the value', () => {
    // column widths must not jump around while the reader is editing
    for (const v of [0, 1, -1, 0.5, 12.3456, -0.0001]) {
      expect(fmt(v).replace('−', '').split('.')[1]).toHaveLength(3);
    }
  });

  it('treats an empty or malformed field as no value', () => {
    expect(parseNumber('')).toBeNull();
    expect(parseNumber('-')).toBeNull();
    expect(parseNumber('abc')).toBeNull();
    expect(parseNumber('3')).toBe(3);
    expect(parseNumber(' -2.5 ')).toBe(-2.5);
    // a U+2212 pasted back from the screen is accepted too
    expect(parseNumber('−2.5')).toBe(-2.5);
  });
});
