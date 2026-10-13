/** A hand-chosen, one-block decoder illustration; it is not a trained language model. */
import { DEFAULT_X, defaultMultiHeadInput, FFN_W1, FFN_B1, FFN_W2, FFN_B2 } from './examples';
import { addPositions } from './positional';
import { computeMultiHead } from './multihead';
import { feedForward, residualAndNorm } from './blocks';
import { matmul, type Matrix } from './matrix';
import { softmaxRows } from './softmax';

export const TRACE_STAGES = ['embedding', 'position', 'attention', 'attention-residual', 'feed-forward', 'ffn-residual', 'logits', 'probabilities'] as const;
export type TraceStage = typeof TRACE_STAGES[number];
/** Identity readout: each of the four hidden features becomes one vocabulary score. */
export const TOY_READOUT: Matrix = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];

export function tinyDecoder(X: Matrix = DEFAULT_X, withPositions = true, masked = true) {
  const embeddings = X.map(row => [...row]);
  const positioned = withPositions ? addPositions(embeddings).sum : embeddings;
  const input = defaultMultiHeadInput();
  const attention = computeMultiHead({ ...input, X: positioned, masked });
  const afterAttention = residualAndNorm(positioned, attention.output).norm.output;
  const feed = feedForward(afterAttention, FFN_W1, FFN_B1, FFN_W2, FFN_B2);
  const hidden = residualAndNorm(afterAttention, feed.output).norm.output;
  const logits = matmul(hidden, TOY_READOUT);
  const probabilities = softmaxRows(logits).map(row => row.probabilities);
  const stages: Record<TraceStage, Matrix> = {
    embedding: embeddings, position: positioned, attention: attention.output,
    'attention-residual': afterAttention, 'feed-forward': feed.output,
    'ffn-residual': hidden, logits, probabilities,
  };
  return { stages, attention, hidden, logits, probabilities };
}
