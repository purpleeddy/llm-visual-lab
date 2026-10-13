/** One weight, two logits and one correct class. An illustration, not full LLM training. */
import { softmaxRow } from './softmax';
import { crossEntropy, oneHot } from './training';

export function oneWeightPrediction(weight: number, input = 1) {
  const logits = [weight * input, 0];
  const probabilities = softmaxRow(logits).probabilities;
  const loss = crossEntropy(probabilities, oneHot(2, 0)).loss;
  return { weight, input, logits, probabilities, loss };
}

export function oneWeightStep(weight: number, learningRate: number, input = 1) {
  if (![weight, learningRate, input].every(Number.isFinite) || learningRate < 0) {
    throw new RangeError('Use finite values and a non-negative learning rate.');
  }
  const before = oneWeightPrediction(weight, input);
  const probe = 0.001;
  const minus = oneWeightPrediction(weight - probe, input).loss;
  const plus = oneWeightPrediction(weight + probe, input).loss;
  const estimatedGradient = (plus - minus) / (2 * probe);
  // For softmax + cross-entropy, dL/dlogit = predicted probability - target.
  const derivative = (before.probabilities[0] - 1) * input;
  const gradient = derivative === 0 ? 0 : derivative; // canonical zero for a flat loss curve
  const change = -learningRate * gradient;
  const after = oneWeightPrediction(weight + change, input);
  return { before, after, probe, minus, plus, estimatedGradient, gradient, learningRate, change };
}
