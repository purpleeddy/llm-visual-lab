import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { advanceLesson, lessonSnapshot, LESSON_INITIAL_IDS, LESSON_END_ID, LESSON_READOUT, LESSON_SETTINGS } from '../../src/lib/math/lessonGeneration';
import { DEFAULT_X, DEFAULT_ATTENTION_INPUT, defaultMultiHeadInput, LEARNING_EXAMPLE } from '../../src/lib/math/examples';
import { tinyDecoder, TOY_READOUT } from '../../src/lib/math/model';
import { computeAttention } from '../../src/lib/math/attention';
import { GenerationJourney } from '../../src/components/lab/GenerationJourney';

const closeRow = (actual: number[], expected: number[]) => {
  expect(actual).toHaveLength(expected.length);
  expected.forEach((value, i) => expect(actual[i]).toBeCloseTo(value, 12));
};

describe('one computed opening, from a two-token input to end', () => {
  it('starts with only two embeddings and omits positions while retaining the causal mask', () => {
    const run = lessonSnapshot();
    expect(LESSON_INITIAL_IDS).toEqual([0, 1]);
    expect(LESSON_SETTINGS).toEqual({ withPositions: false, masked: true });
    expect(run.tokenIds).toEqual([0, 1]);
    expect(run.lastPosition).toBe(1);
    expect(run.stages.embedding).toEqual([[1, 0, 1, 0], [0, 1, 0, 1]]);
    expect(run.stages.position).toEqual(run.stages.embedding);
    for (const matrix of Object.values(run.stages)) expect(matrix).toHaveLength(2);
    for (const head of run.attention.perHead) {
      expect(head.settings).toEqual({ scaled: true, masked: true });
      expect(head.allowed).toEqual([[true, false], [true, true]]);
    }
  });

  it('follows the last input through the very same first-head dot products and content mixture', () => {
    const run = lessonSnapshot();
    const head = run.attention.perHead[0];
    expect(head.Q[1]).toEqual([0, 2]);
    expect(head.K).toEqual([[0, 2], [2, 0]]);
    expect(head.KT).toEqual([[0, 2], [2, 0]]);
    expect(head.scores[1]).toEqual([4, 0]);
    closeRow(head.scaledScores[1], [4 / Math.sqrt(2), 0]);
    closeRow(head.weights[1], [0.9441927807928302, 0.055807219207169745]);
    expect(head.V).toEqual([[3, 0], [0, 3]]);
    closeRow(head.output[1], [2.8325783423784907, 0.16742165762150923]);
    closeRow(run.attention.perHead[1].output[1], [0.6697615493266569, 0.3302384506733431]);
    expect(run.workings.attentionResidual.norm.output).toEqual(run.stages['attention-residual']);
    expect(run.workings.feed.output).toEqual(run.stages['feed-forward']);
    expect(run.workings.ffnResidual.norm.output).toEqual(run.hidden);
  });

  it('pins the full-precision last hidden row, lesson readout and four computed probabilities', () => {
    const run = lessonSnapshot();
    closeRow(run.hidden[1], [0.5198688746033807, -0.5127241342959903, 1.313016522611544, -1.3201612629189343]);
    closeRow(run.logits[1], [-0.5198688746033807, -0.5127241342959903, 1.313016522611544, -1.3201612629189343]);
    closeRow(run.probabilities[1], [0.11483340001458396, 0.11565679279744225, 0.7179269189523142, 0.05158288823565955]);
    expect(run.stages.logits).toEqual(run.logits);
    expect(run.stages.probabilities).toEqual(run.probabilities);
    expect(run.probabilities[1].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(run.nextId).toBe(2);
  });

  it('appends the actual argmax, recomputes the longer prefix, then stops without an end embedding', () => {
    const first = lessonSnapshot();
    const append = advanceLesson(first);
    expect(append).toEqual({ tokenId: 2, finished: false, tokenIds: [0, 1, 2] });
    expect(append.tokenId).toBe(first.probabilities[first.lastPosition].indexOf(Math.max(...first.probabilities[first.lastPosition])));
    const second = lessonSnapshot(append.tokenIds);
    expect(second.lastPosition).toBe(2);
    closeRow(second.hidden[2], [1.176701939896977, 0, -1.568925460464159, 0.3922235205671821]);
    closeRow(second.probabilities[2], [0.10287327217478509, 0.3336857905593299, 0.06949635762362182, 0.4939445796422633]);
    expect(second.stages.logits).toEqual(second.logits);
    expect(second.stages.probabilities).toEqual(second.probabilities);
    expect(second.nextId).toBe(LESSON_END_ID);
    expect(advanceLesson(second)).toEqual({ tokenId: 3, finished: true, tokenIds: [0, 1, 2] });
    expect(DEFAULT_X).toHaveLength(3);
    expect(() => lessonSnapshot([0, 1, 2, 3])).toThrow(RangeError);
    expect(first.tokenIds).toEqual([0, 1]);
    expect(lessonSnapshot().tokenIds).toEqual([0, 1]);
  });

  it('keeps the previous position invariant when a later token is appended', () => {
    const before = lessonSnapshot();
    const after = lessonSnapshot(advanceLesson(before).tokenIds);
    for (const stage of Object.keys(before.stages) as (keyof typeof before.stages)[]) {
      expect(after.stages[stage][1]).toEqual(before.stages[stage][1]);
    }
    after.attention.perHead.forEach((head, i) => {
      expect(head.output[1]).toEqual(before.attention.perHead[i].output[1]);
      expect(head.weights[1][2]).toBe(0);
    });
  });

  it('does not mutate default coefficients or change the independent three-token exercise', () => {
    const source = JSON.stringify({ DEFAULT_X, DEFAULT_ATTENTION_INPUT, multi: defaultMultiHeadInput(), TOY_READOUT, LESSON_READOUT });
    const defaultRun = tinyDecoder();
    const input = [0, 1];
    lessonSnapshot(input);
    lessonSnapshot([0, 1, 2]);
    expect(input).toEqual([0, 1]);
    expect(JSON.stringify({ DEFAULT_X, DEFAULT_ATTENTION_INPUT, multi: defaultMultiHeadInput(), TOY_READOUT, LESSON_READOUT })).toBe(source);
    expect(tinyDecoder()).toEqual(defaultRun);
    expect(TOY_READOUT).toEqual([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]);
    expect(computeAttention(DEFAULT_ATTENTION_INPUT).scores[0]).toEqual([0, 4, 2]);
    expect(lessonSnapshot().attention.perHead[0].scores[1]).toEqual([4, 0]);
  });

  it.each(['ko', 'en'] as const)('%s: the opening previews a computed choice outside its two actual inputs', locale => {
    const html = renderToStaticMarkup(createElement(GenerationJourney, { locale }));
    const input = html.match(/data-journey-input="[^"]*"[\s\S]*?<ol/)!;
    expect(input).not.toBeNull();
    expect(input[0]).toContain('data-token-id="0"');
    expect(input[0]).toContain('data-token-id="1"');
    expect(input[0]).not.toContain('data-token-id="2"');
    expect(input[0]).not.toContain(LEARNING_EXAMPLE[locale].tokens[2]);
    expect(html).toContain('data-journey-preview');
    expect(html.indexOf('data-journey-preview')).toBeGreaterThan(html.indexOf('</ol>'));
    expect(html).toContain(LEARNING_EXAMPLE[locale].tokens[2]);
    expect(html).toContain('data-journey-probabilities');
    expect(html).toContain('71.8%');
    expect(html).toContain('data-mode="overview"');
    expect(html).toContain('data-progress="1/3"');
    expect(html).not.toContain('70%');
    expect(html).not.toContain('<table');
    expect(html).toContain('data-stage="purpose"');
    expect(html).toContain('data-prefix="0,1"');
    expect(html).toContain(locale === 'ko' ? '위치 계산을 생략' : 'position calculation omitted');
  });
});
