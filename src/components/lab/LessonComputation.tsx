import type { Locale } from '../../lib/i18n/routing';
import { lessonSnapshot, type LessonSnapshot } from '../../lib/math/lessonGeneration';
import { LEARNING_EXAMPLE, FFN_W1, FFN_W2, FFN_B1, FFN_B2 } from '../../lib/math/examples';
import { fmt, fmtCompact, fmtPercent } from '../../lib/math/format';
import { cellDerivation } from '../../lib/math/matrix';
import { crossEntropy, oneHot } from '../../lib/math/training';
import { MatrixGrid } from './MatrixGrid';
import { LessonToken as Token, LessonNumbers, LessonProbabilities, LessonContributions } from './LessonPrimitives';
import '../../styles/journey.css';
import '../../styles/lesson.css';

export const LESSON_STAGES = ['tokens', 'projection', 'comparison', 'transpose', 'scores', 'shares', 'aggregation', 'attention', 'mask', 'heads', 'residual', 'feed-forward', 'hidden', 'readout', 'loss'] as const;
export type LessonStage = typeof LESSON_STAGES[number];
const titles: Record<Locale, string[]> = {
  ko: ['두 입력을 숫자로', '네 값에서 비교 기준 두 값으로', '같은 자리끼리 곱해서 점수 하나', '같은 비교를 행과 열로', '현재 줄에서 두 참고 자리의 점수로', '두 점수에서 두 참고 비중으로', '참고 비중으로 내용을 모으기', '방금 계산한 세 역할: Q · K · V', '이미 적용한 가리기 살펴보기', '같은 입력을 두 갈래로 보고 합치기', 'attention 출력과 원래 입력을 더하기', '정규화한 표현을 토큰 안에서 변환하기', '다시 더하고 정규화한 마지막 표현', '마지막 표현에서 다음 어휘의 확률로', '같은 예측을 정답과 비교하기'],
  en: ['Two inputs become numbers', 'Four values become two comparison values', 'Matching products make one score', 'The same comparison as row times column', 'One current row, two reference scores', 'Two scores become two reference shares', 'Gather content using those shares', 'Name the three roles: Q · K · V', 'Inspect the mask already in use', 'Two heads read the same input, then join', 'Add attention output to the original input', 'Transform the normalized representation within each token', 'Add and normalize to get the final representation', 'The final representation becomes vocabulary probabilities', 'Compare this prediction with its target'],
};
const numbers = (values: number[], precision = 3) => `(${values.map(value => fmtCompact(value, precision)).join(', ')})`;
const equation = (left: number[], right: number[]) => left.map((value, i) => `${fmtCompact(value)} × ${fmtCompact(right[i])}`).join(' + ');

/** A section opens directly at its calculation; it has no stepper or private defaults. */
export function LessonComputation({ locale, stage, snapshot }: { locale: Locale; stage: LessonStage; snapshot?: LessonSnapshot }) {
  const run = snapshot ?? lessonSnapshot();
  const ko = locale === 'ko';
  const ids = run.tokenIds;
  const row = run.lastPosition;
  const head = run.attention.perHead[0];
  const names = ids.map(id => LEARNING_EXAMPLE[locale].tokens[id]);
  const title = titles[locale][LESSON_STAGES.indexOf(stage)];
  const vector = (values: number[], name: string) => <div className="lesson-value" data-lesson-value={name}><span>{name}</span><LessonNumbers locale={locale} values={values} label={name} /></div>;
  const lastRow = (matrix: number[][], name: string) => vector(matrix[row], name);
  return <section className="lesson-computation" aria-label={title} data-lesson-stage={stage} data-lesson-prefix={ids.join(',')} data-lesson-focus={ids[row]} data-lesson-position={run.settings.withPositions ? 'on' : 'off'} data-lesson-mask="on">
    {stage === 'tokens' && <>
      <div className="lesson-rows" data-lesson-embedding>{ids.map((id, i) => <div key={id}><span><Token id={id} locale={locale} /> · ID {id}</span><span aria-hidden="true">→</span><LessonNumbers locale={locale} values={run.stages.embedding[i]} label={names[i]} data-embedding-id={id} /></div>)}</div>
      <p>{ko ? '벡터 두 행을 쌓은 행렬 X: 2 × 4. 각 행의 네 값은 순서대로 유지합니다.' : 'Stack two vector rows to form matrix X: 2 × 4. Keep the four entries in each row in order.'}</p>
    </>}
    {stage === 'projection' && <>
      {lastRow(run.stages.position, ko ? '마지막 입력 네 값' : 'Four values of the final input')}
      <div className="lesson-projections">{head.Q[row].map((value, j) => <div key={j} data-projection-coordinate={j}>
        {vector(head.WQ.map(values => values[j]), ko ? `${j + 1}번째 출력의 고정 계수` : `Fixed coefficients for output ${j + 1}`)}
        <p className="lesson-equation">{equation(head.X[row], head.WQ.map(values => values[j]))} = <strong>{fmtCompact(value)}</strong></p>
      </div>)}</div>
      {vector(head.Q[row], ko ? '다음 비교에 넘길 기준' : 'Comparison values passed onward')}
      <p>{ko ? '참고할 자리도 같은 입력에서 숫자를 꺼내되, 다른 고정 계수로 바꿉니다.' : 'Reference values come from the same input, transformed using another fixed coefficient table.'}</p>
      <div className="lesson-reference-values">{head.K.map((key, i) => <div key={i}><Token id={ids[i]} locale={locale} /><LessonNumbers locale={locale} values={key} label={ko ? '참고 숫자' : 'Reference values'} /></div>)}</div>
      <details className="expand"><summary>{ko ? '참고할 두 자리의 숫자도 준비하기' : 'Prepare comparison values for both references'}</summary><div className="expand__body"><MatrixGrid matrix={head.WK} name={ko ? '참고 숫자를 만드는 계수' : 'Reference coefficients'} compact />{head.K.map((key, i) => <div key={i}><Token id={ids[i]} locale={locale} />{key.map((value, j) => <p key={j}>{equation(head.X[i], head.WK.map(values => values[j]))} = {fmtCompact(value)}</p>)}</div>)}</div></details>
    </>}
    {stage === 'comparison' && <>
      {vector(head.Q[row], ko ? '방금 만든 기준' : 'The comparison values just produced')}
      <div className="lesson-comparisons">{ids.map((id, j) => <div key={id} data-reference-id={id}><Token id={id} locale={locale} />{vector(head.K[j], ko ? '참고 숫자' : 'Reference values')}<p className="lesson-equation">{equation(head.Q[row], head.K[j])} = <strong data-lesson-score>{fmtCompact(head.scores[row][j])}</strong></p></div>)}</div>
      <p>{ko ? '같은 자리끼리 곱해 더하는 계산을 내적이라고 부릅니다. 두 참고 자리에서 점수 두 개가 나왔습니다.' : 'Multiplying matching entries and adding is a dot product. Two reference positions produce two scores.'}</p>
    </>}
    {stage === 'transpose' && <>
      <div className="journey__pair journey__pair--column"><div><Token id={ids[row]} locale={locale} focus /><LessonNumbers locale={locale} values={head.Q[row]} label={ko ? '기준 행' : 'Current row'} /></div><span aria-hidden="true">×</span><div><Token id={ids[0]} locale={locale} /><span className="journey__column" data-lesson-transposed>{head.K[0].map((value, i) => <span key={i}>{fmtCompact(value)}</span>)}</span></div><span aria-hidden="true">=</span><strong>{fmtCompact(head.scores[row][0])}</strong></div>
      <p>{ko ? '오른쪽 숫자의 순서와 곱하는 짝을 유지한 채 줄을 세웁니다. 행과 열을 바꾸는 전치 뒤에도 점수는 같습니다.' : 'Stand the right row up without changing the order or pairings. Transposing rows and columns preserves the score.'}</p>
    </>}
    {stage === 'scores' && <>
      {vector(head.Q[row], ko ? '현재 기준 한 줄' : 'One current comparison row')}
      <div className="lesson-reference-columns">{ids.map((id, j) => <div key={id}><Token id={id} locale={locale} /><span className="journey__column">{head.KT.map((values, feature) => <span key={feature}>{fmtCompact(values[j])}</span>)}</span><strong data-lesson-score>{fmtCompact(head.scores[row][j])}</strong></div>)}</div>
      {vector(head.scores[row], ko ? '다음 단계에 넘길 점수' : 'Scores passed to the next stage')}
    </>}
    {stage === 'shares' && <>
      {vector(head.scores[row], ko ? '앞에서 받은 점수' : 'Scores received from the preceding stage')}
      <div className="lesson-rows">{ids.map((id, j) => <div key={id}><Token id={id} locale={locale} /><span>{fmtCompact(head.scores[row][j])} ÷ √2 = {fmtCompact(head.scaledScores[row][j])}</span><strong data-lesson-share>{fmtPercent(head.weights[row][j], 1)}</strong></div>)}</div>
      <p>{ko ? '숫자 두 개씩 비교했으므로 √2로 나눕니다. 이어서 softmax가 두 점수를 합이 1인 참고 비중으로 바꿉니다.' : 'Each comparison used two values, so divide by √2. Softmax then turns the scores into reference shares summing to 1.'}</p>
      <details className="expand"><summary>{ko ? 'softmax의 곱셈 전 값 보기' : 'See the full-precision softmax values'}</summary><div className="expand__body">{head.softmax[row].terms.map((term, i) => <p key={i}>{names[i]}: exp({fmt(term.shifted!, 6)}) / {fmt(head.softmax[row].sumExp, 6)} = {fmt(term.probability, 6)}</p>)}</div></details>
    </>}
    {stage === 'aggregation' && <>
      <details className="expand"><summary>{ko ? '가져올 내용의 계산' : 'Calculate the content values'}</summary><div className="expand__body">
      <p>{ko ? '가져올 내용도 입력에 고정 계수를 곱해 만듭니다. 이제 이 내용을 앞에서 구한 비중으로 모읍니다.' : 'Fixed coefficients also transform the input into content. Retrieve that content using the shares just calculated.'}</p>
      <div className="lesson-comparisons">{head.V.map((values, i) => <div key={i}><Token id={ids[i]} locale={locale} />{values.map((value, j) => <p className="lesson-equation" key={j}>{equation(head.X[i], head.WV.map(coefficients => coefficients[j]))} = {fmtCompact(value)}</p>)}</div>)}</div>
      </div></details>
      <LessonContributions locale={locale} run={run} />
      <details className="expand"><summary>{ko ? '정밀 계산값' : 'Full-precision values'}</summary><div className="expand__body">{head.output[row].map((value, i) => <p key={i} data-journey-exact-head-output>{fmt(value, 6)}</p>)}</div></details>
    </>}
    {stage === 'attention' && <>
      <div className="lesson-roles">{vector(head.Q[row], ko ? 'Q: 현재 자리의 비교 기준' : 'Q: compare from the current position')}{head.K.map((values, i) => <div key={i}><Token id={ids[i]} locale={locale} />{vector(values, ko ? 'K: 참고할 자리의 비교 숫자' : 'K: compare a reference position')}{vector(head.V[i], ko ? 'V: 가져올 내용' : 'V: content to retrieve')}</div>)}</div>
      <ol className="lesson-attention-flow"><li>Q × Kᵀ = {numbers(head.scores[row])}</li><li>÷ √2 → softmax → {numbers(head.weights[row])}</li><li>× V = {numbers(head.output[row])}</li></ol>
      {lastRow(head.output, ko ? '앞에서 모은 첫 head의 출력' : 'The first-head output just gathered')}
    </>}
    {stage === 'mask' && <>
      <div className="lesson-mask" role="table" aria-label={ko ? '참고 가능한 자리' : 'Allowed reference positions'}>{ids.map((id, i) => <div role="row" key={id}><span role="rowheader"><Token id={id} locale={locale} /></span>{ids.map((reference, j) => <span role="cell" key={reference} data-mask-allowed={head.allowed[i][j]}><Token id={reference} locale={locale} /> · {head.allowed[i][j] ? (ko ? '참고 가능' : 'allowed') : (ko ? '가림' : 'hidden')}</span>)}</div>)}</div>
      <p>{ko ? '학교에는 앞의 나는과 자신을 볼 수 있습니다. 나는의 계산에서는 뒤에 놓인 학교에를 가립니다. 이 가리기는 처음부터 적용되어 있습니다.' : '“went” can reference the earlier “I” and itself. The “I” position cannot reference the later “went”. This mask has been active from the start.'}</p>
      {lastRow(head.weights, ko ? '마지막 자리의 참고 비중' : 'Reference shares at the final position')}
    </>}
    {stage === 'heads' && <>
      {run.attention.perHead.map((part, i) => <div key={i} data-lesson-head={i}>{vector(part.weights[row], ko ? `${i + 1}번째 head의 비중` : `Head ${i + 1} shares`)}{vector(part.output[row], ko ? `${i + 1}번째 head의 출력` : `Head ${i + 1} output`)}</div>)}
      {lastRow(run.attention.concat, ko ? '두 출력을 이어 붙인 네 값' : 'Four values joined from the two heads')}
      <p>{ko ? '이어 붙인 행에 출력 계수 W_O를 곱합니다.' : 'Multiply the joined row by output coefficients W_O.'}</p>
      {lastRow(run.attention.output, ko ? '블록에 넘길 attention 출력' : 'Attention output passed to the block')}
      <details className="expand"><summary>{ko ? 'W_O와 한 칸의 계산' : 'W_O and the calculation of one entry'}</summary><div className="expand__body"><p>{ko ? '둘째 head의 고정 계수' : 'Fixed coefficients for the second head'}</p><MatrixGrid matrix={run.attention.perHead[1].WQ} name="W_Q · head 2" compact /><MatrixGrid matrix={run.attention.perHead[1].WK} name="W_K · head 2" compact /><MatrixGrid matrix={run.attention.perHead[1].WV} name="W_V · head 2" compact /><MatrixGrid matrix={run.attention.WO} name="W_O" compact /><p>{cellDerivation(run.attention.concat, run.attention.WO, row, 0).terms.map(term => `${fmtCompact(term.a)} × ${term.b}`).join(' + ')} = {fmtCompact(run.attention.output[row][0])}</p></div></details>
    </>}
    {stage === 'residual' && <>
      {lastRow(run.stages.position, ko ? '원래 입력' : 'Original input')}{lastRow(run.attention.output, ko ? '직전 attention 출력' : 'Preceding attention output')}
      {lastRow(run.workings.attentionResidual.residual, ko ? '두 행을 같은 칸끼리 더한 값' : 'Add matching entries of both rows')}
      <p>{ko ? '한 토큰의 네 값에서 평균을 빼고, 분산 + 0.00001의 제곱근으로 나눕니다. 이를 층 정규화라고 부릅니다.' : 'For the four values of one token, subtract their mean and divide by √(variance + 0.00001). This is layer normalization.'}</p>
      <p>{ko ? '평균' : 'Mean'} {fmt(run.workings.attentionResidual.norm.rows[row].mean)} · {ko ? '분산' : 'variance'} {fmt(run.workings.attentionResidual.norm.rows[row].variance)}</p>
      {lastRow(run.stages['attention-residual'], ko ? 'FFN에 넘길 정규화한 행' : 'Normalized row passed to the FFN')}
    </>}
    {stage === 'feed-forward' && <>
      {lastRow(run.stages['attention-residual'], ko ? '방금 정규화한 입력' : 'The input just normalized')}
      {lastRow(run.workings.feed.hidden, ko ? '첫 계수와 편향으로 넓힌 여덟 값' : 'Eight values from first coefficients and bias')}
      {lastRow(run.workings.feed.activated, ko ? '음수를 0으로 바꾼 뒤' : 'After replacing negative values with zero')}
      {lastRow(run.stages['feed-forward'], ko ? '다시 네 값으로 좁힌 FFN 출력' : 'FFN output narrowed back to four values')}
      <details className="expand"><summary>{ko ? '이 변환에 사용한 고정 계수' : 'Fixed coefficients used for this transform'}</summary><div className="expand__body"><MatrixGrid matrix={FFN_W1} name="W₁" compact /><p>b₁ {numbers(FFN_B1)}</p><MatrixGrid matrix={FFN_W2} name="W₂" compact /><p>b₂ {numbers(FFN_B2)}</p></div></details>
    </>}
    {stage === 'hidden' && <>
      {lastRow(run.stages['attention-residual'], ko ? 'FFN에 들어간 행' : 'The row entering the FFN')}{lastRow(run.stages['feed-forward'], ko ? 'FFN에서 나온 행' : 'The row leaving the FFN')}
      {lastRow(run.workings.ffnResidual.residual, ko ? '다시 같은 칸끼리 더하기' : 'Add matching entries again')}
      {lastRow(run.hidden, ko ? '다시 정규화한 마지막 표현' : 'The final representation after normalization')}
    </>}
    {stage === 'readout' && <>
      {lastRow(run.hidden, ko ? '직전 단원의 마지막 표현' : 'The final representation from the preceding unit')}
      <p>{ko ? '어휘 출력 계수는 첫 값을 −1배 하고 나머지를 그대로 옮깁니다. 마지막 표현의 특징 네 개를 다음 어휘 후보 네 개의 점수로 바꿉니다.' : 'The vocabulary readout multiplies the first feature by −1 and copies the others. This maps four features of the final representation to scores for four vocabulary candidates.'}</p>
      {lastRow(run.logits, ko ? '다음 어휘의 점수' : 'Next-vocabulary scores')}
      <LessonProbabilities locale={locale} run={run} />
      <details className="expand"><summary>{ko ? '어휘 출력 계수와 정밀 확률 보기' : 'Vocabulary coefficients and full-precision probabilities'}</summary><div className="expand__body"><MatrixGrid matrix={run.readout} name={ko ? '어휘 출력 계수' : 'Vocabulary readout'} compact /><p>{numbers(run.probabilities[row], 8)}</p></div></details>
    </>}
    {stage === 'loss' && <>
      <p>{ko ? '입력에는 두 조각만 둡니다. 학습에서 비교할 정답은 별도로 주어진 라벨입니다.' : 'Keep only the two chunks in the input. Training compares the prediction against a separate target label.'}</p>
      <p>{ko ? '정답 라벨' : 'Target label'}: <Token id={2} locale={locale} /></p>
      <p>{ko ? '정답에 준 확률' : 'Probability assigned to the target'}: <strong data-lesson-target-probability>{fmt(run.probabilities[row][2], 7)}</strong></p>
      <p className="lesson-equation">{ko ? '손실' : 'Loss'} = −ln({fmt(run.probabilities[row][2], 7)}) = <strong data-lesson-loss>{fmt(crossEntropy(run.probabilities[row], oneHot(4, 2)).loss, 6)}</strong></p>
    </>}

  </section>;
}
