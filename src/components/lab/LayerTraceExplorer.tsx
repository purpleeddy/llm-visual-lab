import { useMemo, useState } from 'react';
import { MatrixGrid } from './MatrixGrid';
import { Stepper } from './Stepper';
import { tinyDecoder, TRACE_STAGES } from '../../lib/math/model';
import { DEFAULT_X, LOSS_VOCABULARY } from '../../lib/math/examples';
import { fmt } from '../../lib/math/format';
import { t } from '../../lib/i18n/ui';
import type { Locale } from '../../lib/i18n/routing';

const KO = ['입력 벡터', '위치 더하기', 'Multi-head', '더하기·정규화 1', 'FFN', '더하기·정규화 2', '어휘 점수', '토큰 확률'];
const EN = ['Input vectors', 'Add position', 'Multi-head', 'Add·norm 1', 'FFN', 'Add·norm 2', 'Vocabulary scores', 'Token probabilities'];
const WHY_KO = ['토큰 세 개의 벡터를 쌓은 3 × 4 입력입니다. 손으로 고른 값이고 단어의 뜻을 학습한 벡터가 아닙니다.', '위치별 벡터를 칸마다 더합니다. 3 × 4 모양은 그대로입니다.', '두 head가 각각 정보를 섞고, 이어 붙인 결과에 W_O를 곱합니다. 미래 토큰은 보지 않습니다.', '현재 입력과 attention 결과를 더한 뒤 각 행을 정규화합니다.', '토큰별로 4 → 8 → 4 계산을 합니다. ReLU가 음수를 0으로 바꿉니다.', 'FFN에 들어간 값과 FFN 결과를 더한 뒤 다시 정규화합니다.', '4 × 4 단위행렬 W_vocab을 곱합니다. 이 예제에서는 각 feature가 어휘 a, b, c, .의 점수 하나가 됩니다.', '행마다 softmax를 합니다. 생성 시에는 쓰는 자리의 한 행을 골라 다음 토큰 후보의 확률로 씁니다.'];
const WHY_EN = ['Three hand-chosen token vectors form a 3 × 4 input. They do not encode learned word meanings.', 'Add a position vector feature by feature. The shape stays 3 × 4.', 'Two heads mix information; concatenate their outputs and multiply by W_O. Later tokens stay hidden.', 'Add the current input to the attention result, then normalize each row.', 'Apply 4 → 8 → 4 separately to each token. ReLU clips negative values.', 'Add the FFN input to its output, then normalize again.', 'Multiply by an identity 4 × 4 W_vocab. Here each feature becomes one score for a, b, c or the end marker.', 'Apply softmax to each row. During generation, use the row at the position being written as a next-token distribution.'];

export function LayerTraceExplorer({ locale }: { locale: Locale }) {
  const ko = locale === 'ko'; const ui = t(locale);
  const [index, setIndex] = useState(0); const [row, setRow] = useState(2); const [positions, setPositions] = useState(true);
  const result = useMemo(() => tinyDecoder(DEFAULT_X, positions), [positions]);
  const stage = TRACE_STAGES[index]; const labels = ko ? KO : EN;
  const matrix = result.stages[stage]; const probs = result.probabilities[row];
  const best = probs.reduce((b, p, i) => p > probs[b] ? i : b, 0);
  return <section className="lab lab--layer-trace" aria-label={ko ? '한 층에서 토큰 확률까지' : 'One block to token probabilities'} data-stage={stage}>
    <header className="lab__header"><div><h3 className="lab__title">{ko ? '한 층에서 토큰 확률까지' : 'One block to token probabilities'}</h3><p className="lab__kind">{ko ? '작은 예제의 실제 계산 · 한 층' : 'Computed toy example · one block'}</p></div></header>
    <p className="lab__note">{ko ? '같은 입력이 8단계를 이어서 통과합니다. 학습된 LLM이 아니라 손으로 고른 가중치, head 두 개, post-norm 한 층, 어휘 네 개짜리 계산입니다. 원래 논문의 번역기 전체나 실제 언어 이해를 재현하는 실험은 아닙니다.' : 'The same input passes through all eight stages. Hand-chosen weights, two heads, one post-norm block and four vocabulary entries: not a trained LLM, the full translation model or a demonstration of language understanding.'}</p>
    <div className="layer-trace__position">
      <label className="layer-trace__position-control">
        <input type="checkbox" aria-describedby="layer-trace-position-help" checked={positions} onChange={e => setPositions(e.target.checked)} />
        <span>{ko ? '위치 정보 포함하기' : 'Include position information'}</span>
      </label>
      <p className="lab__note" id="layer-trace-position-help" aria-live="polite">{ko
        ? (positions ? '현재: 입력 벡터에 위치 벡터를 더합니다. 체크를 해제해 순서 정보를 뺀 계산과 비교하세요.' : '현재: 위치 벡터를 더하지 않습니다. 입력과 가중치는 그대로 두고, 이후 계산을 다시 비교합니다.')
        : (positions ? 'Now: add position vectors to the input. Uncheck to compare the calculation without order information.' : 'Now: no position vectors are added. The input and weights stay fixed while the later calculation is recomputed.')}</p>
    </div>
    <Stepper steps={TRACE_STAGES.map((id, i) => ({ id, name: labels[i] }))} index={index} onChange={setIndex} labels={{ rail: ui.lab.step, prev: ui.lab.prevStep, next: ui.lab.nextStep }} />
    <p className="lab__note">{(ko ? WHY_KO : WHY_EN)[index]}</p>
    <MatrixGrid matrix={matrix} name={labels[index]} shape={`${matrix.length} × ${matrix[0].length}`} highlightRow={row} tone={stage === 'probabilities' ? 'weight' : 'input'} heatmap={stage === 'probabilities'} colLabels={index >= 6 ? LOSS_VOCABULARY : undefined} />
    <div className="segmented" role="group" aria-label={ko ? '예측에 쓸 토큰 위치' : 'Token position to predict from'}>{DEFAULT_X.map((_, i) => <button key={i} aria-pressed={row === i} onClick={() => setRow(i)}>{ko ? '토큰' : 'Token'} {i + 1}</button>)}</div>
    <p className="layer-trace__prediction explorer__line" aria-live="polite">{ko ? '이 행의 다음 토큰 확률' : 'Next-token distribution for this row'}: ({probs.map(p => fmt(p, 3)).join(', ')}) · {ko ? '합' : 'sum'} {fmt(probs.reduce((a, b) => a + b, 0), 3)} · {ko ? '최댓값 후보' : 'most likely'} {LOSS_VOCABULARY[best]}</p>
    <p className="lab__hint">{ko ? '먼저 다음 단계의 모양을 예측하세요. 위치를 끄면 값은 달라지지만 모든 단계의 3 × 4 모양은 유지됩니다. 실제 모델은 여러 층을 쌓고, 마지막 feature 폭과 어휘 크기는 보통 다릅니다.' : 'Predict the next shape first. Turning position off changes the values but preserves the 3 × 4 shape at every stage. Real models stack blocks and usually have different hidden and vocabulary widths.'}</p>
  </section>;
}
