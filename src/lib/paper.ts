/**
 * Numbers taken straight from the paper.
 *
 * Everything else in this project is computed on the page. These are not: they
 * are measurements the authors report, and there is no way to recompute them
 * here. So they live in one place, read once out of the PDF (arXiv v7,
 * 2023-08-02), with the table and page they came from recorded beside them.
 *
 * `docs/papers/attention-is-all-you-need-coverage.md` tracks the correspondence.
 * A unit test pins the figures the prose quotes.
 */

export const PAPER = {
  arxiv: '1706.03762',
  version: 'v7',
  versionDate: '2023-08-02',
  venue: 'NIPS 2017',
} as const;

/** Table 1, page 6. `n` sequence length, `d` representation dimension, `k` kernel, `r` neighbourhood. */
export interface LayerCost {
  layer: string;
  complexity: string;
  sequential: string;
  pathLength: string;
}

export const TABLE1: LayerCost[] = [
  { layer: 'Self-Attention', complexity: 'O(n² · d)', sequential: 'O(1)', pathLength: 'O(1)' },
  { layer: 'Recurrent', complexity: 'O(n · d²)', sequential: 'O(n)', pathLength: 'O(n)' },
  { layer: 'Convolutional', complexity: 'O(k · n · d²)', sequential: 'O(1)', pathLength: 'O(log_k n)' },
  {
    layer: 'Self-Attention (restricted)',
    complexity: 'O(r · n · d)',
    sequential: 'O(1)',
    pathLength: 'O(n / r)',
  },
];

/**
 * Table 2, page 8 — BLEU on newstest2014 and the estimated training cost.
 *
 * A null means the paper leaves that cell empty. For the two Transformer rows
 * the cost column spans both languages, so the same figure is used for each.
 *
 * The authors estimate FLOPs as training time × number of GPUs × an assumed
 * sustained single-precision rate (footnote 5: 2.8, 3.7, 6.0 and 9.5 TFLOPS for
 * K80, K40, M40 and P100). It is an estimate, not a measurement.
 */
export interface TranslationResult {
  model: string;
  ensemble: boolean;
  transformer: boolean;
  bleuEnDe: number | null;
  bleuEnFr: number | null;
  flopsEnDe: number | null;
  flopsEnFr: number | null;
}

export const TABLE2: TranslationResult[] = [
  { model: 'ByteNet', ensemble: false, transformer: false, bleuEnDe: 23.75, bleuEnFr: null, flopsEnDe: null, flopsEnFr: null },
  { model: 'Deep-Att + PosUnk', ensemble: false, transformer: false, bleuEnDe: null, bleuEnFr: 39.2, flopsEnDe: null, flopsEnFr: 1.0e20 },
  { model: 'GNMT + RL', ensemble: false, transformer: false, bleuEnDe: 24.6, bleuEnFr: 39.92, flopsEnDe: 2.3e19, flopsEnFr: 1.4e20 },
  { model: 'ConvS2S', ensemble: false, transformer: false, bleuEnDe: 25.16, bleuEnFr: 40.46, flopsEnDe: 9.6e18, flopsEnFr: 1.5e20 },
  { model: 'MoE', ensemble: false, transformer: false, bleuEnDe: 26.03, bleuEnFr: 40.56, flopsEnDe: 2.0e19, flopsEnFr: 1.2e20 },
  { model: 'Deep-Att + PosUnk Ensemble', ensemble: true, transformer: false, bleuEnDe: null, bleuEnFr: 40.4, flopsEnDe: null, flopsEnFr: 8.0e20 },
  { model: 'GNMT + RL Ensemble', ensemble: true, transformer: false, bleuEnDe: 26.3, bleuEnFr: 41.16, flopsEnDe: 1.8e20, flopsEnFr: 1.1e21 },
  { model: 'ConvS2S Ensemble', ensemble: true, transformer: false, bleuEnDe: 26.36, bleuEnFr: 41.29, flopsEnDe: 7.7e19, flopsEnFr: 1.2e21 },
  { model: 'Transformer (base model)', ensemble: false, transformer: true, bleuEnDe: 27.3, bleuEnFr: 38.1, flopsEnDe: 3.3e18, flopsEnFr: 3.3e18 },
  { model: 'Transformer (big)', ensemble: false, transformer: true, bleuEnDe: 28.4, bleuEnFr: 41.8, flopsEnDe: 2.3e19, flopsEnFr: 2.3e19 },
];

/**
 * Table 3, page 9 — variations on the base model.
 *
 * Perplexity and BLEU are on the English-to-German **development** set
 * (newstest2013), so they are not comparable with the numbers in Table 2.
 * A null means the cell is blank in the paper, meaning "same as base".
 */
export interface Ablation {
  group: 'base' | 'A' | 'B' | 'C' | 'D' | 'E' | 'big';
  /** What this row changed, in the paper's own terms */
  change: string;
  ppl: number;
  bleu: number;
  /** Parameters in millions, where the paper lists them */
  params: number | null;
}

export const TABLE3: Ablation[] = [
  { group: 'base', change: 'base: N=6, d_model=512, d_ff=2048, h=8, d_k=d_v=64, P_drop=0.1, ε_ls=0.1, 100K steps', ppl: 4.92, bleu: 25.8, params: 65 },
  { group: 'A', change: 'h=1, d_k=d_v=512', ppl: 5.29, bleu: 24.9, params: null },
  { group: 'A', change: 'h=4, d_k=d_v=128', ppl: 5.0, bleu: 25.5, params: null },
  { group: 'A', change: 'h=16, d_k=d_v=32', ppl: 4.91, bleu: 25.8, params: null },
  { group: 'A', change: 'h=32, d_k=d_v=16', ppl: 5.01, bleu: 25.4, params: null },
  { group: 'B', change: 'd_k=16', ppl: 5.16, bleu: 25.1, params: 58 },
  { group: 'B', change: 'd_k=32', ppl: 5.01, bleu: 25.4, params: 60 },
  { group: 'C', change: 'N=2', ppl: 6.11, bleu: 23.7, params: 36 },
  { group: 'C', change: 'N=4', ppl: 5.19, bleu: 25.3, params: 50 },
  { group: 'C', change: 'N=8', ppl: 4.88, bleu: 25.5, params: 80 },
  { group: 'C', change: 'd_model=256, d_k=d_v=32', ppl: 5.75, bleu: 24.5, params: 28 },
  { group: 'C', change: 'd_model=1024, d_k=d_v=128', ppl: 4.66, bleu: 26.0, params: 168 },
  { group: 'C', change: 'd_ff=1024', ppl: 5.12, bleu: 25.4, params: 53 },
  { group: 'C', change: 'd_ff=4096', ppl: 4.75, bleu: 26.2, params: 90 },
  { group: 'D', change: 'P_drop=0.0', ppl: 5.77, bleu: 24.6, params: null },
  { group: 'D', change: 'P_drop=0.2', ppl: 4.95, bleu: 25.5, params: null },
  { group: 'D', change: 'ε_ls=0.0', ppl: 4.67, bleu: 25.3, params: null },
  { group: 'D', change: 'ε_ls=0.2', ppl: 5.47, bleu: 25.7, params: null },
  { group: 'E', change: 'learned positional embeddings instead of sinusoids', ppl: 4.92, bleu: 25.7, params: null },
  { group: 'big', change: 'big: N=6, d_model=1024, d_ff=4096, h=16, P_drop=0.3, 300K steps', ppl: 4.33, bleu: 26.4, params: 213 },
];

/** Table 4, page 10 — English constituency parsing, F1 on section 23 of the WSJ. */
export const TABLE4 = [
  { parser: 'Vinyals & Kaiser et al. (2014)', training: 'WSJ only, discriminative', f1: 88.3 },
  { parser: 'Petrov et al. (2006)', training: 'WSJ only, discriminative', f1: 90.4 },
  { parser: 'Zhu et al. (2013)', training: 'WSJ only, discriminative', f1: 90.4 },
  { parser: 'Dyer et al. (2016)', training: 'WSJ only, discriminative', f1: 91.7 },
  { parser: 'Transformer (4 layers)', training: 'WSJ only, discriminative', f1: 91.3 },
  { parser: 'Zhu et al. (2013)', training: 'semi-supervised', f1: 91.3 },
  { parser: 'Huang & Harper (2009)', training: 'semi-supervised', f1: 91.3 },
  { parser: 'McClosky et al. (2006)', training: 'semi-supervised', f1: 92.1 },
  { parser: 'Vinyals & Kaiser et al. (2014)', training: 'semi-supervised', f1: 92.1 },
  { parser: 'Transformer (4 layers)', training: 'semi-supervised', f1: 92.7 },
];

/** §5.1–5.3, pages 7–8: how the reported models were trained. */
export const TRAINING = {
  enDePairs: '4.5M',
  enDeVocabulary: 37000,
  enFrSentences: '36M',
  enFrVocabulary: 32000,
  tokensPerBatch: 25000,
  gpus: 8,
  gpuModel: 'P100',
  baseStepSeconds: 0.4,
  baseSteps: 100000,
  baseHours: 12,
  bigStepSeconds: 1.0,
  bigSteps: 300000,
  bigDays: 3.5,
  adam: { beta1: 0.9, beta2: 0.98, epsilon: 1e-9 },
  warmupSteps: 4000,
  dropout: 0.1,
  labelSmoothing: 0.1,
  beamSize: 4,
  lengthPenalty: 0.6,
  baseCheckpointsAveraged: 5,
  bigCheckpointsAveraged: 20,
} as const;

/**
 * The paper disagrees with itself here, and it was never corrected — not even in
 * v7. The abstract and Table 2 say 41.8; the body of §6.1 says 41.0 for the same
 * model. The wiki quotes Table 2 and says so.
 */
export const EN_FR_DISCREPANCY = { table2: 41.8, body: 41.0 } as const;
