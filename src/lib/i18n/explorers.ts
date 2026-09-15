/**
 * The words on the smaller explorers: positions, layer norm, the residual
 * path, the loss, beam search, the BLEU-against-cost chart and the two heads.
 *
 * Like labText.ts this is prose to be read, not interface chrome: each one says
 * what to move and what to watch for.
 */

import type { Locale } from './routing';

export interface ExplorerText {
  position: {
    title: string;
    kind: string;
    note: string;
    position: string;
    pair: string;
    pairs: [string, string];
    angle: string;
    row: string;
    slot: string;
    tryThis: string;
    turn: string;
  };
  layerNorm: {
    title: string;
    kind: string;
    note: string;
    values: string;
    addToAll: string;
    multiplyAll: string;
    gamma: string;
    beta: string;
    stages: [string, string, string];
    mean: string;
    variance: string;
    denominator: string;
    output: string;
    tryThis: string;
  };
  residual: {
    title: string;
    kind: string;
    note: string;
    skip: string;
    skipOn: string;
    skipOff: string;
    layer: string;
    input: string;
    similarity: string;
    tryThis: string;
  };
  loss: {
    title: string;
    kind: string;
    note: string;
    pCorrect: string;
    epsilon: string;
    guess: string;
    hard: string;
    soft: string;
    loss: string;
    curve: string;
    tryThis: string;
  };
  beam: {
    title: string;
    kind: string;
    note: string;
    width: string;
    widths: [string, string, string];
    result: string;
    probability: string;
    kept: string;
    step: string;
    tryThis: string;
  };
  bleuCost: {
    title: string;
    kind: string;
    note: string;
    pair: string;
    pairs: [string, string];
    tryThis: string;
  };
  heads: {
    title: string;
    kind: string;
    note: string;
    query: string;
    sentence: (q: number, h1: string, h2: string) => string;
    tryThis: string;
  };
}

const ko: ExplorerText = {
  position: {
    title: '위치 벡터 만들어 보기',
    kind: '실제 계산',
    note: '위치와 짝을 고르면 그 자리의 sin, cos 값이 실제로 계산되어 표의 칸과 곡선 위의 점에 같이 표시됩니다. d_model = 4 로 줄인 예제라 짝은 둘뿐이에요.',
    position: '위치',
    pair: '짝',
    pairs: ['빠른 쪽 (자리 0·1)', '느린 쪽 (자리 2·3)'],
    angle: '각도 = 위치 ÷ 나누는 수',
    row: '이 위치의 벡터',
    slot: '자리',
    tryThis: '위치를 0 부터 끝까지 움직여 보세요. 빠른 쪽은 값이 계속 바뀌는데, 느린 쪽으로 바꾸면 거의 움직이지 않습니다. 느린 쪽이 한 바퀴 도는 데 몇 위치가 필요한지 곡선 아래 숫자를 보세요.',
    turn: '한 바퀴',
  },
  layerNorm: {
    title: '한 줄을 직접 정규화해 보기',
    kind: '실제 계산',
    note: '네 값을 바꾸면 평균, 분산, 결과가 그 자리에서 다시 계산됩니다. γ 와 β 는 논문에서 자리마다 따로 학습되지만, 여기서는 네 자리에 같은 값을 씁니다.',
    values: '한 토큰의 값 네 개',
    addToAll: '네 값 모두에 더하기',
    multiplyAll: '네 값 모두에 곱하기',
    gamma: 'γ (곱하기)',
    beta: 'β (더하기)',
    stages: ['있는 그대로', '평균을 뺀 것', '흩어진 정도로 나눈 것'],
    mean: '평균',
    variance: '분산',
    denominator: '나누는 수 √(분산 + ε)',
    output: '결과 (γ 곱하고 β 더한 뒤)',
    tryThis: '네 값 모두에 5 를 더해 보세요. 결과가 하나도 안 바뀝니다. 모두에 3 을 곱해도 마찬가지예요. 정규화는 값의 크기와 위치를 지우고 서로의 관계만 남깁니다. 그다음 γ 를 바꿔 보면 그제야 결과의 폭이 달라져요.',
  },
  residual: {
    title: '건너뛰는 길을 껐다 켜 보기',
    kind: '실제 계산',
    note: '예제의 첫 토큰을 같은 feed forward 층에 여섯 번 통과시킵니다. 건너뛰는 길이 있으면 각 층은 LayerNorm(x + FFN(x)) 이고, 없으면 LayerNorm(FFN(x)) 이에요. W 는 앞에서 쓴 손으로 고른 값 그대로입니다.',
    skip: '건너뛰는 길',
    skipOn: '켬 (논문의 방식)',
    skipOff: '끔',
    layer: '층',
    input: '입력',
    similarity: '입력과 닮은 정도 (cos θ)',
    tryThis: '끄고 켜면서 맨 오른쪽 열을 비교해 보세요. 건너뛰는 길이 있으면 여섯 층을 지나도 입력과 같은 쪽을 향합니다(cos θ 가 양수). 없으면 4층부터 방향이 뒤집혀 음수가 돼요. 손으로 고른 작은 W 라 정도는 실제와 다르지만, 층을 쌓을수록 입력이 어디로 갈지 알 수 없어진다는 점은 같습니다.',
  },
  loss: {
    title: '틀린 정도를 직접 움직여 보기',
    kind: '실제 계산',
    note: '정답에 준 확률을 움직이면 나머지 세 확률은 비율을 유지한 채 합이 1 이 되도록 따라 움직입니다. 손실은 둘 다 그 자리에서 계산해요.',
    pCorrect: '정답에 준 확률',
    epsilon: 'ε (누그러뜨리는 정도)',
    guess: '모델의 짐작',
    hard: '정답 (있는 그대로)',
    soft: '정답 (누그러뜨린 것)',
    loss: '틀린 정도',
    curve: '정답 확률에 따른 −ln',
    tryThis: '정답 확률을 0.9 에서 0.1 로 내려 보세요. 손실이 조금씩이 아니라 점점 가파르게 커집니다. 곡선의 왼쪽 끝이 그 모양이에요. 그다음 ε 을 0 으로 두면 두 손실이 같아지고, 키울수록 누그러뜨린 쪽의 손실이 커집니다.',
  },
  beam: {
    title: '후보를 몇 개 들고 갈지 바꿔 보기',
    kind: '실제 계산',
    note: '장난감 모델에서 후보 수만 바꿔 가며 실제로 탐색합니다. 굵은 선이 그 설정에서 찾아낸 문장이에요.',
    width: '들고 가는 후보 수',
    widths: ['1개 (greedy)', '2개', '3개'],
    result: '찾은 문장',
    probability: '전체 확률',
    kept: '남긴 후보',
    step: '걸음',
    tryThis: '1개에서 2개로 바꿔 보세요. 첫 걸음에서 진 b 가 살아남아 끝까지 가고, 전체 확률이 0.2 에서 0.342 로 오릅니다. 3개로 늘리면 더 오르는지도 확인해 보세요. 이 예제에서는 오르지 않습니다.',
  },
  bleuCost: {
    title: '언어 쌍을 바꿔 보기',
    kind: '논문의 표 2',
    note: '점은 논문 표 2 의 값이고, 가로축은 저자들이 추산한 학습 계산량입니다. 이 페이지에서 계산한 값이 아니라 옮겨 적은 값이에요.',
    pair: '언어 쌍',
    pairs: ['영어 → 독일어', '영어 → 프랑스어'],
    tryThis: '프랑스어로 바꿔 보세요. 기본 모델은 점수가 다른 모델들보다 낮고, 큰 모델만 앞섭니다. 독일어에서는 둘 다 앞서요. 같은 구조라도 언어 쌍에 따라 결과가 다르다는 뜻입니다.',
  },
  heads: {
    title: '두 갈래가 보는 곳 비교하기',
    kind: '실제 계산',
    note: '보는 쪽 토큰을 고르면 두 갈래에서 그 토큰의 가중치 행이 함께 표시됩니다. 값은 앞의 예제를 그대로 계산한 것이에요.',
    query: '보는 쪽 토큰',
    sentence: (q, h1, h2) => `${q}번 토큰은 갈래 1 에서 ${h1} 을 보고, 갈래 2 에서는 ${h2} 을 봅니다.`,
    tryThis: '세 토큰을 차례로 골라 보세요. 갈래 1 은 항상 한 곳에 몰아주고, 갈래 2 는 두 곳에 나눠 줍니다. 두 갈래가 같은 곳을 보는 토큰은 하나도 없어요.',
  },
};

const en: ExplorerText = {
  position: {
    title: 'Build a position vector',
    kind: 'Actually computed',
    note: 'Pick a position and a pair and the sine and cosine for that slot are computed on the spot, shown both as a cell in the table and as a dot on the curve. The example is cut down to d_model = 4, so there are only two pairs.',
    position: 'position',
    pair: 'pair',
    pairs: ['fast pair (slots 0·1)', 'slow pair (slots 2·3)'],
    angle: 'angle = position ÷ divisor',
    row: 'the vector at this position',
    slot: 'slot',
    tryThis: 'Move the position from 0 to the end. The fast pair keeps changing; switch to the slow pair and it barely moves. Look under the curve for how many positions the slow pair needs for one full turn.',
    turn: 'one turn',
  },
  layerNorm: {
    title: 'Normalize a row yourself',
    kind: 'Actually computed',
    note: 'Change the four values and the mean, variance and result are recomputed here. In the paper γ and β are learned per slot; here one value applies to all four.',
    values: 'one token, four values',
    addToAll: 'add to all four',
    multiplyAll: 'multiply all four by',
    gamma: 'γ (multiply)',
    beta: 'β (add)',
    stages: ['as they are', 'minus the mean', 'divided by the spread'],
    mean: 'mean',
    variance: 'variance',
    denominator: 'divisor √(variance + ε)',
    output: 'output (after γ and β)',
    tryThis: 'Add 5 to all four values. Nothing in the result changes. Multiply all four by 3: still nothing. Normalization erases the size and the offset and keeps only how the values relate. Then change γ, and only then does the width of the result move.',
  },
  residual: {
    title: 'Switch the bypass off and on',
    kind: 'Actually computed',
    note: 'The first token of the example passes through the same feed-forward layer six times. With the bypass each layer is LayerNorm(x + FFN(x)); without it, LayerNorm(FFN(x)). The W are the hand-chosen values used earlier.',
    skip: 'bypass',
    skipOn: 'on (as in the paper)',
    skipOff: 'off',
    layer: 'layer',
    input: 'input',
    similarity: 'resemblance to the input (cos θ)',
    tryThis: 'Toggle it and compare the rightmost column. With the bypass the row still points the same way as the input after six layers (cos θ stays positive). Without it the direction flips from layer 4 on and goes negative. The hand-chosen W make the size of the effect unlike a real model, but the point is the same: the more layers, the less you can tell where the input has gone.',
  },
  loss: {
    title: 'Move the loss yourself',
    kind: 'Actually computed',
    note: 'Move the probability on the right word and the other three follow, keeping their proportions so the total stays 1. Both losses are computed here.',
    pCorrect: 'probability on the right word',
    epsilon: 'ε (how much to soften)',
    guess: 'what the model guessed',
    hard: 'the answer, as it is',
    soft: 'the answer, softened',
    loss: 'loss',
    curve: '−ln against the probability on the right word',
    tryThis: 'Take the probability from 0.9 down to 0.1. The loss does not grow evenly; it gets steeper and steeper. That is the left end of the curve. Then set ε to 0 and the two losses coincide; raise it and the softened one grows.',
  },
  beam: {
    title: 'Change how many candidates to carry',
    kind: 'Actually computed',
    note: 'The toy model is searched for real with each setting. The solid path is the sentence that setting finds.',
    width: 'candidates carried',
    widths: ['1 (greedy)', '2', '3'],
    result: 'sentence found',
    probability: 'probability overall',
    kept: 'kept',
    step: 'step',
    tryThis: 'Go from 1 to 2. The b that lost the first step survives to the end, and the overall probability rises from 0.2 to 0.342. Check whether 3 raises it further. In this example it does not.',
  },
  bleuCost: {
    title: 'Switch the language pair',
    kind: 'Table 2 of the paper',
    note: 'The points are Table 2 of the paper and the horizontal axis is the authors\' estimate of training cost. These are transcribed, not computed on this page.',
    pair: 'language pair',
    pairs: ['English → German', 'English → French'],
    tryThis: 'Switch to French. The base model scores below the earlier models there; only the big model is ahead. For German both are ahead. The same architecture, and a different picture per language pair.',
  },
  heads: {
    title: 'Compare where the two heads look',
    kind: 'Actually computed',
    note: 'Pick the looking token and its row of weights lights up in both heads. The values are the worked example, computed as before.',
    query: 'looking token',
    sentence: (q, h1, h2) => `Token ${q} looks at ${h1} in head 1 and at ${h2} in head 2.`,
    tryThis: 'Pick the three tokens in turn. Head 1 always piles onto one place; head 2 splits between two. No token has both heads looking at the same place.',
  },
};

export const EXPLORER_TEXT: Record<Locale, ExplorerText> = { ko, en };
