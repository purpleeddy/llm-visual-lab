/**
 * The step-by-step guidance in the attention lab.
 *
 * Unlike the interface strings in ui.ts, this is prose meant to be read: what
 * to change, what to watch, and why the numbers move the way they do.
 */

import type { AttentionResult, AttentionStep } from '../math/attention';
import type { Locale } from './routing';
import { fmt, fmtCompact } from '../math/format';

export interface StepText {
  /** What happens at this step */
  what: string;
  /** Something for the reader to try */
  tryThis: string;
  /** What that change shows, and why it comes out that way */
  why: string;
}

const ko: Record<AttentionStep, StepText> = {
  input: {
    what: '앞에서 조회한 나는 / 학교에 / 갔다의 벡터 세 행이 입력 X입니다. 처음값은 같은 3 × 4 표예요. 각 계수 표를 곱해 비교에 쓸 Q·K와 전달할 V를 만듭니다. 이 실습의 기본 설정은 세 위치를 모두 볼 수 있도록 가리기를 꺼 두었습니다.',
    tryThis: 'X의 첫 줄 맨 앞 숫자를 1에서 3으로 바꿔 보세요. 그리고 다음 단계로 넘어가서 Q의 첫 줄이 어떻게 달라졌는지 확인해 보세요.',
    why: '같은 입력 행에서 Q·K·V가 각각 계산됩니다. 한 입력 칸을 바꾸면 해당 토큰의 비교값과 전달값이 바뀔 수 있습니다. 따라서 그 토큰이 보는 점수 행과 다른 토큰이 그 토큰을 보는 점수 열에도 영향을 줄 수 있어요.',
  },
  project: {
    what: 'X에 W를 곱해서 Q, K, V를 만듭니다. 토큰마다 숫자 네 개였던 것이 두 개로 줄었어요. 같은 토큰에서 세 개의 다른 줄이 나오는데, 각각 역할이 다릅니다. Q는 "내가 무엇을 찾고 있는지", K는 "내가 무엇을 가지고 있는지", V는 "내가 실제로 전달할 내용"이에요.',
    tryThis: 'Q의 칸 하나를 눌러 보세요. 그 칸이 X의 어느 줄과 W_Q의 어느 열에서 나왔는지, 그리고 어떤 곱셈들을 더한 값인지가 아래에 펼쳐집니다.',
    why: 'Q의 (1행, 1열) 한 칸은 X의 1행 네 개와 W_Q의 1열 네 개를 짝지어 곱한 뒤 모두 더한 값입니다. 네 번의 곱셈과 세 번의 덧셈이 한 칸을 만들어요. 행렬곱은 이 계산을 모든 행과 열의 조합에 대해 한꺼번에 하는 것뿐입니다.',
  },
  scores: {
    what: '이제 Q의 각 줄을 K의 모든 줄과 하나씩 내적합니다. 결과 S는 3 × 3이고, S의 (i, j) 칸은 "i번째 토큰이 j번째 토큰을 얼마나 볼 만한가"를 나타내는 점수예요. 아직 확률이 아니라 크기를 견주기 위한 숫자입니다.',
    tryThis: 'S의 첫 줄 세 칸을 차례로 눌러 보세요. 0, 4, 2라는 세 점수가 각각 어떤 곱셈에서 나왔는지 비교해 보세요.',
    why: '내적은 두 줄의 방향이 얼마나 맞는지를 재는 계산이에요. 첫 번째 토큰의 Query는 (2, 0)이고 두 번째 토큰의 Key는 (2, 0)이라 같은 방향을 가리켜서 점수가 4로 가장 큽니다. 첫 번째 Key는 (0, 2)라 방향이 어긋나 점수가 0이 되고요. 세 번째 줄은 세 점수가 모두 2로 같은데, 이 경우가 뒤에서 중요해집니다.',
  },
  scale: {
    what: 'Query와 Key에 들어 있는 숫자의 개수 d_k=2를 확인합니다. 그 제곱근 √2≈1.414로 점수를 나눕니다. 여기서 숫자의 개수는 벡터의 기하학적 길이 |q|와 다른 뜻입니다.',
    tryThis: '"계산 설정"을 열고 "√d_k로 나누기"를 껐다 켜 보세요. 점수가 √2배로 커졌다 작아지는 것과, 다음 단계의 확률이 얼마나 달라지는지 함께 보세요.',
    why: '양수로 나누므로 점수 순서는 같고 간격이 좁아집니다. 뒤의 softmax가 한쪽으로 쏠리는 정도가 줄 수 있어요. 논문의 설명은 각 성분이 서로 독립이고 평균 0·분산 1이라는 가정에서 내적 점수의 분산이 d_k가 된다는 것입니다. 모든 입력에서 점수 크기를 1로 만드는 보장은 아닙니다.',
  },
  mask: {
    what: 'Mask는 봐서는 안 되는 자리를 막습니다. 가산 mask 행렬 M을 점수에 더하는데, 허용하는 자리에는 0을, 막는 자리에는 −∞를 넣어요. 지금 기본값은 mask가 꺼져 있어서 모든 토큰이 서로를 볼 수 있습니다.',
    tryThis: '"계산 설정"에서 "Causal mask"를 켜 보세요. 오른쪽 위 삼각형이 −∞로 막히는 것을 확인한 뒤, 다음 단계에서 첫 줄의 확률이 어떻게 되는지 보세요.',
    why: '−∞를 더하면 다음 단계에서 exp(−∞) = 0이 되어 그 자리의 확률이 정확히 0이 됩니다. 곱해서 0으로 만드는 대신 더해서 −∞로 만드는 이유가 여기 있어요. softmax를 통과한 뒤에 0으로 만들면 나머지 확률의 합이 1이 되지 않지만, softmax 앞에서 막으면 남은 자리끼리 다시 정확히 1로 나누어 가집니다. Mask를 켜면 첫 줄은 볼 수 있는 자리가 자기 자신 하나뿐이라 확률이 1이 돼요.',
  },
  softmax: {
    what: '점수를 확률로 바꿉니다. 허용된 유한 점수의 지수식은 양수이고, 가려진 −∞의 지수값은 0입니다. 그 줄의 합으로 나눠요. 결과 A의 각 줄은 합이 정확히 1이 되고, 이제 "이 토큰이 각 자리를 얼마나 볼지"의 비율이 됩니다.',
    tryThis: '세 번째 줄을 보세요. 점수가 2, 2, 2로 모두 같아서 비중이 정확히 1/3씩 나뉩니다. 화면의 0.333은 반올림한 값입니다. 그다음 첫 줄과 비교해 보세요.',
    why: '기본 설정에서는 점수 (0, 4, 2)를 먼저 √2로 나눈 뒤 softmax를 계산해 약 (0.045, 0.768, 0.187)을 얻습니다. 모든 값은 같은 분모를 사용하므로 점수 하나를 올리면 다른 위치의 비중도 바뀝니다. 모든 점수에 같은 수를 더하면 지수값과 합이 같은 배수로 변해 비중은 같습니다.',
  },
  output: {
    what: '비중 A를 사용해 V의 행을 섞습니다. 첫 출력 행은 V의 세 행을 약 (0.045, 0.768, 0.187)의 비중으로 더한 결과예요. 이 출력은 각 입력 위치의 새 표현이며, 다음 단어의 확률은 아닙니다.',
    tryThis: 'O의 세 번째 줄 칸을 눌러 보세요. 세 확률이 모두 1/3이므로 결과가 V 세 줄의 평균인 1.333이 되는 것을 확인해 보세요.',
    why: '출력의 한 칸은 V의 같은 열에 있는 세 값을 확률로 가중평균한 값입니다. 확률의 합이 1이기 때문에 이것은 평균이고, V의 값들 사이를 벗어나지 않아요. 어느 한 확률이 1에 가까우면 출력은 그 줄에 가까워지고, 확률이 고르면 출력은 가운데로 모입니다. 그래서 attention은 "고르는" 것과 "섞는" 것 사이 어디쯤을 하는 계산이에요.',
  },
};

const en: Record<AttentionStep, StepText> = {
  input: {
    what: 'X contains the three vectors looked up for I / went / to school, with the same 3 × 4 starting values. Each weight matrix creates Q and K for comparison, or V for transfer. The default here leaves the causal mask off so all three positions can be compared.',
    tryThis: 'Change the first number of the first row of X from 1 to 3. Then step forward and look at what happened to the first row of Q.',
    why: 'Q, K and V are computed from the same input row. Editing a cell can change that token’s comparison and transfer values, affecting both its score row and the score column where other tokens compare with it.',
  },
  project: {
    what: 'Multiplying X by each W gives Q, K and V. Each token went from four numbers to two. Three different rows come out of the same token, and each has its own job: Q is what this token is looking for, K is what it has to offer, and V is what it will actually pass along.',
    tryThis: 'Click a cell of Q. The panel below opens up which row of X and which column of W_Q it came from, and which products were added to make it.',
    why: 'The cell at row 1, column 1 of Q pairs the four numbers in row 1 of X with the four numbers in column 1 of W_Q, multiplies each pair, and adds them: four multiplications and three additions for one cell. A matrix product just does that for every row-and-column pairing at once.',
  },
  scores: {
    what: 'Now each row of Q meets every row of K in a dot product. The result S is 3 × 3, and the cell at (i, j) scores how much token i should look at token j. It is not a probability yet — just a number for comparing.',
    tryThis: 'Click the three cells of the first row of S in turn, and compare which products produced the scores 0, 4 and 2.',
    why: 'A dot product measures how well two rows line up. The first token’s Query is (2, 0) and the second token’s Key is (2, 0) — the same direction — so that score is 4, the largest. The first Key is (0, 2), pointing across, so that score is 0. Notice that the third row scores 2 against everything; that will matter shortly.',
  },
  scale: {
    what: 'Each Query and Key contains d_k=2 values. Divide scores by √2≈1.414. This coordinate count is distinct from the geometric vector length |q|.',
    tryThis: 'Open "Calculation settings" and switch "Divide by √d_k" off and on. Watch the scores grow and shrink by a factor of √2, and watch how much the probabilities on the next step change with them.',
    why: 'Dividing by a positive value preserves rank and narrows score gaps, which can reduce softmax concentration. Under the paper’s assumptions of independent, zero-mean, unit-variance components, dot-product variance is d_k. This is not a guarantee that every score becomes size 1.',
  },
  mask: {
    what: 'A mask blocks positions that must not be seen. We add a mask matrix M to the scores: 0 where a position is allowed, −∞ where it is blocked. By default the mask is off here, so every token can see every other token.',
    tryThis: 'Open "Calculation settings" and turn "Causal mask" on. Watch the upper-right triangle fill with −∞, then step forward and see what happens to the probabilities in the first row.',
    why: 'Adding −∞ makes exp(−∞) = 0 on the next step, so that position gets exactly zero probability. That is why the paper adds a mask instead of multiplying one in afterwards. Zeroing entries after the softmax would leave the remaining probabilities summing to less than 1; blocking before it lets the surviving positions divide up a full 1 again. With the mask on, the first row can only see itself, so its probability is 1.',
  },
  softmax: {
    what: 'Now the scores become probabilities. The exponential of allowed finite scores is positive; a blocked −∞ becomes zero. Divide by the sum for that row. Every row of A adds to exactly 1, and now reads as how much of each position this token will take.',
    tryThis: 'Look at the third row. Its scores are 2, 2 and 2 — all equal — so the probabilities come out 0.333 each. Then compare it with the first row.',
    why: 'The default divides scores (0, 4, 2) by √2 before softmax, producing about (0.045, 0.768, 0.187). All entries share a denominator, so changing one score affects the other weights. Adding the same number to every score multiplies both numerator and denominator equally and preserves the weights.',
  },
  output: {
    what: 'Use A to mix rows of V. The first output is a mixture with weights about (0.045, 0.768, 0.187). These are new representations of the input positions, not next-token probabilities.',
    tryThis: 'Click a cell in the third row of O. All three probabilities are 1/3, so the result is the plain average of V’s three rows: 1.333.',
    why: 'Each output cell is a weighted average of the three values in that column of V. Because the weights sum to 1 it really is an average, and it can never land outside the range of those values. When one probability is near 1 the output sits close to that row; when the probabilities are even it settles in the middle. Attention lives somewhere between picking one thing and mixing everything.',
  },
};

export const LAB_TEXT: Record<Locale, Record<AttentionStep, StepText>> = { ko, en };

/** Guidance reads the same current calculation as the tables, including edited inputs. */
export function attentionStepText(locale: Locale, step: AttentionStep, result: AttentionResult): StepText {
  const text = { ...LAB_TEXT[locale][step] };
  const ko = locale === 'ko';
  const vector = (row: number[], compact = false) => `(${row.map(v => compact ? fmtCompact(v) : fmt(v)).join(', ')})`;
  const firstScores = vector(result.scores[0], true);
  const last = result.dims.n - 1;
  if (step === 'input') {
    text.what = ko
      ? '앞에서 조회한 나는 / 학교에 / 갔다의 벡터 세 행이 입력 X입니다. 각 계수 표를 곱해 비교에 쓸 Q·K와 전달할 V를 만듭니다.'
      : 'X contains the three vectors for I / went / to school. Each weight matrix creates Q and K for comparison, or V for transfer.';
    text.tryThis = ko ? '아래 입력값 접기를 열고 X의 첫 칸을 1에서 3으로 바꿔 보세요. 다음 단계에서 Q의 첫 행을 비교하세요.' : 'Open the inputs below and change the first cell of X from 1 to 3. Compare the first row of Q on the next step.';
  }
  if (step === 'scores') {
    text.tryThis = ko ? `S의 첫 행 세 칸을 눌러 현재 점수 ${firstScores}의 곱셈을 비교하세요.` : `Click the first-row cells of S to compare the products behind the current scores ${firstScores}.`;
    text.why = ko ? `현재 Q의 첫 행은 ${vector(result.Q[0], true)}입니다. K의 각 행과 내적하면 첫 점수 행 ${firstScores}가 됩니다. 마지막 점수 행은 ${vector(result.scores[last], true)}입니다. 방향뿐 아니라 벡터의 크기도 점수에 영향을 줍니다.` : `The current first row of Q is ${vector(result.Q[0], true)}. Dot products with the rows of K produce ${firstScores}. The last score row is ${vector(result.scores[last], true)}. Both direction and vector magnitude affect the score.`;
  }
  if (step === 'scale') {
    text.what = ko ? `Q와 K의 행마다 숫자가 d_k=${result.dims.dK}개입니다. 현재 ${result.settings.scaled ? `√${result.dims.dK}≈${fmt(Math.sqrt(result.dims.dK))}로 점수를 나눕니다` : '나누기를 끈 상태입니다'}. 숫자의 개수와 기하학적 길이 |q|는 다릅니다.` : `Each Q and K row has d_k=${result.dims.dK} coordinates. ${result.settings.scaled ? `Divide scores by √${result.dims.dK}≈${fmt(Math.sqrt(result.dims.dK))}.` : 'The divisor is currently off.'} Coordinate count differs from geometric length |q|.`;
  }
  if (step === 'mask') {
    text.what = ko ? `점수에 mask M을 더합니다. 허용하는 자리는 0, 막는 자리는 −∞입니다. 현재 미래 가리기가 ${result.settings.masked ? '켜져 있습니다' : '꺼져 있습니다'}.` : `Add mask M to the scores: 0 where allowed, −∞ where blocked. The causal mask is currently ${result.settings.masked ? 'on' : 'off'}.`;
  }
  if (step === 'softmax') {
    text.tryThis = ko ? `마지막 행의 현재 점수 ${vector(result.maskedScores[last])}가 비중 ${vector(result.weights[last])}로 바뀝니다. 첫 행과 비교하세요. 표시값은 반올림했습니다.` : `The last row’s current scores ${vector(result.maskedScores[last])} become weights ${vector(result.weights[last])}. Compare them with the first row. Displayed values are rounded.`;
    text.why = ko ? `현재 첫 행의 softmax 입력은 ${vector(result.maskedScores[0])}, 결과 비중은 ${vector(result.weights[0])}입니다. 가려진 점수 −∞의 비중은 0이고, 각 행의 비중 합은 1입니다. 모든 비중은 같은 분모를 사용하므로 점수 하나를 바꾸면 다른 비중도 달라질 수 있습니다.` : `The current first-row softmax input is ${vector(result.maskedScores[0])}, producing weights ${vector(result.weights[0])}. A blocked score of −∞ becomes weight 0, and each row sums to 1. All weights share a denominator, so changing one score can also change the others.`;
  }
  if (step === 'output') {
    text.what = ko ? `첫 출력 행은 V의 행을 현재 비중 ${vector(result.weights[0])}로 섞어 만든 ${vector(result.output[0])}입니다. 각 입력 위치의 새 표현이며 다음 토큰의 확률은 아닙니다.` : `The first output row mixes V’s rows with the current weights ${vector(result.weights[0])}, giving ${vector(result.output[0])}. These are new position representations, not next-token probabilities.`;
    text.tryThis = ko ? `O의 마지막 행을 눌러 현재 비중 ${vector(result.weights[last])}가 출력 ${vector(result.output[last])}를 만드는 곱셈을 확인하세요.` : `Click the last row of O to inspect how the current weights ${vector(result.weights[last])} produce ${vector(result.output[last])}.`;
  }
  return text;
}


/* ------------------------------------------------------------------ */
/* The big-picture walk: one frame per step of the route, in prose.    */

export const WALK_STEPS = ['tokens', 'row', 'block', 'position', 'encoder', 'decoder', 'probs'] as const;
export type WalkStep = (typeof WALK_STEPS)[number];

export interface WalkStepText {
  /** The chip label on the rail */
  name: string;
  /** What happens at this step */
  what: string;
  /** Short operations corresponding to the numbered decoder picture. */
  points?: readonly string[];
  /** What to look at in the picture */
  watch: string;
}

export interface WalkText {
  title: string;
  kind: string;
  kindNote: string;
  /** Labels drawn inside the picture */
  fig: {
    sentence: string;
    token: string;
    id: string;
    row: string;
    really512: string;
    block: string;
    posRows: string;
    stillSame: string;
    layer: string;
    attention: string;
    feedForward: string;
    maskedAttention: string;
    crossAttention: string;
    rowsIn: string;
    rowsOut: string;
    valuesChanged: string;
    toNextLayer: string;
    oneOfSix: [string, string];
    everyLayer: string;
    thisRow: string;
    notPerRow: string;
    inPartTwo: string;
    outputSoFar: string;
    outputSoFarFrom: string;
    roundN: string;
    appended: string;
    notYet: string;
    fromEncoder: string;
    nextWordProbs: string;
    vocabCount: string;
    attnProbs: string;
    tokenCount: string;
    map: {
      inputs: string;
      outputs: string;
      embed: string;
      position: string;
      encoder: string;
      decoder: string;
      times: string;
      head: string;
      probs: string;
      now: string;
      loop: string;
    };
  };
  steps: Record<WalkStep, WalkStepText>;
}

const walkKo: WalkText = {
  title: '원래 논문의 번역 구조 따라가기',
  kind: '개념 도식',
  kindNote:
    '공통 문장의 3 × 4 계산과 구분한 번역 구조 도식입니다. 설명용 영어 예문 다섯 조각과 논문 기본 설정의 폭 512를 보여 줍니다. ID와 확률은 도식을 위해 정한 예시이며 실제 토크나이저나 모델을 실행한 결과가 아닙니다.',
  fig: {
    sentence: '문장',
    token: '토큰',
    id: '번호',
    row: '숫자 한 줄',
    really512: '실제로는 512칸',
    block: '줄 5개 × 512칸 = 덩어리 하나',
    posRows: '위치마다 다른 줄',
    stillSame: '더해도 5 × 512 그대로',
    layer: '층',
    attention: 'attention',
    feedForward: 'feed forward',
    maskedAttention: '가려진 attention',
    crossAttention: 'encoder 를 보는 attention',
    rowsIn: '줄 5개 들어감',
    rowsOut: '줄 5개 나옴',
    valuesChanged: '값만 달라짐',
    toNextLayer: '다음 층으로',
    oneOfSix: ['이 중 하나를', '크게 그린 것'],
    everyLayer: '매 층마다 원문을 봄',
    thisRow: '지금 쓰는 자리의 줄',
    notPerRow: '줄마다 하나씩이 아니라, 이 줄 하나에서',
    inPartTwo: '② 에서, 이 줄이 원문을 보는 비율',
    outputSoFar: '지금까지 만든 출력',
    outputSoFarFrom: '앞 회들의 확률 장면(7) 결과',
    roundN: '3회째',
    appended: '뒤에 붙여 Decoder 장면(6)으로',
    notYet: '아직 없음 → 가림',
    fromEncoder: 'encoder 의 줄 5개',
    nextWordProbs: '다음 단어의 확률',
    vocabCount: '후보 = 어휘 전체 (수만 개)',
    attnProbs: 'attention 안의 확률',
    tokenCount: '후보 = 토큰 5개',
    map: {
      inputs: '입력 문장',
      outputs: '지금까지의 출력',
      embed: 'embedding',
      position: '위치 ⊕',
      encoder: 'Encoder',
      decoder: 'Decoder',
      times: '× 6',
      head: 'Linear · Softmax',
      probs: '다음 단어 확률',
      now: '지금 여기',
      loop: '되풀이',
    },
  },
  steps: {
    tokens: {
      name: '토큰',
      what: '컴퓨터는 글자를 모르니 먼저 문장을 조각으로 잘라야 합니다. 단어보다 작은 조각으로 자르는 건, 처음 보는 단어도 아는 조각들로 쓸 수 있게 하려는 거예요. 예문 "The animal didn\'t cross" 는 다섯 조각이 됩니다. didn\'t 가 did 와 n\'t 로 나뉜 것을 보세요.',
      watch: '토큰 수를 세어 두세요. encoder 안에서는 이 원문 토큰 수 5가 유지됩니다. decoder의 행 수는 지금까지 만든 출력 토큰 수로 따로 정해집니다.',
    },
    row: {
      name: '한 줄',
      what: '번호로 embedding 표의 한 행을 찾습니다. 이 번역 도식에서는 토큰마다 512개 값을 사용합니다. 공통 수치 실습의 네 값과 개수가 다른 것은 설정이 달라서예요. 그림의 작은 칸 일곱 개는 그 512개를 축약해 그린 것입니다.',
      watch: '토큰 하나에 줄 하나. 그림은 일곱 칸만 그렸지만 실제로는 512칸이에요.',
    },
    block: {
      name: '덩어리',
      what: '이 모델은 다섯 단어를 차례로가 아니라 한꺼번에 계산하기로 했지요. 그러려면 다섯 줄을 한 묶음으로 다뤄야 합니다. 그래서 다섯 줄을 위아래로 붙여 쌓아 5 × 512 크기의 덩어리 하나로 만들고, 앞으로는 이 덩어리 단위로 계산을 진행해요.',
      watch: '줄의 수 5 는 토큰의 수이고, 칸의 수 512 는 토큰 하나를 나타내는 숫자의 개수입니다.',
    },
    position: {
      name: '위치 ⊕',
      what: '문제가 하나 있어요. 이 모델은 다섯 줄을 한꺼번에 보기 때문에, 덩어리만 봐서는 어느 줄이 첫째 단어이고 어느 줄이 둘째 단어인지 알 수 없습니다. 공통 예시의 나는 / 학교에 / 갔다도 행의 값만으로는 각 조각이 어느 위치에 놓였는지 알려 주지 않습니다. 그래서 위치마다 다른 숫자 512개짜리 줄을 만들어, 같은 자리의 줄에 칸마다 더합니다. 이 줄이 "너는 첫째, 너는 둘째" 라는 표시입니다.',
      watch: '더하고 나면 각 줄에 "무슨 단어인지" 와 "몇 번째인지" 가 함께 들어 있어서, 뒤의 계산이 순서를 알 수 있습니다. 옆에 이어 붙이지 않고 더하는 건 줄의 길이를 512 로 그대로 두기 위해서예요. 위치를 어떤 숫자로 만드는지는 "위치" 절에서 봅니다.',
    },
    encoder: {
      name: 'Encoder',
      what: '지금 각 줄에는 자기 단어와 자기 위치만 들어 있어요. 그런데 "it" 이 무엇인지는 "animal" 을 봐야 알 수 있듯, 단어의 뜻은 주변 단어에 달려 있습니다. 그래서 덩어리를 encoder 에 넣습니다. 그림 왼쪽이 encoder 의 층 하나를 크게 그린 거예요. 덩어리가 아래에서 들어와 attention 을 먼저 지나고(각 줄이 다른 모든 줄을 보고 필요한 정보를 섞어 옴), 그 결과가 feed forward 로 들어갑니다(줄마다 따로 한 번 더 다듬음). 논문의 기본 설정에서는 오른쪽처럼 같은 구조의 층을 여섯 개 둡니다. 층마다 다른 계수를 학습합니다. 앞 층이 낸 덩어리가 그대로 다음 층에 들어갑니다. 모든 원문 위치는 첫 attention부터 비교할 수 있습니다. 층을 더하면 앞 층이 만든 표현을 다시 계산할 수 있습니다.',
      watch: '들어갈 때 줄 5개, 나올 때도 줄 5개입니다. 달라지는 건 각 줄의 값이에요. 들어갈 때는 "자기 단어" 만 담고 있던 줄이, 나올 때는 문장 전체를 본 뒤의 값이 됩니다.',
    },
    decoder: {
      name: 'Decoder',
      what: "번역의 세 번째 생성 회차입니다. 시작 표시·그·동물은의 세 행이 들어갑니다. 첫 회차에는 시작 표시만 들어갑니다.",
      points: [
        "가려진 attention — 이미 쓴 출력 위치끼리 섞습니다. 빗금은 아직 쓰지 않은 위치입니다. 학습에서는 정답을 한 칸 민 입력에 미래 가리기를 적용합니다.",
        "encoder를 보는 attention — decoder 세 행이 점선으로 들어오는 원문의 다섯 행을 참고합니다.",
        "feed forward — 출력 자리마다 따로 계산합니다. 여섯 층 모두 원문을 참고하며 출력 세 행을 유지합니다."
],
      watch: '①은 뒤를 못 보게 막고, ②는 원문을 봅니다. 이 둘이 encoder 와 다른 점이에요.',
    },
    probs: {
      name: '확률',
      what: 'decoder 를 다 지나면 줄이 여러 개 나옵니다. 그중 맨 마지막 줄, 즉 지금 쓰고 있는 자리의 줄 하나만 꺼내요. 그림 아래에 강조된 줄이 그것입니다. 이 줄을 Linear · Softmax 에 넣으면 어휘에 있는 단어마다 "다음 단어가 이것일 확률" 이 하나씩 나오고, 왼쪽 그래프가 그 결과예요. 여기서는 "길을" 이 0.62 로 가장 높아서 다음 단어가 됩니다. 이 단어를 지금까지 만든 출력 뒤에 붙이고 Decoder 장면으로 돌아가서 다음 단어를 또 만들어요. 앞의 "그", "동물은" 도 이렇게 나온 것입니다.',
      watch: '오른쪽의 작은 그래프는 다른 것입니다. Decoder 장면의 ② 에서 "동물은" 줄이 원문의 다섯 토큰을 각각 얼마나 봤는지예요. 이것도 합이 1 인 확률이지만, 밖으로 나오는 결과가 아니라 계산 중간의 값입니다. "확률" 이라는 말이 두 군데 쓰이니 둘을 섞지 마세요.',
    },
  },
};

const walkEn: WalkText = {
  title: 'Follow the paper’s translation architecture',
  kind: 'Conceptual sketch',
  kindNote:
    'A translation-architecture sketch, separate from the shared 3 × 4 calculation. It uses five illustrative English chunks and the paper’s base width of 512. IDs and probabilities are examples, not actual tokenizer or model outputs.',
  fig: {
    sentence: 'Sentence',
    token: 'Token',
    id: 'Id',
    row: 'A row of numbers',
    really512: 'really 512 cells',
    block: '5 rows × 512 cells = one matrix',
    posRows: 'one row per position',
    stillSame: 'still 5 × 512 after adding',
    layer: 'layer',
    attention: 'attention',
    feedForward: 'feed forward',
    maskedAttention: 'masked attention',
    crossAttention: 'attention over the encoder',
    rowsIn: '5 rows in',
    rowsOut: '5 rows out',
    valuesChanged: 'only the values changed',
    toNextLayer: 'to the next layer',
    oneOfSix: ['one of these,', 'drawn large'],
    everyLayer: 'every layer reads it',
    thisRow: 'the row being written',
    notPerRow: 'from this one row, not one per row',
    inPartTwo: 'one row of ②, over the source',
    outputSoFar: 'output so far',
    outputSoFarFrom: 'earlier rounds of the Probabilities frame (7)',
    roundN: 'round 3',
    appended: 'appended → Decoder frame (6)',
    notYet: 'not yet → masked',
    fromEncoder: 'the encoder\'s 5 rows',
    nextWordProbs: 'probability of the next word',
    vocabCount: 'candidates = whole vocabulary (tens of thousands)',
    attnProbs: 'inside attention',
    tokenCount: 'candidates = the 5 tokens',
    map: {
      inputs: 'input sentence',
      outputs: 'output so far',
      embed: 'embedding',
      position: 'position ⊕',
      encoder: 'Encoder',
      decoder: 'Decoder',
      times: '× 6',
      head: 'Linear · Softmax',
      probs: 'next-word probabilities',
      now: 'you are here',
      loop: 'again',
    },
  },
  steps: {
    tokens: {
      name: 'Tokens',
      what: 'A computer cannot read letters, so the sentence is cut into pieces first. The pieces are smaller than words so that a word never seen before can still be written with known pieces. "The animal didn\'t cross" becomes five pieces. Notice that didn\'t splits into did and n\'t.',
      watch: 'Count the tokens. The encoder keeps these five source rows. The decoder has a separate row count: its output tokens so far.',
    },
    row: {
      name: 'A row',
      what: 'Use an ID to retrieve an embedding row. This translation sketch uses 512 values per token, unlike the four-value numerical example. The difference is the chosen width. Seven drawn cells stand for all 512 values.',
      watch: 'One token, one row. Seven cells are drawn; the paper’s base model uses 512.',
    },
    block: {
      name: 'A matrix',
      what: 'This model handles the five words at once rather than in turn, so the five rows have to travel as one bundle. Stack them on top of each other and you have one matrix, 5 × 512. From here on the calculation works on this matrix.',
      watch: 'The number of rows, 5, is the number of tokens. The number of cells, 512, is how many numbers describe one token.',
    },
    position: {
      name: '⊕ position',
      what: 'There is a problem. This model looks at all five rows at once, so from the matrix alone it cannot tell which row is the first word and which the second. "The dog bit the man" and "The man bit the dog" have the same tokens; without order they are the same. So a different row of 512 numbers is made for each position and added, cell by cell, to the row in that position. That row is the mark that says "you are first, you are second".',
      watch: 'Once added, each row carries both "which word" and "which position", so everything downstream can tell the order. It is added rather than stuck on the end so the row stays 512 long. What numbers stand for a position is worked out in the positions section.',
    },
    encoder: {
      name: 'Encoder',
      what: 'Right now each row holds only its own word and its own position. But a word\'s meaning depends on its neighbours, the way "it" can only be resolved by looking at "animal". So the matrix goes into the encoder. The left of the picture is one encoder layer, drawn large. The matrix enters at the bottom and goes through attention first (every row looks at every other row and mixes in what it needs), and that result goes into feed forward (worked over once more, one row at a time). The paper’s base model chooses six blocks of this structure. Each learns different coefficients. The matrix one layer puts out goes straight into the next. All source positions are accessible from the first attention; later blocks can transform the preceding block’s representations further.',
      watch: '5 rows go in and 5 rows come out. What changes is the values: a row that went in holding only "its own word" comes out holding what it found by looking at the whole sentence.',
    },
    decoder: {
      name: 'Decoder',
      what: "This is the third generation round: three input rows for the start mark, Das and Tier. The first round contains only the start mark.",
      points: [
        "Masked attention: mix known output positions. During training, shift the target sequence right by one position, starting with the start mark; the mask hides later inputs. Hatching here marks unwritten positions.",
        "Encoder attention: the three decoder rows read the five source rows on the dashed line.",
        "Feed forward: transform each output position separately. All six layers read the source and keep three output rows."
],
      watch: '① blocks the view forward; ② reads the source. Those two are what make the decoder differ from the encoder.',
    },
    probs: {
      name: 'Probabilities',
      what: 'Take the final decoder row at the current output position and transform it into vocabulary scores, then probabilities. In this illustrative German output, überquerte has the largest value, 0.62, after Das Tier. Append it and return to the decoder. These chosen probabilities illustrate the loop, not a trained translation result.',
      watch: 'The small chart on the right is a different thing. It is how much the "Tier" row looked at each of the five source tokens in part ② of the Decoder frame. It also sums to 1, but it is a value in the middle of the calculation, not an output. The word "probability" is used in both places; keep them apart.',
    },
  },
};

export const WALK_TEXT: Record<Locale, WalkText> = { ko: walkKo, en: walkEn };
