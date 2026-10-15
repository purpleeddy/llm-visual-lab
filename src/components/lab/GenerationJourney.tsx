import { useMemo, useState } from 'react';
import { advanceLesson, lessonSnapshot, LESSON_INITIAL_IDS, LESSON_END_ID, LESSON_READOUT } from '../../lib/math/lessonGeneration';
import { LEARNING_EXAMPLE, FFN_W1, FFN_B1, FFN_W2, FFN_B2 } from '../../lib/math/examples';
import { fmt, fmtCompact, fmtPercent } from '../../lib/math/format';
import { MatrixGrid } from './MatrixGrid';
import type { Locale } from '../../lib/i18n/routing';
import '../../styles/journey.css';

const STAGES = ['purpose', 'lookup', 'context', 'projection', 'comparison', 'transpose', 'candidates', 'shares', 'mixture', 'block', 'probabilities', 'append', 'finished'] as const;
const TITLES = {
  ko: ['다음 한 조각은 어디에서 나올까요?', '글 대신 숫자로 계산합니다', '마지막 입력 자리에 주변 정보를 모읍니다', '입력 하나에서 새 숫자 하나 만들기', '두 줄을 같은 자리끼리 곱해 더하기', '같은 비교를 하도록 오른쪽 줄 세우기', '후보 열을 나란히 늘리기', '비교 점수를 참고 비중으로 바꾸기', '그 비중만큼 내용을 가져오기', '나머지 계산을 거쳐 마지막 표현 만들기', '마지막 표현에서 다음 조각의 확률로', '고른 조각을 붙이고 다시 계산하기', '끝을 골랐으므로 여기서 멈춥니다'],
  en: ['Where does the next chunk come from?', 'Compute with numbers in place of text', 'Gather context at the final input position', 'Make one new number from one input', 'Multiply matching entries and add', 'Stand the right row up for the same comparison', 'Add the other candidate column', 'Turn comparison scores into reference shares', 'Bring in content using those shares', 'Finish the block to get the final representation', 'From the final representation to next-chunk probabilities', 'Append the choice and compute again', 'Choosing end stops the sequence'],
};
const vector = (values: number[], decimals = 3) => `(${values.map(value => fmtCompact(value, decimals)).join(', ')})`;
const products = (left: number[], right: number[]) => left.map((value, i) => `${fmtCompact(value)} × ${fmtCompact(right[i])}`).join(' + ');

function Token({ id, locale, focus = false, newly = false }: { id: number; locale: Locale; focus?: boolean; newly?: boolean }) {
  return <span className="journey-token" data-token-id={id} data-focused={focus} data-new={newly}>{id === LESSON_END_ID ? (locale === 'ko' ? '[끝]' : '[end]') : LEARNING_EXAMPLE[locale].tokens[id]}</span>;
}

/** One manually advanced board. Every numerical view reads the current decoder snapshot. */
export function GenerationJourney({ locale }: { locale: Locale }) {
  const ko = locale === 'ko';
  const [mode, setMode] = useState<'overview' | 'detail'>('overview');
  const [step, setStep] = useState(0);
  const [ids, setIds] = useState<number[]>([...LESSON_INITIAL_IDS]);
  const run = useMemo(() => lessonSnapshot(ids), [ids]);
  const stage = STAGES[step];
  const last = run.lastPosition;
  const head = run.attention.perHead[0];
  const q = head.Q[last];
  const firstK = head.K[0];
  const names = ids.map(id => LEARNING_EXAMPLE[locale].tokens[id]);
  const finalName = names[last];
  const probabilityRow = run.probabilities[last];
  const railIndex = step === 0 ? -1 : step === 1 ? 1 : step <= 8 ? 2 : step === 9 ? 3 : step === 10 ? 4 : 5;
  const rail = ko ? ['주어진 글', '숫자로', '문맥 반영', '마지막 표현', '다음 후보 확률', '선택·붙이기'] : ['Given text', 'Numbers', 'Use context', 'Final representation', 'Next-candidate probabilities', 'Choose · append'];
  const path = mode === 'overview' ? [0, 11, 12] : STAGES.map((_, i) => i).slice(1);
  const pathIndex = path.indexOf(step);
  const reset = () => { setIds([...LESSON_INITIAL_IDS]); setStep(mode === 'overview' ? 0 : 1); };
  const openDetail = () => { setMode('detail'); setStep(1); };
  const returnOverview = () => { setMode('overview'); setStep(step >= 11 ? step : 0); };
  const next = () => {
    if ((mode === 'overview' && step === 0) || step === 10 || step === 11) {
      const choice = advanceLesson(run);
      if (choice.finished) setStep(12);
      else { setIds(choice.tokenIds); setStep(11); }
      return;
    }
    setStep(current => Math.min(current + 1, STAGES.length - 1));
  };
  const previous = () => {
    if (step === 11) setIds([...LESSON_INITIAL_IDS]);
    setStep(path[Math.max(0, pathIndex - 1)]);
  };
  const nextLabel = step === 4 ? (ko ? '오른쪽 줄을 세워 보기' : 'Stand the right row up')
    : step === 0 || step === 10 ? (ko ? '가장 큰 확률의 조각 붙이기' : 'Append the highest-probability chunk')
    : step === 11 ? (ko ? '새 확률에서 끝 고르기' : 'Choose end from the new probabilities')
    : (ko ? '다음 장면' : 'Next scene');

  const probabilityDisplay = <div className="journey__probabilities" role="group" aria-label={ko ? '다음 어휘 후보의 확률' : 'Next-vocabulary probabilities'} data-journey-probabilities>
    <p>{ko ? '지금 입력 바로 뒤에 올 한 조각의 확률' : 'Probabilities for one chunk immediately after this input'}</p>
    <dl>{probabilityRow.map((p, id) => <div className="journey__probability-row" key={id} data-vocabulary-id={id} data-largest={id === run.nextId}>
      <dt><Token id={id} locale={locale} /></dt><dd><strong data-journey-probability>{fmtPercent(p, 1)}</strong><span className="journey__bar-track" aria-hidden="true"><span className="journey__bar" style={{ width: `${100 * p}%` }} /></span></dd>
    </div>)}</dl>
  </div>;

  return <section id="generation-opening" className="lab lab--generation-journey" aria-label={ko ? '입력부터 다음 조각까지 한 계산 여정' : 'One computation from input to next chunk'} data-mode={mode} data-progress={`${pathIndex + 1}/${path.length}`} data-stage={stage} data-prefix={ids.join(',')} data-finished={stage === 'finished'}>
    <header className="lab__header"><h3 className="lab__title">{ko ? 'LLM은 어떻게 다음 말을 만들까?' : 'How does an LLM continue text?'}</h3></header>
    <p className="journey__scope">{ko ? '위치 계산을 생략한 작은 설명용 모형입니다. 계수는 정해 두고 확률은 직접 계산합니다.' : 'A small illustrative model with position calculation omitted. Coefficients are fixed; probabilities are computed.'}</p>
    <div className="journey__input" data-journey-input>
      <span>{ko ? '지금 주어진 입력' : 'Input available now'}</span>
      <div>{ids.map((id, i) => <Token key={i} id={id} locale={locale} focus={i === last} newly={step >= 11 && i === last} />)}</div>
      <p>{ko ? <>따라갈 자리: 마지막 입력 <strong>{finalName}</strong></> : <>Follow the final input position: <strong>{finalName}</strong></>}</p>
    </div>
    <ol className="journey__route" aria-label={ko ? '전체 계산 경로' : 'Whole computation route'}>{rail.map((label, i) => <li key={label} aria-current={i === railIndex ? 'step' : undefined}><span>{label}</span>{i < rail.length - 1 && <span className="journey__route-arrow" aria-hidden="true">→</span>}</li>)}</ol>
    <div className="journey__scene" data-journey-scene>
      <p className="journey__progress" role="status" aria-live="polite" aria-atomic="true">{ko ? (mode === 'overview' ? '큰 그림' : '상세 계산') : (mode === 'overview' ? 'Overview' : 'Calculation detail')} · {pathIndex + 1} / {path.length} · {TITLES[locale][step]}</p>
      <h4>{TITLES[locale][step]}</h4>
      {mode === 'detail' && step <= 3 && <p className="journey__destination">{ko ? '계산의 목적: 주어진 두 조각을 숫자로 바꾸고 → 문맥을 반영한 마지막 표현을 만들고 → 다음 한 조각의 확률을 구합니다. 지금은 그 확률이 나온 과정을 열어 보고 있습니다.' : 'The goal: turn the two given chunks into numbers → make a final representation using context → compute probabilities for the next chunk. We are opening up the calculation behind those probabilities.'}</p>}
      {step === 0 && <>
        <p>{ko ? '주어진 글의 뒤를 이어 쓰는 것이 목표입니다. 글을 숫자로 바꾸고, 주변 정보를 반영한 뒤, 마지막 입력 자리의 표현으로 다음 한 조각의 확률을 만듭니다.' : 'The goal is to continue the given text. Turn it into numbers, use the available context, and use the final input position’s representation to compute probabilities for one next chunk.'}</p>
        {probabilityDisplay}
        <div className="journey__preview" data-journey-preview><span>{ko ? '고르면 붙일 조각' : 'Chunk to append if selected'}</span><Token id={run.nextId} locale={locale} /></div>
        <p>{ko ? '가장 큰 확률의 조각을 미리 보여줍니다. 아래 버튼으로 실제로 붙이면, 늘어난 입력으로 다시 계산합니다.' : 'This previews the highest-probability choice. Append it with the button below, then compute again using the longer input.'}</p>
      </>}
      {step === 1 && <>
        <div className="journey__lookup">{ids.map((id, row) => <div key={id}><Token id={id} locale={locale} /><span aria-hidden="true">→</span><span className="journey__digits" data-journey-embedding={id}>{run.stages.embedding[row].map((value, feature) => <span key={feature} aria-label={`${ko ? '값' : 'Entry'} ${feature + 1}: ${value}`}>{fmtCompact(value)}</span>)}</span></div>)}</div>
        <p>{ko ? '각 조각의 번호로 표를 찾아 숫자를 꺼냅니다. 두 입력 자리는 그대로 남습니다. 마지막 자리인 “학교에”를 끝까지 따라가겠습니다.' : 'Use each chunk’s ID to retrieve its numbers from a table. Both input positions remain. We will follow the final position, “went”, all the way through.'}</p>
        <p>{ko ? '이 여정에서는 위치 숫자를 더하지 않아, 꺼낸 숫자가 그대로 다음 계산에 들어갑니다.' : 'This journey adds no position numbers: the retrieved numbers enter the next calculation unchanged.'}</p>
      </>}
      {step === 2 && <>
        <div className="journey__context">{ids.map(id => <div key={id}><Token id={id} locale={locale} /><span aria-hidden="true">↘</span></div>)}<strong>{ko ? '“학교에” 자리에 모은 문맥 정보' : 'context gathered at “went”'}</strong></div>
        <p>{ko ? '마지막 자리는 앞의 “나는”과 현재의 “학교에”를 참고합니다. 각 자리의 내용을 얼마나 가져올지 계산해, 주변 글을 반영한 새 표현을 만듭니다.' : 'The final position can refer to the earlier “I” and the current “went”. It computes how much content to bring from each position, producing a representation that reflects the context.'}</p>
        <p>{ko ? '아직 입력에 없는 조각은 참고할 수 없습니다. 아래 계산은 모두 이 두 입력 자리에서 시작합니다.' : 'A chunk absent from the input cannot be referenced. All the following arithmetic starts with these two input positions.'}</p>
      </>}
      {step === 3 && <>
        <p>{ko ? '먼저 “학교에”의 숫자 네 개를 다른 숫자 두 개로 바꿉니다. 비교에 쓸 특징을 만들기 위해, 각 입력값을 얼마만큼 사용할지 계수로 정합니다. 두 번째 출력 하나를 계산해 봅니다.' : 'First transform the four numbers for “went” into two numbers. Coefficients combine input entries into features for comparison. Calculate the second output first.'}</p>
        <div className="journey__projection-inputs">
          <div><span>{ko ? '이번 입력' : 'Selected input'} · <Token id={ids[last]} locale={locale} focus /></span><span className="journey__digits" data-journey-projection-input>{head.X[last].map((value, feature) => <span key={feature}>{fmtCompact(value)}</span>)}</span></div>
          <div><span>{ko ? '이 출력에 곱할 고정 계수' : 'Fixed coefficients for this output'}</span><span className="journey__digits" data-journey-projection-coefficients>{head.WQ.map((row, feature) => <span key={feature}>{fmtCompact(row[1])}</span>)}</span></div>
        </div>
        <div className="journey__equation" data-journey-projection>{products(head.X[last], head.WQ.map(row => row[1]))} = <strong>{fmtCompact(q[1])}</strong></div>
        <p>{ko ? '첫 번째 출력도 같은 방법으로 구하면' : 'Compute the first output in the same way:'} <strong data-journey-query>{vector(q)}</strong>. {ko ? '이것이 현재 자리에서 비교에 쓸 두 숫자입니다.' : 'These two numbers will compare from the current position.'}</p>
        <details className="expand" key={stage}><summary>{ko ? '입력과 계수, 첫 번째 출력도 보기' : 'See the input, coefficients and first output'}</summary><div className="expand__body">
          <MatrixGrid matrix={[head.X[last]]} name={finalName} compact /><MatrixGrid matrix={head.WQ} name={ko ? '비교 기준을 만드는 고정 계수' : 'Fixed coefficients for comparison'} compact />
          <p>{products(head.X[last], head.WQ.map(row => row[0]))} = {fmtCompact(q[0])}</p>
          <p>{ko ? '한 줄을 벡터, 숫자를 줄과 칸에 놓은 표를 행렬이라고 부릅니다. 위처럼 한 행과 각 열을 곱해 더하는 계산이 행렬곱입니다. 입력 표를 X, 계수 표를 W라고 쓰면 X × W입니다.' : 'A number row is a vector; a grid of rows and columns is a matrix. Multiplying one input row by each coefficient column and adding is matrix multiplication. Calling the input X and the coefficients W gives X × W.'}</p>
        </div></details>
      </>}
      {(step === 4 || step === 5) && <>
        <p>{ko ? '현재 자리의 두 숫자와 “나는”에서 만든 두 숫자를 비교합니다. 같은 자리끼리 곱해 더하면 점수 하나가 나옵니다.' : 'Compare the current position’s two numbers with two numbers made from “I”. Multiply matching entries and add to produce one score.'}</p>
        <div className={`journey__pair${step === 5 ? ' journey__pair--column' : ''}`} data-journey-pair>
          <div><Token id={ids[last]} locale={locale} focus /><span className="journey__row" data-pair-left>{q.map((value, i) => <span key={i}>{fmtCompact(value)}</span>)}</span></div>
          <span aria-hidden="true">×</span><div><Token id={ids[0]} locale={locale} /><span className={step === 5 ? 'journey__column' : 'journey__row'} data-pair-right>{firstK.map((value, i) => <span key={i}>{fmtCompact(value)}</span>)}</span></div>
          <span aria-hidden="true">=</span><strong data-pair-result>{fmtCompact(head.scores[last][0])}</strong>
        </div>
        <p className="journey__equation">{products(q, firstK)} = {fmtCompact(head.scores[last][0])}</p>
        <p>{step === 4 ? (ko ? '이 계산을 내적이라고 부릅니다. 다음 장면에서는 숫자와 곱하는 짝을 그대로 두고, 오른쪽 줄만 세워 봅니다.' : 'This calculation is a dot product. In the next scene, keep the numbers and their pairings while standing the right row up.') : (ko ? '결과는 여전히 4입니다. 한 행과 한 열을 곱하기 편하게 줄과 열을 바꿔 놓는 것이 전치입니다. 아직 새 토큰을 고른 것은 아닙니다.' : 'The result is still 4. Swapping rows and columns to arrange a row-by-column product is a transpose. No new token has been selected.')}</p>
        <details className="expand" key={stage}><summary>{ko ? '“나는”의 비교 숫자는 어디에서 왔나요?' : 'Where did the comparison numbers for “I” come from?'}</summary><div className="expand__body">
          <MatrixGrid matrix={[head.X[0]]} name={names[0]} compact /><MatrixGrid matrix={head.WK} name={ko ? '참고 대상에 쓰는 고정 계수' : 'Fixed coefficients for references'} compact />
          {firstK.map((value, j) => <p key={j}>{products(head.X[0], head.WK.map(row => row[j]))} = {fmtCompact(value)}</p>)}
          <p>{ko ? '현재 자리의 기준을 만드는 계수와 참고 대상의 계수는 다를 수 있습니다. 입력의 어느 자리에나 같은 계수 표를 사용합니다.' : 'The current-position and reference coefficients may differ. Each coefficient table is shared by every input position.'}</p>
        </div></details>
      </>}
      {step === 6 && <>
        <p>{ko ? '같은 현재 줄을 두고, 참고할 자리의 열을 나란히 놓습니다. “나는”과 비교한 4 옆에 “학교에”와 비교한 0이 생깁니다.' : 'Keep the current row and place reference columns side by side. The score 4 against “I” is joined by 0 against “went”.'}</p>
        <p>{ko ? '현재 줄' : 'Current row'}: <strong>{vector(q)}</strong></p>
        <div className="journey__scroll" role="region" aria-label={ko ? '참고 대상의 열과 비교 점수' : 'Reference columns and comparison scores'} tabIndex={0}><table className="journey__table" data-journey-candidates><thead><tr><th scope="col">{ko ? '같은 자리' : 'Matching entry'}</th>{ids.map(id => <th key={id} scope="col"><Token id={id} locale={locale} /></th>)}</tr></thead><tbody>
          {q.map((_, feature) => <tr key={feature}><th scope="row">{feature + 1}</th>{ids.map((id, j) => <td key={id}>{fmtCompact(head.KT[feature][j])}</td>)}</tr>)}
          <tr><th scope="row">{ko ? '곱해서 더한 점수' : 'Multiply and add'}</th>{ids.map((id, j) => <td key={id} data-journey-score>{fmtCompact(head.scores[last][j])}</td>)}</tr>
        </tbody></table></div>
        <details className="expand" key={stage}><summary>{ko ? '참고 대상 계산과 기호 보기' : 'Reference calculations and their notation'}</summary><div className="expand__body"><MatrixGrid matrix={head.WK} name={ko ? '공통 참고 계수' : 'Shared reference coefficients'} compact />{head.K.map((key, j) => <div key={j}><p>{names[j]}</p>{key.map((value, feature) => <p key={feature}>{products(head.X[j], head.WK.map(row => row[feature]))} = {fmtCompact(value)}</p>)}</div>)}<p>{ko ? '현재 자리의 기준을 Q, 참고 대상의 숫자를 K라고 부릅니다. K의 줄들을 열로 바꾼 표가 Kᵀ입니다. 방금 구한 (4, 0)은 Q의 마지막 행 × Kᵀ입니다. 토큰마다 따로 가져올 내용은 다음에 V라고 부릅니다.' : 'Q names the current comparison numbers, and K the reference numbers. Kᵀ arranges K’s rows as columns. The (4, 0) just calculated is Q’s final row × Kᵀ. The content retrieved from each position will be called V.'}</p></div></details>
      </>}
      {step === 7 && <>
        <p>{ko ? '4와 0을 곧바로 내용에 곱하지 않습니다. 두 숫자로 비교했으므로 √2로 나누고, 합이 1인 참고 비중으로 바꿉니다.' : 'Do not multiply content directly by 4 and 0. Since each comparison used two numbers, divide by √2, then turn the scores into reference shares totaling 1.'}</p>
        <div className="journey__scroll" role="region" aria-label={ko ? '점수에서 참고 비중으로' : 'Scores to reference shares'} tabIndex={0}><table className="journey__table"><thead><tr><th>{ko ? '참고할 입력 자리' : 'Input position to reference'}</th><th>{ko ? '점수 ÷ √2' : 'Score ÷ √2'}</th><th>{ko ? '참고 비중' : 'Reference share'}</th></tr></thead><tbody>{ids.map((id, j) => <tr key={id}><th scope="row"><Token id={id} locale={locale} /></th><td>{fmtCompact(head.scaledScores[last][j], 3)}</td><td data-journey-share>{fmtPercent(head.weights[last][j], 1)}</td></tr>)}</tbody></table></div>
        <p>{ko ? '이 비중은 이미 주어진 두 자리에서 내용을 얼마나 가져올지 뜻합니다. 계수는 고정해도 입력이 바뀌면 비중을 다시 계산합니다. 다음에 쓸 어휘 후보의 확률은 뒤에서 따로 계산합니다.' : 'These shares say how much content to retrieve from the two available positions. Fixed coefficients still produce new shares when the input changes. Next-vocabulary probabilities are computed separately, later.'}</p>
        <details className="expand" key={stage}><summary>{ko ? '합을 1로 만드는 계산: softmax' : 'The calculation that makes the sum 1: softmax'}</summary><div className="expand__body"><p>{ko ? '각 점수에서 최댓값을 뺀 뒤 지수 함수를 적용하고, 그 합으로 나눕니다. 최댓값을 빼도 비중은 같습니다.' : 'Subtract the largest score, exponentiate, and divide by the sum. Subtracting the maximum preserves the shares.'}</p>{head.softmax[last].terms.map((term, j) => <p key={j}>{names[j]}: exp({fmt(term.shifted!, 6)}) / {fmt(head.softmax[last].sumExp, 6)} = {fmt(term.probability, 6)}</p>)}</div></details>
      </>}
      {step === 8 && <>
        <p>{ko ? '각 자리의 내용을 참고 비중만큼 가져온 뒤, 왼쪽 값끼리·오른쪽 값끼리 더합니다. 색을 따라 두 자리의 기여가 어디에 모이는지 보세요.' : 'Retrieve each position’s content in proportion to its reference share, then add matching coordinates. Follow the colors to see where each contribution goes.'}</p>
        <figure className="journey__mixture" data-journey-mixture>
          <div className="journey__contributions">{ids.map((id, j) => <div className="journey__contribution" key={id} data-source-id={id}>
            <Token id={id} locale={locale} />
            <div className="journey__coordinates" data-source-values>{head.V[j].map((value, feature) => <span key={feature} data-contribution-source>{fmtCompact(value)}</span>)}</div>
            <strong className="journey__multiply">× <span data-contribution-share>{fmtPercent(head.weights[last][j], 1)}</span></strong>
            <span className="journey__contribution-arrow" aria-hidden="true">→</span>
            <div className="journey__coordinates" data-weighted-values>{head.V[j].map((value, feature) => {
              const contribution = value * head.weights[last][j];
              return <span key={feature} className="journey__coordinate"><strong data-contribution-value>{fmtCompact(contribution, 3)}</strong><span className="journey__contribution-bar" style={{ width: `${head.output[last][feature] === 0 ? 0 : 100 * contribution / head.output[last][feature]}%` }} aria-hidden="true" /></span>;
            })}</div>
          </div>)}</div>
          <div className="journey__merge"><span aria-hidden="true">↓ + ↓</span><span>{ko ? '같은 자리끼리 더하기' : 'Add matching coordinates'}</span></div>
          <div className="journey__mixture-result"><Token id={ids[last]} locale={locale} focus /><div className="journey__coordinates">{head.output[last].map((value, feature) => <span key={feature} className="journey__coordinate"><strong data-journey-head-output>{fmtCompact(value, 3)}</strong><span className="journey__sum-bar" aria-hidden="true">{ids.map((id, j) => <span key={id} data-source-id={id} style={{ width: `${value === 0 ? 0 : 100 * head.V[j][feature] * head.weights[last][j] / value}%` }} />)}</span></span>)}</div></div>
          <figcaption>{ko ? '학교에 자리에 모은 첫 head의 내용입니다. 다음 토큰 확률은 이 뒤의 계산을 거쳐 따로 만듭니다.' : 'This is content gathered by the first head at “went”. Next-token probabilities are computed separately after the remaining operations.'}</figcaption>
        </figure>
        <details className="expand" key={stage}><summary>{ko ? '정확한 곱·합과 내용 계수 펼치기' : 'Open the precise products, sums and content coefficients'}</summary><div className="expand__body">
          {q.map((_, feature) => <p className="journey__equation" key={feature}>{ids.map((id, j) => `${fmt(head.weights[last][j], 6)} × ${fmtCompact(head.V[j][feature])}`).join(' + ')} = <strong data-journey-exact-head-output>{fmt(head.output[last][feature], 6)}</strong></p>)}
          <MatrixGrid matrix={head.WV} name={ko ? '고정 내용 계수' : 'Fixed content coefficients'} compact /><MatrixGrid matrix={head.V} name="V" rowLabels={names} compact />
        </div></details>
      </>}
      {step === 9 && <>
        <p>{ko ? '방금 계산한 갈래를 head라고 부릅니다. 같은 입력을 다른 계수로 보는 둘째 head도 계산한 뒤, 두 결과를 이어 붙입니다. 첫 head만으로 어휘 확률을 만들지 않습니다.' : 'The branch just calculated is called a head. A second head uses other coefficients on the same input. Join both results; the first head alone does not produce vocabulary probabilities.'}</p>
        <dl className="journey__values"><dt>{ko ? '첫 head' : 'First head'}</dt><dd data-journey-first-head>{vector(head.output[last])}</dd><dt>{ko ? '둘째 head' : 'Second head'}</dt><dd data-journey-second-head>{vector(run.attention.perHead[1].output[last])}</dd><dt>{ko ? '이어 붙인 네 숫자' : 'Four joined numbers'}</dt><dd>{vector(run.attention.concat[last])}</dd></dl>
        <p className="journey__pipeline">{ko ? '출력 계수 곱하기 → 원래 값 더하고 정규화 → 토큰 안에서 다시 변환 → 더하고 정규화' : 'Output projection → add input and normalize → transform within this token → add and normalize'}</p>
        <p>{ko ? '이 과정을 마친 마지막 자리의 표현' : 'The final position after these operations'}: <strong data-journey-hidden>{vector(run.hidden[last])}</strong></p>
        <details className="expand" key={stage}><summary>{ko ? '생략한 단계의 실제 숫자와 계수 펼치기' : 'Open the actual values and coefficients of these stages'}</summary><div className="expand__body">
          <p>{ko ? '둘째 head의 계수와 실제 계산' : 'Second-head coefficients and actual computation'}</p>
          <MatrixGrid matrix={run.attention.perHead[1].WQ} name="W_Q · head 2" compact /><MatrixGrid matrix={run.attention.perHead[1].WK} name="W_K · head 2" compact /><MatrixGrid matrix={run.attention.perHead[1].WV} name="W_V · head 2" compact />
          <p>Q {vector(run.attention.perHead[1].Q[last], 6)} · K {run.attention.perHead[1].K.map(values => vector(values, 6)).join(' / ')}</p>
          <p>{ko ? '점수' : 'Scores'} {vector(run.attention.perHead[1].scores[last], 6)} → ÷ √2 → {ko ? 'softmax 비중' : 'softmax shares'} {vector(run.attention.perHead[1].weights[last], 6)}</p>
          <p>V {run.attention.perHead[1].V.map(values => vector(values, 6)).join(' / ')} → {vector(run.attention.perHead[1].output[last], 6)}</p>
          <MatrixGrid matrix={run.attention.WO} name={ko ? '두 head의 고정 출력 계수' : 'Fixed output coefficients for both heads'} compact />
          <MatrixGrid matrix={[run.attention.output[last]]} name={ko ? '출력 계수를 곱한 값' : 'After output projection'} decimals={6} />
          <p>{ko ? '첫 더하기' : 'First addition'}: {vector(run.stages.position[last], 6)} + {vector(run.attention.output[last], 6)} = {vector(run.workings.attentionResidual.residual[last], 6)}</p>
          <p>{ko ? '한 자리의 네 값에서 평균을 빼고, 분산 + 0.00001의 제곱근으로 나누는 정규화' : 'Normalize the four numbers at this position: subtract their mean and divide by √(variance + 0.00001)'}.</p>
          <p>{ko ? '평균' : 'Mean'} {fmt(run.workings.attentionResidual.norm.rows[last].mean, 6)} · {ko ? '분산' : 'variance'} {fmt(run.workings.attentionResidual.norm.rows[last].variance, 6)} → {vector(run.stages['attention-residual'][last], 6)}</p>
          <p>{ko ? '다음 변환(FFN)은 같은 계수를 각 토큰에 따로 사용합니다. 첫 계수를 곱해 편향을 더하고, 음수는 0으로 바꾼 다음, 둘째 계수를 곱해 편향을 더합니다.' : 'The next transform (FFN) shares coefficients but processes each token separately. Multiply by the first coefficients and add bias, replace negatives with 0, then multiply by the second coefficients and add bias.'}</p>
          <MatrixGrid matrix={FFN_W1} name={ko ? 'FFN 첫 계수' : 'FFN first coefficients'} compact /><p>{ko ? '첫 편향' : 'First bias'} {vector(FFN_B1)}</p>
          <p>{ko ? '첫 변환' : 'First transform'} {vector(run.workings.feed.hidden[last], 6)} → {ko ? '음수 제거' : 'clip negatives'} {vector(run.workings.feed.activated[last], 6)}</p>
          <MatrixGrid matrix={FFN_W2} name={ko ? 'FFN 둘째 계수' : 'FFN second coefficients'} compact /><p>{ko ? '둘째 편향' : 'Second bias'} {vector(FFN_B2)}</p>
          <p>FFN: {vector(run.stages['feed-forward'][last], 6)}</p>
          <p>{ko ? '둘째 더하기' : 'Second addition'}: {vector(run.stages['attention-residual'][last], 6)} + {vector(run.stages['feed-forward'][last], 6)} = {vector(run.workings.ffnResidual.residual[last], 6)}</p>
          <p>{ko ? '다시 정규화: 평균' : 'Normalize again: mean'} {fmt(run.workings.ffnResidual.norm.rows[last].mean, 6)} · {ko ? '분산' : 'variance'} {fmt(run.workings.ffnResidual.norm.rows[last].variance, 6)} → {vector(run.hidden[last], 6)}</p>
          <p>{ko ? '남은 부품의 이유와 계산은 뒤의 한 층 단원에서 더 자세히 배웁니다.' : 'Later, the block lesson explains why these remaining parts are used and how they work.'} <a href="#blocks">{ko ? '한 층의 부품' : 'Block components'}</a></p>
        </div></details>
      </>}
      {step === 10 && <>
        <p>{ko ? '같은 마지막 자리 “학교에”의 표현에서, 이번에는 입력 자리가 아니라 어휘의 네 후보를 위한 점수를 만듭니다.' : 'From the same final position, “went”, make scores for four vocabulary candidates rather than for input positions.'}</p>
        <p>{ko ? '마지막 표현' : 'Final representation'} <strong>{vector(run.hidden[last])}</strong> → {ko ? '어휘 점수' : 'vocabulary scores'} <strong data-journey-logits>{vector(run.logits[last])}</strong></p>
        <p>{ko ? '고정 출력 계수는 첫 값을 −1배 하고 나머지를 그대로 옮깁니다. 이 어휘 점수에 softmax를 적용합니다.' : 'The fixed readout multiplies the first value by −1 and copies the others. Apply softmax to these vocabulary scores.'}</p>
        {probabilityDisplay}
        <p>{ko ? '여기서는 가장 큰 확률의 후보를 고르는 규칙을 씁니다. 확률을 계산하는 일과 하나를 고르는 일은 다릅니다.' : 'Here the selection rule chooses the highest probability. Computing probabilities and selecting one chunk are separate operations.'}</p>
        <details className="expand" key={stage}><summary>{ko ? '어휘 출력 계수와 확률 계산 보기' : 'See the vocabulary coefficients and probability arithmetic'}</summary><div className="expand__body"><MatrixGrid matrix={LESSON_READOUT} name={ko ? '고정 어휘 출력 계수' : 'Fixed vocabulary readout'} colLabels={LEARNING_EXAMPLE[locale].tokens.concat(ko ? '[끝]' : '[end]')} compact />{run.vocabularySoftmax[last].terms.map((term, id) => <p key={id}>{id === LESSON_END_ID ? (ko ? '[끝]' : '[end]') : LEARNING_EXAMPLE[locale].tokens[id]}: exp({fmt(term.shifted!, 6)}) / {fmt(run.vocabularySoftmax[last].sumExp, 6)} = {fmt(term.probability, 8)}</p>)}</div></details>
      </>}
      {step === 11 && <>
        <p>{ko ? '앞의 확률에서 고른 “갔다”를 붙였습니다. 입력은 이제 “나는 / 학교에 / 갔다”이고, 마지막 자리는 “갔다”입니다. 같은 계수로 전체 입력을 다시 계산했습니다.' : 'The previous distribution selected “to school”, which has now been appended. The input is “I / went / to school”, and its final position is “to school”. Recompute the whole input with the same coefficients.'}</p>
        <p>{ko ? '새 마지막 표현' : 'New final representation'}: <strong data-journey-hidden>{vector(run.hidden[last])}</strong></p>
        {probabilityDisplay}
        <p>{ko ? '같은 네 후보지만 확률이 달라졌습니다. 이번에는 [끝]의 확률이 가장 큽니다. 앞의 참고 비중과 어휘 확률을 구분하며 보세요.' : 'The four candidates are unchanged, but their probabilities differ. This time [end] has the highest probability. Keep reference shares distinct from vocabulary probabilities.'}</p>
        <details className="expand" key={stage}><summary>{ko ? '새 입력의 중간 계산도 보기' : 'See the intermediate values for the new input'}</summary><div className="expand__body">{(['embedding', 'position', 'attention', 'attention-residual', 'feed-forward', 'ffn-residual', 'logits', 'probabilities'] as const).map(id => <MatrixGrid key={id} matrix={run.stages[id]} name={(ko ? ['입력 벡터', '위치 생략: 입력 그대로', '두 head를 합친 출력', '더하기·정규화 1', '토큰별 변환 FFN', '마지막 표현', '어휘 점수', '다음 어휘 확률'] : ['Input vectors', 'Position omitted: unchanged input', 'Joined two-head output', 'Add and normalize 1', 'Per-token FFN', 'Final representation', 'Vocabulary scores', 'Next-vocabulary probabilities'])[(['embedding', 'position', 'attention', 'attention-residual', 'feed-forward', 'ffn-residual', 'logits', 'probabilities'] as const).indexOf(id)]} rowLabels={names} colLabels={id === 'logits' || id === 'probabilities' ? LEARNING_EXAMPLE[locale].tokens.concat(ko ? '[끝]' : '[end]') : undefined} highlightRow={last} decimals={6} />)}</div></details>
      </>}
      {step === 12 && <>
        <div className="journey__goal"><span>{names.join(' / ')}</span><span aria-hidden="true">→</span><Token id={LESSON_END_ID} locale={locale} /></div>
        <p>{ko ? '[끝]은 일반 마침표가 아니라 생성을 멈추라는 특별한 선택입니다. 입력에 덧붙여 다음 숫자를 찾지 않고 종료합니다.' : '[end] is a special stopping choice, not an ordinary period. Stop without appending it to the input or looking up another embedding.'}</p>
        <p>{ko ? '바뀐 것은 입력 문맥과 마지막 자리입니다. 계산 계수는 그대로였습니다. 실제 LLM은 많은 글에서 계수를 배우고 여러 층을 쓰지만, 다음 확률 → 하나 선택 → 새 입력으로 다시 계산하는 고리는 같습니다.' : 'The input context and final position changed; the coefficients stayed fixed. Real LLMs learn coefficients from text and use many blocks, while retaining this loop: next probabilities → one choice → compute from the new input.'}</p>
      </>}
    </div>
    <div className="journey__controls"><button type="button" className="btn journey__previous" disabled={pathIndex === 0} onClick={previous}>{ko ? '이전 장면' : 'Previous scene'}</button>
      {step < STAGES.length - 1 ? <button type="button" className="btn journey__next" onClick={next}>{nextLabel}</button> : <a className="btn journey__next" href="#tokens">{ko ? '이제 글을 숫자로 바꾸는 법 배우기' : 'Next: learn how text becomes numbers'}</a>}
      {pathIndex > 0 && <button type="button" className="btn journey__restart" onClick={reset}>{ko ? '처음으로' : 'Restart'}</button>}
    </div>
    {mode === 'overview' && step === 0 && <button type="button" className="journey__secondary journey__detail" onClick={openDetail}>{ko ? '이 확률의 계산 열기' : 'Open the calculation behind these probabilities'}</button>}
    {mode === 'detail' && <button type="button" className="journey__secondary journey__overview" onClick={returnOverview}>{ko ? '큰 그림으로 돌아가기' : 'Return to the overview'}</button>}
    <p className="journey__rounding">{ko ? '화면 숫자만 반올림합니다. 뒤 계산에는 반올림 전 값을 씁니다.' : 'Only displayed numbers are rounded; later calculations use full precision.'}</p>
  </section>;
}
