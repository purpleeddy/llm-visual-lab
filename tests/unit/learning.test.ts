import { describe, expect, it } from 'vitest';
import { greedy, sampleIndex, temperatureProbabilities } from '../../src/lib/math/generation';
import { oneWeightPrediction, oneWeightStep } from '../../src/lib/math/learning';
import { tinyDecoder, TRACE_STAGES } from '../../src/lib/math/model';
import { SECTIONS, WALKTHROUGH_SECTIONS } from '../../src/lib/nav';
import { computeAttention } from '../../src/lib/math/attention';
import { dotProduct, matmul } from '../../src/lib/math/matrix';
import { TOY_MODEL, NEXT_TOKEN_SENTENCE_MODELS, LEARNING_EXAMPLE, DEFAULT_X, DEFAULT_ATTENTION_INPUT, DEFAULT_WQ } from '../../src/lib/math/examples';

describe('greedy decoding follows the chosen token', () => {
  it('never replaces a locally chosen path with an earlier, unchosen end token', () => {
    const model = {
      '': { a: 1 },
      a: { b: 0.6, '.': 0.4 },
      'a b': { c: 0.6, '.': 0.4 },
      'a b c': { '.': 1 },
    };
    const run = greedy(model);
    expect(run.best.tokens).toEqual(['a', 'b', 'c', '.']);
    expect(run.best.probability).toBeCloseTo(0.36, 12);
  });

  it('the step table ends on the same path as the displayed result', () => {
    const run = greedy(TOY_MODEL);
    expect(run.steps.at(-1)?.kept[0].tokens).toEqual(run.best.tokens);
    expect(run.steps.at(-1)?.kept[0].finished).toBe(true);
  });
});


describe('one weight makes an actual learning step', () => {
  it('matches an independently written binary logistic loss', () => {
    for (const w of [-2, 0, 0.5, 3]) {
      const actual = oneWeightPrediction(w);
      expect(actual.loss).toBeCloseTo(Math.log1p(Math.exp(-w)), 12);
      expect(actual.probabilities[0]).toBeCloseTo(1 / (1 + Math.exp(-w)), 12);
    }
  });
  it('the analytic gradient agrees with a finite difference', () => {
    for (const w of [-2, 0, 2]) {
      const step = oneWeightStep(w, 0.2);
      expect(step.estimatedGradient).toBeCloseTo(step.gradient, 6);
      expect(step.after.loss).toBeLessThan(step.before.loss);
    }
  });
  it('pins the worked update and recomputes probability and loss', () => {
    const step = oneWeightStep(0, 0.2);
    expect(step.gradient).toBe(-0.5);
    expect(step.after.weight).toBe(0.1);
    expect(step.after.probabilities[0]).toBeCloseTo(0.52497918747894, 12);
    expect(step.after.loss).toBeCloseTo(0.6443966600735709, 12);
  });
  it('input sign changes the update direction and zero input cannot teach this weight', () => {
    const negative = oneWeightStep(0, 0.2, -1);
    expect(negative.gradient).toBe(0.5);
    expect(negative.after.weight).toBe(-0.1);
    expect(negative.estimatedGradient).toBeCloseTo(0.5, 6);
    expect(negative.after.loss).toBeCloseTo(0.6443966600735709, 12);
    const zero = oneWeightStep(2, 0.2, 0);
    expect(zero.gradient).toBe(0);
    expect(zero.estimatedGradient).toBe(0);
    expect(zero.after).toEqual(zero.before);
    expect(zero.after.loss).toBeCloseTo(Math.log(2), 12);
  });
  it('a zero learning rate changes nothing, while a larger rate changes the proposed step', () => {
    expect(oneWeightStep(0, 0).after).toEqual(oneWeightStep(0, 0).before);
    expect(oneWeightStep(0, 0.4).change).toBe(0.2);
    expect(() => oneWeightStep(0, -0.1)).toThrow();
  });
});

describe('the integrated one-block decoder', () => {
  it('keeps three token rows through all eight stages and changes the meaning of columns at readout', () => {
    const run = tinyDecoder();
    expect(Object.keys(run.stages)).toEqual([...TRACE_STAGES]);
    for (const matrix of Object.values(run.stages)) {
      expect(matrix).toHaveLength(3);
      expect(matrix.every(row => row.length === 4 && row.every(Number.isFinite))).toBe(true);
    }
    for (const row of run.probabilities) {
      expect(row.every(p => p >= 0 && p <= 1)).toBe(true);
      expect(row.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    }
  });
  it('a future token cannot affect an earlier prediction with the causal mask', () => {
    const original = [[1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 0, 0]];
    const changed = original.map(row => [...row]);
    changed[2] = [11, -3, 2, 0];
    expect(tinyDecoder(changed).logits[0]).toEqual(tinyDecoder(original).logits[0]);
    expect(tinyDecoder(changed, true, false).logits[0]).not.toEqual(tinyDecoder(original, true, false).logits[0]);
    expect(original[2]).toEqual([1, 1, 0, 0]);
  });
  it('positions affect the calculation without changing the shape', () => {
    const on = tinyDecoder(); const off = tinyDecoder(undefined, false);
    expect(on.logits).not.toEqual(off.logits);
    expect(on.stages.position[0]).toEqual([1, 1, 1, 1]);
    expect(off.stages.position[0]).toEqual([1, 0, 1, 0]);
  });
});

describe('token probabilities and selection', () => {
  it('temperature one gives the expected softmax, and higher temperature is less concentrated', () => {
    const p = temperatureProbabilities([0, 2, 1]);
    expect(p[0]).toBeCloseTo(0.09003057317038046, 12);
    expect(p[1]).toBeCloseTo(0.6652409557748218, 12);
    expect(p[2]).toBeCloseTo(0.24472847105479767, 12);
    const hot = temperatureProbabilities([0, 2, 1], 2);
    expect(Math.max(...hot)).toBeLessThan(Math.max(...p));
    expect(hot.indexOf(Math.max(...hot))).toBe(1);
    expect(() => temperatureProbabilities([0, 1], 0)).toThrow();
  });
  it('sampling follows half-open bins and never picks a zero-probability candidate', () => {
    expect(sampleIndex([0.5, 0.4, 0.1], 0)).toBe(0);
    expect(sampleIndex([0.5, 0.4, 0.1], 0.5)).toBe(1);
    expect(sampleIndex([0.5, 0.4, 0.1], 0.9)).toBe(2);
    expect(sampleIndex([0, 0.5, 0, 0.5], 0)).toBe(1);
    expect(sampleIndex([0, 0.5, 0, 0.5], 0.5)).toBe(3);
    expect(() => sampleIndex([0.5, 0.5], 1)).toThrow();
    expect(() => sampleIndex([0.2, 0.2], 0.1)).toThrow();
  });
});

describe('a learning path with explicit prerequisites', () => {
  it.each([
    ['article', SECTIONS, ['language-model', 'tokens', 'context', 'attention', 'positions', 'blocks', 'generation', 'training', 'real-llm']],
    ['walkthrough', WALKTHROUGH_SECTIONS, ['language-model', 'tokens', 'attention', 'positions', 'multi-head', 'blocks', 'big-picture', 'generation', 'training', 'results']],
  ] as const)('%s: every prerequisite is a real earlier unit and every unit has a goal and reasoned checkpoint', (_, sections, ids) => {
    expect(sections.map(s => s.id)).toEqual(ids);
    sections.forEach((s, i) => {
      for (const id of s.prerequisites) {
        const previous = sections.findIndex(p => p.id === id);
        expect(previous).toBeGreaterThanOrEqual(0);
        expect(previous).toBeLessThan(i);
      }
      for (const locale of ['ko', 'en'] as const) {
        expect(s.goal[locale].length).toBeGreaterThan(10);
        expect(s.check.question[locale].length).toBeGreaterThan(10);
        expect(s.check.answer[locale].length).toBeGreaterThan(10);
      }
    });
  });
});


describe('readable illustrative sentence choices', () => {
  it('offers subject, place and action candidates for their actual Korean prefixes', () => {
    expect(NEXT_TOKEN_SENTENCE_MODELS.ko['']).toEqual({ '나는': 0.6, '우리는': 0.25, '그는': 0.1, '.': 0.05 });
    expect(NEXT_TOKEN_SENTENCE_MODELS.ko['나는']).toEqual({ '학교에': 0.6, '집에': 0.2, '도서관에': 0.15, '.': 0.05 });
    expect(NEXT_TOKEN_SENTENCE_MODELS.ko['나는 학교에']).toEqual({ '갔다': 0.7, '도착했다': 0.1, '간다': 0.15, '.': 0.05 });
  });
  it('offers subjects, actions and destinations for their actual English prefixes', () => {
    expect(NEXT_TOKEN_SENTENCE_MODELS.en['']).toEqual({ I: 0.6, We: 0.25, They: 0.1, '.': 0.05 });
    expect(NEXT_TOKEN_SENTENCE_MODELS.en.I).toEqual({ went: 0.6, walked: 0.2, headed: 0.15, '.': 0.05 });
    expect(NEXT_TOKEN_SENTENCE_MODELS.en['I went']).toEqual({ 'to school': 0.7, home: 0.1, 'to work': 0.15, '.': 0.05 });
  });
  it('greedy produces natural localized examples and their probability products', () => {
    const ko=greedy(NEXT_TOKEN_SENTENCE_MODELS.ko);
    const en=greedy(NEXT_TOKEN_SENTENCE_MODELS.en);
    expect(ko.best.tokens).toEqual(['나는','학교에','갔다','.']);
    expect(en.best.tokens).toEqual(['I','went','to school','.']);
    expect(ko.best.probability).toBeCloseTo(0.6*0.6*0.7,12);
    expect(en.best.probability).toBeCloseTo(0.6*0.6*0.7,12);
  });
  it('every candidate branch has a normalized table until its end marker', () => {
    for (const model of Object.values(NEXT_TOKEN_SENTENCE_MODELS)) {
      for (const [prefix,distribution] of Object.entries(model)) {
        expect(Object.values(distribution).reduce((a,b)=>a+b,0)).toBeCloseTo(1,12);
        for (const [token,p] of Object.entries(distribution)) {
          expect(p).toBeGreaterThan(0); expect(p).toBeLessThanOrEqual(1);
          if (token!=='.') expect(model[[prefix,token].filter(Boolean).join(' ')]).toBeDefined();
        }
      }
    }
  });
  it('the same candidate changes probability when the shared prefix grows', () => {
    expect(NEXT_TOKEN_SENTENCE_MODELS.ko['나는 학교에']['.']).toBe(0.05);
    expect(NEXT_TOKEN_SENTENCE_MODELS.ko['나는 학교에 갔다']['.']).toBe(1);
    expect(NEXT_TOKEN_SENTENCE_MODELS.en['I went']['.']).toBe(0.05);
    expect(NEXT_TOKEN_SENTENCE_MODELS.en['I went to school']['.']).toBe(1);
  });
  it('preserves the shared three embedding rows and computed final distribution across candidate names', () => {
    expect(DEFAULT_X).toEqual([[1,0,1,0],[0,1,0,1],[1,1,0,0]]);
    for (const locale of ['ko','en'] as const) {
      expect(LEARNING_EXAMPLE[locale].tokens).toHaveLength(DEFAULT_X.length);
      expect(LEARNING_EXAMPLE[locale].vocabulary).toEqual([...LEARNING_EXAMPLE[locale].tokens,'.']);
    }
    const run=tinyDecoder();
    expect(run.stages.embedding).toEqual(DEFAULT_X);
    // Independent expected values pin the computed default, not the introductory chosen probability table.
    [0.288,-0.064,-1.506,1.282].forEach((v,i)=>expect(run.logits[2][i]).toBeCloseTo(v,3));
    [0.219,0.154,0.036,0.591].forEach((v,i)=>expect(run.probabilities[2][i]).toBeCloseTo(v,3));
  });
});


describe('the static transpose walk uses the worked attention calculation', () => {
  it('keeps each key list unchanged in a column and bundles the same nine dot products', () => {
    const run = computeAttention({ ...DEFAULT_ATTENTION_INPUT, masked: true });
    expect(run.Q).toEqual([[2,0],[0,2],[1,1]]);
    expect(run.K).toEqual([[0,2],[2,0],[1,1]]);
    expect(run.KT).toEqual([[0,2,1],[2,0,1]]);
    expect(run.scores).toEqual([[0,4,2],[4,0,2],[2,2,2]]);
    run.K.forEach((row, c) => expect(run.KT.map(values => values[c])).toEqual(row));
    run.Q.forEach((query, r) => run.K.forEach((key, c) => {
      expect(dotProduct(query, key).value).toBe(run.scores[r][c]);
    }));
    expect(dotProduct(run.Q[2], run.K[0]).terms.map(t => [t.a,t.b,t.product])).toEqual([[1,0,0],[1,2,2]]);
    expect(run.allowed).toEqual([[true,false,false],[true,true,false],[true,true,true]]);
    expect(run.weights[0]).toEqual([1,0,0]);
  });
});


describe('projection computes a new representation without erasing its input', () => {
  it('keeps X available and can map distinct four-feature rows to the same two-feature result', () => {
    const before=DEFAULT_X.map(row=>[...row]);
    expect(matmul(DEFAULT_X, DEFAULT_WQ)).toEqual([[2,0],[0,2],[1,1]]);
    expect(DEFAULT_X).toEqual(before);
    const first=[[1,0,0,0]]; const third=[[0,0,1,0]];
    expect(first).not.toEqual(third);
    expect(matmul(first, DEFAULT_WQ)).toEqual([[1,0]]);
    expect(matmul(third, DEFAULT_WQ)).toEqual([[1,0]]);
  });
});
