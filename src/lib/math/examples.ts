/**
 * The worked example shared by the prose and the labs.
 *
 * The defaults from section 8.2 of `docs/plan.md`: 3 tokens, d_model=4,
 * d_k=2, d_v=2, one head.
 *
 * The values are small integers chosen by hand. Nothing here was learned, and
 * no vector carries the meaning of a word.
 * They are picked so every entry of QKᵀ comes out an integer, which lets a
 * reader check the numbers quoted in the prose on paper.
 */

import type { AttentionInput } from './attention';
import type { Matrix } from './matrix';
import type { MultiHeadInput } from './multihead';
import type { ToyModel } from './generation';

const clone = (m: Matrix): Matrix => m.map((r) => [...r]);

/** n × d_model = 3 × 4 */
export const DEFAULT_X: Matrix = [
  [1, 0, 1, 0],
  [0, 1, 0, 1],
  [1, 1, 0, 0],
];

/** d_model × d_k = 4 × 2 */
export const DEFAULT_WQ: Matrix = [
  [1, 0],
  [0, 1],
  [1, 0],
  [0, 1],
];

/** d_model × d_k = 4 × 2 */
export const DEFAULT_WK: Matrix = [
  [0, 1],
  [1, 0],
  [0, 1],
  [1, 0],
];

/** d_model × d_v = 4 × 2 */
export const DEFAULT_WV: Matrix = [
  [1, 0],
  [0, 1],
  [2, 0],
  [0, 2],
];

export const DEFAULT_ATTENTION_INPUT: AttentionInput = {
  X: DEFAULT_X,
  WQ: DEFAULT_WQ,
  WK: DEFAULT_WK,
  WV: DEFAULT_WV,
  scaled: true,
  masked: false,
};

export function defaultAttentionInput(): AttentionInput {
  return {
    X: DEFAULT_X.map((r) => [...r]),
    WQ: DEFAULT_WQ.map((r) => [...r]),
    WK: DEFAULT_WK.map((r) => [...r]),
    WV: DEFAULT_WV.map((r) => [...r]),
    scaled: true,
    masked: false,
  };
}

/** The two vectors used in the dot-product section: row 1 of Q and row 2 of K. */
export const DOT_PRODUCT_EXAMPLE = {
  u: [2, 0],
  v: [2, 0],
};

/** The scores used in the softmax section: row 1 of the worked example, [0, 4, 2]. */
export const SOFTMAX_EXAMPLE_SCORES = [0, 4, 2];

/* ------------------------------------------------------------ multi-head */

/**
 * A second head for the worked example.
 *
 * Head 1 reuses the projections above. Head 2 reads only the first two features
 * of each token, which makes it attend quite differently — the point being that
 * two heads over the same input do not have to agree.
 *
 * Chosen so every entry of QKᵀ is again an integer.
 */
export const HEAD2_WQ: Matrix = [
  [1, 0],
  [0, 1],
  [0, 0],
  [0, 0],
];
export const HEAD2_WK: Matrix = [
  [1, 0],
  [0, 1],
  [0, 0],
  [0, 0],
];
export const HEAD2_WV: Matrix = [
  [0, 1],
  [1, 0],
  [0, 0],
  [0, 0],
];

/** (h · d_v) × d_model = 4 × 4. Mixes the two heads back down to d_model. */
export const DEFAULT_WO: Matrix = [
  [1, 0, 0, 1],
  [0, 1, 1, 0],
  [1, 1, 0, 0],
  [0, 0, 1, 1],
];

export function defaultMultiHeadInput(): MultiHeadInput {
  return {
    X: DEFAULT_X.map((r) => [...r]),
    heads: [
      { WQ: clone(DEFAULT_WQ), WK: clone(DEFAULT_WK), WV: clone(DEFAULT_WV) },
      { WQ: clone(HEAD2_WQ), WK: clone(HEAD2_WK), WV: clone(HEAD2_WV) },
    ],
    WO: clone(DEFAULT_WO),
    scaled: true,
    masked: false,
  };
}

/* ------------------------------------------------------- feed forward */

/**
 * A small feed-forward network: d_model = 4, d_ff = 8.
 *
 * The paper uses 512 and 2048 — the same four-to-one ratio. Small integers so
 * the reader can check a hidden unit by hand, and negative entries so the ReLU
 * has something to do.
 */
export const FFN_W1: Matrix = [
  [1, -1, 0, 2, 1, 0, -1, 0],
  [0, 1, 1, -1, 0, 2, 0, 1],
  [2, 0, -1, 0, 1, 1, 1, -1],
  [-1, 1, 0, 1, 0, -1, 2, 0],
];
export const FFN_B1: number[] = [0, -1, 1, 0, -2, 0, 1, 0];
export const FFN_W2: Matrix = [
  [1, 0, 0, 1],
  [0, 1, 1, 0],
  [1, -1, 0, 0],
  [0, 0, 1, -1],
  [1, 1, 0, 0],
  [0, 0, -1, 1],
  [-1, 0, 1, 0],
  [0, 1, 0, 1],
];
export const FFN_B2: number[] = [0, 1, 0, -1];

/* ---------------------------------------------------------- generation */

/**
 * A toy model for the generation section, written out by hand.
 *
 * It is arranged so that taking the best word at every step does **not** find
 * the best sentence: "a" looks better than "b" at the first step, but every
 * continuation of "b" is far stronger.
 */
export const TOY_MODEL: ToyModel = {
  '': { a: 0.5, b: 0.4, c: 0.1 },
  a: { a: 0.1, b: 0.2, c: 0.3, '.': 0.4 },
  b: { a: 0.9, b: 0.02, c: 0.03, '.': 0.05 },
  c: { a: 0.3, b: 0.3, c: 0.1, '.': 0.3 },
  'a a': { '.': 1 },
  'a b': { '.': 1 },
  'a c': { '.': 1 },
  'b a': { '.': 0.95, c: 0.05 },
  'b b': { '.': 1 },
  'b c': { '.': 1 },
  'c a': { '.': 1 },
  'c b': { '.': 1 },
  'c c': { '.': 1 },
  'b a c': { '.': 1 },
};

/* ------------------------------------------------------------- training */

/** The four-word vocabulary used when the loss is introduced. */
export const LOSS_VOCABULARY = ['a', 'b', 'c', '.'];
/** What the model predicted, and which word was actually right. */
export const LOSS_EXAMPLE = { probabilities: [0.1, 0.6, 0.2, 0.1], target: 1 };
/** The paper's label-smoothing constant, §5.4. */
export const LABEL_SMOOTHING = 0.1;

/** The base model's settings for the learning-rate schedule, §5.3. */
export const SCHEDULE = { dModel: 512, warmupSteps: 4000 };
