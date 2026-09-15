/**
 * Interface strings, kept apart from the prose in the MDX.
 * The calculations, the example data and the diagrams are shared across
 * languages and live elsewhere.
 */

import type { Locale } from './routing';
import {
  EN_CALC_ERRORS,
  EN_MATRIX_NAMES,
  type CalcErrorCode,
  type MatrixKey,
} from '../math/errors';

export interface UIStrings {
  siteTitle: string;
  siteTagline: string;
  skipToContent: string;
  nav: {
    paper: string;
    math: string;
    openMenu: string;
    closeMenu: string;
    onThisPage: string;
    contents: string;
    course: string;
    /** Shown beside a learning-path group that has no documents yet */
    inPreparation: string;
    previous: string;
    next: string;
    sectionPaper: string;
    sectionMath: string;
  };
  theme: { label: string; light: string; dark: string; system: string };
  language: { label: string; ko: string; en: string };
  repo: { star: string; label: string };
  status: {
    complete: string;
    partial: string;
    planned: string;
    plannedNote: string;
    completeNote: string;
    partialNote: string;
  };
  paperRef: { label: string; version: string };
  lab: {
    title: string;
    kind: string;
    kindNote: string;
    reset: string;
    resetDone: string;
    step: string;
    stepOf: string;
    prevStep: string;
    nextStep: string;
    steps: Record<string, { name: string }>;
    scaling: string;
    scalingOn: string;
    scalingOff: string;
    masking: string;
    maskingOn: string;
    maskingOff: string;
    inputs: string;
    inputsHint: string;
    editX: string;
    editWQ: string;
    editWK: string;
    editWV: string;
    selectedCell: string;
    noSelection: string;
    selectHint: string;
    cellFormula: string;
    row: string;
    col: string;
    token: string;
    /** Row label for one token. `{n}` is the 1-based position. */
    tokenLabel: string;
    query: string;
    key: string;
    value: string;
    blocked: string;
    allowed: string;
    sum: string;
    product: string;
    term: string;
    score: string;
    shifted: string;
    expValue: string;
    probability: string;
    weightedSum: string;
    error: string;
    /** One sentence per calculation-error code. `{placeholders}` are filled from the error. */
    errors: Record<CalcErrorCode, string>;
    /** Display names for the matrices an error can be about */
    matrixNames: Record<MatrixKey, string>;
    tryThis: string;
    observation: string;
    whatChanged: string;
    dimensions: string;
    readAsTable: string;
    hideTable: string;
  };
  math: {
    matrixProduct: string;
    dotProduct: string;
    softmax: string;
    selectOutputCell: string;
    rowTimesColumn: string;
    resultIs: string;
    increase: string;
    decrease: string;
    addToAll: string;
    scores: string;
    probabilities: string;
    position: string;
  };
  footer: { sourceNote: string; paperLink: string; scopeNote: string };
}

const ko: UIStrings = {
  siteTitle: 'LLM Visual Lab',
  siteTagline: '논문을 읽고, 필요한 수학을 배우고, 직접 계산해 보는 언어 모델 위키',
  skipToContent: '본문으로 건너뛰기',
  nav: {
    paper: 'Attention Is All You Need',
    math: '수학 기초',
    openMenu: '메뉴 열기',
    closeMenu: '메뉴 닫기',
    onThisPage: '이 문서의 차례',
    contents: '차례',
    course: '학습 과정',
    inPreparation: '준비중',
    previous: '이전',
    next: '다음',
    sectionPaper: '논문 해설',
    sectionMath: '필요한 수학',
  },
  theme: { label: '테마', light: '밝게', dark: '어둡게', system: '시스템' },
  language: { label: '언어', ko: '한국어', en: 'English' },
  repo: { star: 'Star', label: 'GitHub 저장소에 별 주기 (새 창)' },
  status: {
    complete: '작성 완료',
    partial: '일부 작성',
    planned: '이후 단계',
    plannedNote: '아직 쓰지 않았습니다. 이후 단계에서 설명합니다.',
    completeNote: '이번 단계에서 작성하고 검수했습니다.',
    partialNote: '전체 그림에 필요한 만큼만 설명했고, 자세한 내용은 이후 단계에서 다룹니다.',
  },
  paperRef: { label: '원문 위치', version: '기준 판본' },
  lab: {
    title: 'Attention 계산 실험',
    kind: '작은 예제의 실제 계산',
    kindNote:
      '아래 숫자는 화면에서 직접 계산한 값입니다. 학습으로 얻은 가중치가 아니라 손으로 고른 작은 정수이고, 각 벡터가 단어의 뜻을 담고 있지도 않습니다.',
    reset: '처음 값으로 되돌리기',
    resetDone: '처음 값으로 되돌렸습니다.',
    step: '단계',
    stepOf: '/',
    prevStep: '이전 단계',
    nextStep: '다음 단계',
    steps: {
      input: { name: '입력' },
      project: { name: '투영' },
      scores: { name: '점수' },
      scale: { name: '나누기' },
      mask: { name: '가리기' },
      softmax: { name: '확률' },
      output: { name: '가중합' },
    },
    scaling: '√dₖ 로 나누기',
    scalingOn: '켬 (논문의 방식)',
    scalingOff: '끔',
    masking: 'Causal mask',
    maskingOn: '켬 (decoder 방식)',
    maskingOff: '끔 (encoder 방식)',
    inputs: '입력값 바꾸기',
    inputsHint: '숫자를 바꾸면 아래의 모든 계산과 그림이 같이 바뀝니다.',
    editX: '입력 X (토큰 × d_model)',
    editWQ: 'W_Q (d_model × d_k)',
    editWK: 'W_K (d_model × d_k)',
    editWV: 'W_V (d_model × d_v)',
    selectedCell: '선택한 칸',
    noSelection: '선택한 칸이 없습니다.',
    selectHint: '결과 행렬의 칸을 누르면 그 칸이 어떤 곱셈의 합인지 아래에 펼쳐집니다.',
    cellFormula: '계산 과정',
    row: '행',
    col: '열',
    token: '토큰',
    tokenLabel: '토큰 {n}',
    query: 'Query',
    key: 'Key',
    value: 'Value',
    blocked: '차단',
    allowed: '허용',
    sum: '합',
    product: '곱',
    term: '항',
    score: '점수',
    shifted: '최댓값을 뺀 값',
    expValue: '지수',
    probability: '확률',
    weightedSum: '가중합',
    error: '계산할 수 없습니다',
    errors: {
      emptyRows: '{matrix}에 행이 없습니다.',
      emptyCols: '{matrix}에 열이 없습니다.',
      raggedRow: '{matrix}의 {row}번째 행은 값이 {length}개인데 첫 행은 {expected}개입니다.',
      nonFinite: '{matrix}의 {row}행 {col}열 값이 숫자가 아닙니다.',
      matmulMismatch:
        '이 둘은 곱할 수 없습니다. 왼쪽은 {aRows}×{aCols}, 오른쪽은 {bRows}×{bCols} 입니다. 왼쪽의 열 수와 오른쪽의 행 수가 같아야 합니다.',
      matmulShape: '이 모양끼리는 곱할 수 없습니다.',
      cellOutOfRange: '{row}행 {col}열은 결과 행렬 밖입니다.',
      dotLengthMismatch: '이 두 벡터는 내적할 수 없습니다. 길이가 {a} 와 {b} 로 다릅니다.',
      maskLengthMismatch: 'mask 는 {maskLength}개인데 점수는 {scoreLength}개입니다.',
      rowFullyBlocked:
        '{row}번째 행의 모든 위치가 차단되었습니다. softmax 의 분모가 0이 되어 확률을 정의할 수 없습니다. 각 행에서 최소한 한 위치는 열어 두어야 합니다.',
      projectionMismatch:
        '{matrix} 의 행 수({wRows})가 X 의 열 수({xCols}, 즉 d_model)와 달라 X·{matrix} 를 계산할 수 없습니다.',
      qkDimMismatch:
        'W_Q 의 열 수({qCols})와 W_K 의 열 수({kCols})가 달라 Q 와 K 의 내적을 계산할 수 없습니다. 둘 다 d_k 여야 합니다.',
      noHeads: 'Multi-head attention 은 갈래가 최소 하나는 있어야 합니다.',
      headOutputMismatch:
        '{head}번째 갈래가 내놓는 벡터의 길이가 {got} 인데 첫 갈래는 {expected} 입니다. 결과를 이어 붙이려면 모든 갈래의 d_v 가 같아야 합니다.',
      outputProjectionMismatch:
        '이어 붙인 결과의 너비는 {concatCols} 인데 W_O 의 행 수는 {woRows} 라서 곱할 수 없습니다. W_O 의 행 수는 h × d_v 여야 합니다.',
      oddModelWidth:
        '위치 표현은 sin·cos 을 짝으로 묶어 쓰기 때문에 d_model 이 짝수여야 합니다. 지금은 {dModel} 입니다.',
      vectorLengthMismatch: '{what} 의 길이가 {got} 인데 {expected} 이어야 합니다.',
      zeroVariance:
        '이 행의 값이 전부 같아서 분산이 0 입니다. 0 으로 나눌 수 없어 정규화할 수 없습니다.',
      emptyDistribution: '확률 분포가 비어 있을 수는 없습니다.',
      targetOutOfRange: '정답 위치가 {target} 인데 분포의 크기는 {size} 입니다.',
    },
    matrixNames: {
      left: '왼쪽 행렬',
      right: '오른쪽 행렬',
      X: '입력 X',
      W_Q: 'W_Q',
      W_K: 'W_K',
      W_V: 'W_V',
    },
    tryThis: '이렇게 해 보세요',
    observation: '무엇을 볼까요',
    whatChanged: '왜 그렇게 될까요',
    dimensions: '크기',
    readAsTable: '숫자 표로 보기',
    hideTable: '숫자 표 접기',
  },
  math: {
    matrixProduct: '행렬곱',
    dotProduct: '내적',
    softmax: 'Softmax',
    selectOutputCell: '결과의 칸을 고르세요',
    rowTimesColumn: '왼쪽의 행 × 오른쪽의 열',
    resultIs: '결과',
    increase: '올리기',
    decrease: '내리기',
    addToAll: '모든 점수에 더하기',
    scores: '점수',
    probabilities: '확률',
    position: '위치',
  },
  footer: {
    sourceNote: '해설의 근거는 논문 원문입니다.',
    paperLink: 'arXiv:1706.03762 (v7, 2023-08-02)',
    scopeNote: '이 위키는 작성 중입니다. 문서마다 완성 범위를 표시합니다.',
  },
};

const en: UIStrings = {
  siteTitle: 'LLM Visual Lab',
  siteTagline: 'Reading the paper, learning the math it needs, and running the numbers yourself',
  skipToContent: 'Skip to content',
  nav: {
    paper: 'Attention Is All You Need',
    math: 'Math foundations',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    onThisPage: 'On this page',
    contents: 'Contents',
    course: 'Learning path',
    inPreparation: 'in preparation',
    previous: 'Previous',
    next: 'Next',
    sectionPaper: 'Paper walkthrough',
    sectionMath: 'Math you will need',
  },
  theme: { label: 'Theme', light: 'Light', dark: 'Dark', system: 'System' },
  language: { label: 'Language', ko: '한국어', en: 'English' },
  repo: { star: 'Star', label: 'Star the repository on GitHub (opens in a new tab)' },
  status: {
    complete: 'Written',
    partial: 'Partly written',
    planned: 'Later stage',
    plannedNote: 'Not written yet. A later stage covers it.',
    completeNote: 'Written and reviewed in this stage.',
    partialNote: 'Covered only as far as the overall picture needs. A later stage goes deeper.',
  },
  paperRef: { label: 'In the paper', version: 'Version used' },
  lab: {
    title: 'Attention, computed',
    kind: 'A small example, actually computed',
    kindNote:
      'These numbers are computed on this page. They are small integers chosen by hand, not weights from training, and none of these vectors carries the meaning of a word.',
    reset: 'Reset to starting values',
    resetDone: 'Reset to the starting values.',
    step: 'Step',
    stepOf: 'of',
    prevStep: 'Previous step',
    nextStep: 'Next step',
    steps: {
      input: { name: 'Inputs' },
      project: { name: 'Project' },
      scores: { name: 'Scores' },
      scale: { name: 'Divide' },
      mask: { name: 'Mask' },
      softmax: { name: 'Weights' },
      output: { name: 'Weighted sum' },
    },
    scaling: 'Divide by √dₖ',
    scalingOn: 'On (as in the paper)',
    scalingOff: 'Off',
    masking: 'Causal mask',
    maskingOn: 'On (decoder)',
    maskingOff: 'Off (encoder)',
    inputs: 'Change the inputs',
    inputsHint: 'Change a number and every calculation and picture below follows it.',
    editX: 'Input X (tokens × d_model)',
    editWQ: 'W_Q (d_model × d_k)',
    editWK: 'W_K (d_model × d_k)',
    editWV: 'W_V (d_model × d_v)',
    selectedCell: 'Selected cell',
    noSelection: 'No cell selected.',
    selectHint: 'Choose a cell in a result matrix to see which products add up to it.',
    cellFormula: 'How it is computed',
    row: 'row',
    col: 'column',
    token: 'Token',
    tokenLabel: 'Token {n}',
    query: 'Query',
    key: 'Key',
    value: 'Value',
    blocked: 'blocked',
    allowed: 'allowed',
    sum: 'sum',
    product: 'product',
    term: 'term',
    score: 'score',
    shifted: 'minus the largest',
    expValue: 'exponential',
    probability: 'probability',
    weightedSum: 'weighted sum',
    error: 'This cannot be computed',
    // The same wording the maths layer throws, so there is one copy of it.
    errors: EN_CALC_ERRORS,
    matrixNames: EN_MATRIX_NAMES,
    tryThis: 'Try this',
    observation: 'What to watch',
    whatChanged: 'Why it changes',
    dimensions: 'Size',
    readAsTable: 'Read as a table of numbers',
    hideTable: 'Hide the table',
  },
  math: {
    matrixProduct: 'Matrix product',
    dotProduct: 'Dot product',
    softmax: 'Softmax',
    selectOutputCell: 'Pick a cell of the result',
    rowTimesColumn: 'a row on the left × a column on the right',
    resultIs: 'Result',
    increase: 'Raise',
    decrease: 'Lower',
    addToAll: 'Add to every score',
    scores: 'Scores',
    probabilities: 'Probabilities',
    position: 'Position',
  },
  footer: {
    sourceNote: 'Every claim here is checked against the paper itself.',
    paperLink: 'arXiv:1706.03762 (v7, 2 Aug 2023)',
    scopeNote: 'This wiki is in progress. Each page states how far it has been written.',
  },
};

export const UI: Record<Locale, UIStrings> = { ko, en };

export function t(locale: Locale): UIStrings {
  return UI[locale];
}
