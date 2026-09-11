/**
 * The step-by-step guidance in the attention lab.
 *
 * Unlike the interface strings in ui.ts, this is prose meant to be read: what
 * to change, what to watch, and why the numbers move the way they do.
 */

import type { AttentionStep } from '../math/attention';
import type { Locale } from './routing';

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
    what: '출발점은 토큰 세 개입니다. 각 토큰은 숫자 네 개로 된 줄 하나로 들어와요. 그 세 줄을 위아래로 쌓은 것이 입력 행렬 X이고, 크기는 3 × 4입니다. 아래 세 개의 W는 이 네 개의 숫자를 각각 다른 방식으로 섞어서 Query, Key, Value를 만드는 가중치예요. 지금은 학습 대신 손으로 고른 값이 들어 있습니다.',
    tryThis: 'X의 첫 줄 맨 앞 숫자를 1에서 3으로 바꿔 보세요. 그리고 다음 단계로 넘어가서 Q의 첫 줄이 어떻게 달라졌는지 확인해 보세요.',
    why: '한 토큰의 입력 숫자는 그 토큰에서 나오는 Query, Key, Value 세 줄 모두에 영향을 줍니다. 세 줄이 모두 같은 X의 한 줄에서 출발하기 때문이에요. 그래서 입력 한 칸을 바꾸면 점수 행렬의 한 칸이 아니라 한 줄 전체와 한 칸 열 전체가 같이 움직입니다.',
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
    what: '점수를 √d_k로 나눕니다. 여기서 d_k는 Query와 Key의 길이인 2이고, √2는 약 1.414예요. 논문이 식 (1)에 이 나눗셈을 넣어 둔 자리입니다.',
    tryThis: '오른쪽의 "√d_k로 나누기"를 껐다 켜 보세요. 점수가 √2배로 커졌다 작아지는 것과, 다음 단계의 확률이 얼마나 달라지는지 함께 보세요.',
    why: '나눗셈은 점수의 순서를 바꾸지 않아요. 크던 것은 여전히 크고 작던 것은 여전히 작습니다. 바뀌는 것은 점수들 사이의 간격이에요. 간격이 좁아지면 다음 단계의 확률이 한쪽으로 덜 쏠립니다. d_k가 커질수록 내적에 더해지는 항이 많아져서 점수가 저절로 커지는데, 논문은 각주에서 그 분산이 d_k에 비례한다고 설명하고 √d_k로 나누어 이 커짐을 되돌립니다.',
  },
  mask: {
    what: 'Mask는 봐서는 안 되는 자리를 막습니다. 가산 mask 행렬 M을 점수에 더하는데, 허용하는 자리에는 0을, 막는 자리에는 −∞를 넣어요. 지금 기본값은 mask가 꺼져 있어서 모든 토큰이 서로를 볼 수 있습니다.',
    tryThis: '"Causal mask"를 켜 보세요. 오른쪽 위 삼각형이 −∞로 막히는 것을 확인한 뒤, 다음 단계에서 첫 줄의 확률이 어떻게 되는지 보세요.',
    why: '−∞를 더하면 다음 단계에서 exp(−∞) = 0이 되어 그 자리의 확률이 정확히 0이 됩니다. 곱해서 0으로 만드는 대신 더해서 −∞로 만드는 이유가 여기 있어요. softmax를 통과한 뒤에 0으로 만들면 나머지 확률의 합이 1이 되지 않지만, softmax 앞에서 막으면 남은 자리끼리 다시 정확히 1로 나누어 가집니다. Mask를 켜면 첫 줄은 볼 수 있는 자리가 자기 자신 하나뿐이라 확률이 1이 돼요.',
  },
  softmax: {
    what: '점수를 확률로 바꿉니다. 각 점수에 지수를 취해 모두 양수로 만든 다음, 그 줄의 합으로 나눠요. 결과 A의 각 줄은 합이 정확히 1이 되고, 이제 "이 토큰이 각 자리를 얼마나 볼지"의 비율이 됩니다.',
    tryThis: '세 번째 줄을 보세요. 점수가 2, 2, 2로 모두 같아서 확률이 0.333씩 똑같이 나뉩니다. 그다음 첫 줄과 비교해 보세요.',
    why: '지수는 큰 점수를 훨씬 더 크게 벌립니다. 첫 줄의 점수는 0, 4, 2로 차이가 4밖에 안 되는데 확률은 0.045, 0.768, 0.187로 벌어져요. 그리고 한 줄의 모든 확률은 같은 분모를 나눠 씁니다. 그래서 한 점수만 올려도 그 자리만 커지는 게 아니라 나머지 자리가 함께 줄어들어요. 점수 세 개에 모두 같은 수를 더하면 분자와 분모가 같은 배수로 커져서 확률은 하나도 바뀌지 않습니다.',
  },
  output: {
    what: '마지막으로 확률을 가중치 삼아 V의 줄들을 섞습니다. O의 첫 줄은 V의 세 줄을 0.045, 0.768, 0.187의 비율로 더한 것이에요. 이 O가 attention 한 번의 결과이고, 다음 층으로 넘어갑니다.',
    tryThis: 'O의 세 번째 줄 칸을 눌러 보세요. 세 확률이 모두 1/3이므로 결과가 V 세 줄의 평균인 1.333이 되는 것을 확인해 보세요.',
    why: '출력의 한 칸은 V의 같은 열에 있는 세 값을 확률로 가중평균한 값입니다. 확률의 합이 1이기 때문에 이것은 평균이고, V의 값들 사이를 벗어나지 않아요. 어느 한 확률이 1에 가까우면 출력은 그 줄에 가까워지고, 확률이 고르면 출력은 가운데로 모입니다. 그래서 attention은 "고르는" 것과 "섞는" 것 사이 어디쯤을 하는 계산이에요.',
  },
};

const en: Record<AttentionStep, StepText> = {
  input: {
    what: 'We start with three tokens. Each one arrives as a row of four numbers. Stack those three rows and you get the input matrix X, which is 3 × 4. The three W matrices below are the weights that mix those four numbers in three different ways to produce a Query, a Key and a Value. Here they hold values chosen by hand rather than learned.',
    tryThis: 'Change the first number of the first row of X from 1 to 3. Then step forward and look at what happened to the first row of Q.',
    why: "One token's input numbers feed all three of the rows that come out of it, because Query, Key and Value all start from the same row of X. So changing a single input cell moves an entire row and an entire column of the score matrix, not just one cell.",
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
    what: 'Divide the scores by √d_k. Here d_k is the length of a Query or Key, which is 2, so √2 is about 1.414. This is exactly the division the paper puts inside equation (1).',
    tryThis: 'Switch "Divide by √d_k" off and on. Watch the scores grow and shrink by a factor of √2, and watch how much the probabilities on the next step change with them.',
    why: 'Dividing never changes the order of the scores: whatever was largest stays largest. What changes is the gaps between them. Narrower gaps mean the next step spreads its probability more evenly. As d_k grows, a dot product sums more terms and drifts larger on its own — the paper’s footnote works out that its variance is d_k — and dividing by √d_k undoes that growth.',
  },
  mask: {
    what: 'A mask blocks positions that must not be seen. We add a mask matrix M to the scores: 0 where a position is allowed, −∞ where it is blocked. By default the mask is off here, so every token can see every other token.',
    tryThis: 'Turn "Causal mask" on. Watch the upper-right triangle fill with −∞, then step forward and see what happens to the probabilities in the first row.',
    why: 'Adding −∞ makes exp(−∞) = 0 on the next step, so that position gets exactly zero probability. That is why the paper adds a mask instead of multiplying one in afterwards. Zeroing entries after the softmax would leave the remaining probabilities summing to less than 1; blocking before it lets the surviving positions divide up a full 1 again. With the mask on, the first row can only see itself, so its probability is 1.',
  },
  softmax: {
    what: 'Now the scores become probabilities. Each score goes through an exponential, which makes every value positive, and then each is divided by the sum for that row. Every row of A adds to exactly 1, and now reads as how much of each position this token will take.',
    tryThis: 'Look at the third row. Its scores are 2, 2 and 2 — all equal — so the probabilities come out 0.333 each. Then compare it with the first row.',
    why: 'The exponential pulls larger scores much further ahead. The first row’s scores are only 4 apart (0, 4, 2), yet the probabilities spread to 0.045, 0.768 and 0.187. And every probability in a row shares one denominator, so raising a single score does not just lift that position — it pushes the others down. Add the same number to all three scores and numerator and denominator grow by the same factor, so nothing changes at all.',
  },
  output: {
    what: 'Finally the probabilities are used as weights to blend the rows of V. The first row of O is the three rows of V added in the proportions 0.045, 0.768 and 0.187. That O is the result of one attention step, and it moves on to the next layer.',
    tryThis: 'Click a cell in the third row of O. All three probabilities are 1/3, so the result is the plain average of V’s three rows: 1.333.',
    why: 'Each output cell is a weighted average of the three values in that column of V. Because the weights sum to 1 it really is an average, and it can never land outside the range of those values. When one probability is near 1 the output sits close to that row; when the probabilities are even it settles in the middle. Attention lives somewhere between picking one thing and mixing everything.',
  },
};

export const LAB_TEXT: Record<Locale, Record<AttentionStep, StepText>> = { ko, en };
