import { useMemo, useState } from 'react';
import { tinyDecoder } from '../../lib/math/model';
import { temperatureProbabilities, sampleIndex } from '../../lib/math/generation';
import { LEARNING_EXAMPLE } from '../../lib/math/examples';
import { fmt } from '../../lib/math/format';
import type { Locale } from '../../lib/i18n/routing';

export function TokenChoiceExplorer({ locale }: { locale: Locale }) {
  const ko = locale === 'ko'; const vocabulary = LEARNING_EXAMPLE[locale].vocabulary; const [temperature, setTemperature] = useState(1); const [u, setU] = useState(0.5); const [sample, setSample] = useState(false);
  const logits = useMemo(() => tinyDecoder().logits.at(-1)!, []);
  const probs = useMemo(() => temperatureProbabilities(logits, temperature), [logits, temperature]);
  const best = probs.reduce((b, p, i) => p > probs[b] ? i : b, 0);
  const chosen = sample ? sampleIndex(probs, u) : best;
  const cumulative = probs.map((_, i) => probs.slice(0, i + 1).reduce((a, b) => a + b, 0));
  return <section className="lab lab--token-choice" aria-label={ko ? '확률에서 토큰을 고르는 두 규칙' : 'Two rules for choosing a token'}>
    <header className="lab__header"><div><h3 className="lab__title">{ko ? '확률에서 토큰을 고르는 두 규칙' : 'Two rules for choosing a token'}</h3><p className="lab__kind">{ko ? '세 입력의 마지막 행 · 계산한 확률로 선택' : 'The three-input final row · choose from computed probabilities'}</p></div></header>
    <p className="lab__note">{ko ? `문맥은 ${LEARNING_EXAMPLE[locale].tokens.join(' ')}입니다. 위치 더하기 켬·causal mask 켬·단위행렬 어휘 출력의 마지막 행 점수입니다. 후보 0·1·2는 세 문장 조각, 후보 3은 끝 표시입니다. 계산한 확률에서 하나를 고르는 규칙을 바꿔 보세요.` : `The context is ${LEARNING_EXAMPLE[locale].tokens.join(' ')}. The last-row scores use positions on, causal masking on and an identity vocabulary readout. Candidates 0–2 are the sentence chunks and 3 is end. Change the rule used to select one item from the probabilities.`}</p>
    <div className="segmented" role="group" aria-label={ko ? '토큰 선택 규칙' : 'Token selection rule'}><button aria-pressed={!sample} onClick={() => setSample(false)}>greedy</button><button aria-pressed={sample} onClick={() => setSample(true)}>sampling</button></div>
    <div className="explorer__controls"><label className="explorer__control">{ko ? '온도 T' : 'Temperature T'}: {fmt(temperature, 2)}<input aria-label={ko ? '온도 T' : 'Temperature T'} className="explorer__range" type="range" min={0.25} max={2} step={0.25} value={temperature} onChange={e => setTemperature(Number(e.target.value))} /></label>{sample ? <label className="explorer__control">{ko ? '구간을 고르는 난수 u' : 'Draw u selecting a bin'}: {fmt(u, 2)}<input aria-label={ko ? '구간을 고르는 난수 u' : 'Draw u selecting a bin'} className="explorer__range" type="range" min={0} max={0.99} step={0.01} value={u} onChange={e => setU(Number(e.target.value))} /></label> : null}</div>
    <div className="terms__tablewrap"><table className="terms__table"><thead><tr><th scope="col">{ko ? '후보' : 'Candidate'}</th><th scope="col">{ko ? '점수' : 'Logit'}</th><th scope="col">{ko ? '확률' : 'Probability'}</th>{sample ? <th scope="col">{ko ? '난수 구간 [시작, 끝)' : 'Draw bin [start, end)'}</th> : null}</tr></thead><tbody>{vocabulary.map((token, i) => <tr key={token} className={i === chosen ? 'is-active' : undefined}><th scope="row">{i} · {token === '.' ? (ko ? '끝 표시 .' : 'end marker .') : token}</th><td>{fmt(logits[i], 3)}</td><td className="token-choice__probability">{fmt(probs[i], 3)}</td>{sample ? <td>{fmt(i ? cumulative[i - 1] : 0, 3)} ≤ u &lt; {fmt(cumulative[i], 3)}</td> : null}</tr>)}</tbody></table></div>
    {sample ? <div className="sampling-bins" aria-hidden="true">{probs.map((p, i) => <span key={i} style={{ flex: p }} className={i === chosen ? 'is-active' : undefined}>{i}</span>)}<span className="sampling-bins__draw" style={{ left: `${u * 100}%` }}>↑</span></div> : null}
    <p className="explorer__line" aria-live="polite">{ko ? '고른 토큰' : 'Chosen token'}: <strong className="token-choice__selected">{vocabulary[chosen]}</strong> · {sample ? `u = ${fmt(u, 2)}` : (ko ? '최댓값 선택' : 'highest probability')}</p>
    <p className="lab__hint">{ko ? 'sampling을 고르고 u를 0에서 0.99까지 움직이세요. 넓은 구간은 그만큼 뽑힐 가능성이 큽니다. T를 키우면 분포가 덜 쏠리지만 최댓값의 순서는 그대로입니다. 온도는 attention의 √d_k 나누기와 다른 목적의 설정입니다.' : 'Choose sampling and move u from 0 to 0.99. A wider bin is more likely to be sampled. Higher T flattens the distribution while preserving the ranking. Temperature serves a different purpose from the attention divisor √d_k.'}</p>
  </section>;
}
