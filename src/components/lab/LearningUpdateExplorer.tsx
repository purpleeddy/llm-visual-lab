import { useMemo, useState } from 'react';
import { oneWeightPrediction, oneWeightStep } from '../../lib/math/learning';
import { LEARNING_EXAMPLE } from '../../lib/math/examples';
import { fmt } from '../../lib/math/format';
import type { Locale } from '../../lib/i18n/routing';

export function LearningUpdateExplorer({ locale }: { locale: Locale }) {
  const ko = locale === 'ko';
  const [correct, other] = LEARNING_EXAMPLE[locale].tokens.slice(1);
  const [weight, setWeight] = useState(0);
  const [input, setInput] = useState(1);
  const [eta, setEta] = useState(0.2);
  const [steps, setSteps] = useState(0);
  const run = useMemo(() => oneWeightStep(weight, eta, input), [weight, eta, input]);
  const minW = Math.min(-4, weight - 0.1);
  const maxW = Math.max(4, weight + 0.1);
  const sx = (w: number) => 38 + (w - minW) / (maxW - minW) * 360;
  const sy = (loss: number) => 156 - Math.min(loss, 4.5) / 4.5 * 124;
  const curve = Array.from({ length: 100 }, (_, i) => {
    const w = minW + (maxW - minW) * i / 99;
    return `${i ? 'L' : 'M'} ${sx(w)} ${sy(oneWeightPrediction(w, input).loss)}`;
  }).join(' ');
  return <section className="lab lab--learning-update" aria-label={ko ? '가중치 하나를 실제로 고치기' : 'Actually update one weight'}>
    <header className="lab__header">
      <div><h3 className="lab__title">{ko ? '가중치 하나를 실제로 고치기' : 'Actually update one weight'}</h3><p className="lab__kind">{ko ? '두 후보 · 곱셈 계수 한 개 · 실제 손실과 갱신' : 'Two candidates · one coefficient · computed loss and update'}</p></div>
      <button className="btn" onClick={() => { setWeight(0); setInput(1); setEta(0.2); setSteps(0); }}>{ko ? '처음 값으로' : 'Reset'}</button>
    </header>
    <p className="lab__note">{ko ? `문맥 ${LEARNING_EXAMPLE[locale].tokens[0]} 뒤의 후보를 ${correct}와 ${other}, 두 개로 줄인 별도 연습입니다. 입력 x에 w를 곱해 정답 ${correct}의 점수를 만들고, 다른 후보의 점수는 0으로 둡니다. 두 점수에서 확률과 손실을 계산합니다. 앞의 층 전체를 갱신하는 실습은 아닙니다.` : `This separate exercise reduces the candidates after ${LEARNING_EXAMPLE[locale].tokens[0]} to ${correct} and ${other}. Multiply x by w to score the correct candidate ${correct}; the other score is 0. Compute probabilities and loss from those two scores. It does not update the earlier full block.`}</p>
    <div className="explorer__controls">
      <label className="explorer__control">{ko ? '입력 x' : 'Input x'}: {input}
        <input aria-label={ko ? '입력 x' : 'Input x'} className="explorer__range" type="range" min={-1} max={1} step={1} value={input} onChange={e => { setInput(Number(e.target.value)); setSteps(0); }} />
      </label>
      <label className="explorer__control">{ko ? '현재 가중치 w' : 'Current weight w'}: <output className="learning-update__weight">{fmt(weight, 3)}</output>
        <input aria-label={ko ? '현재 가중치 w' : 'Current weight w'} className="explorer__range" type="range" min={minW} max={maxW} step={0.1} value={weight} onChange={e => { setWeight(Number(e.target.value)); setSteps(0); }} />
      </label>
      <label className="explorer__control">{ko ? '학습률 η' : 'Learning rate η'}: {fmt(eta, 2)}
        <input aria-label={ko ? '학습률 η' : 'Learning rate η'} className="explorer__range" type="range" min={0.01} max={1} step={0.01} value={eta} onChange={e => setEta(Number(e.target.value))} />
      </label>
    </div>
    <p className="learning-update__calculation" aria-live="polite">{ko ? '입력 × 계수' : 'Input × coefficient'}: {input} × ({fmt(weight, 3)}) = {fmt(run.before.logits[0], 3)} → {ko ? '두 점수' : 'two scores'} ({fmt(run.before.logits[0], 3)}, 0) → P({correct}) = {fmt(run.before.probabilities[0], 3)} → {ko ? '손실' : 'loss'} = {fmt(run.before.loss, 6)}</p>
    <div className="explorer__panels">
      <svg viewBox="0 0 430 195" className="explorer__svg" role="img" aria-label={ko ? '가중치에 따른 손실 곡선과 현재 점, 갱신 뒤의 점' : 'Loss by weight, with current and updated points'}>
        <path d="M 38 28 V 156 H 405" className="tmap__line" /><path d={curve} className="pw__curve pw__curve--sin" />
        <circle cx={sx(weight)} cy={sy(run.before.loss)} r="5" fill="var(--data-q)" /><circle cx={sx(run.after.weight)} cy={sy(run.after.loss)} r="5" fill="var(--data-k)" />
        <path d={`M ${sx(weight)} ${sy(run.before.loss)} L ${sx(run.after.weight)} ${sy(run.after.loss)}`} className="walk__same-line" />
        <circle cx="264" cy="18" r="4" fill="var(--data-q)" /><text x="274" y="22" className="tmap__note">{ko ? '현재' : 'Current'}</text>
        <circle cx="332" cy="18" r="4" fill="var(--data-k)" /><text x="342" y="22" className="tmap__note">{ko ? '갱신 뒤' : 'Updated'}</text>
        <text x="44" y="22" className="walk__title">L = −ln P({correct})</text><text x="390" y="182" className="tmap__note">w →</text>
      </svg>
      <div className="terms__tablewrap">
        <p>{ko ? '현재 계수를 0.001만큼 줄이거나 키워 비교합니다.' : 'Compare the loss with the coefficient 0.001 lower or higher.'}</p>
        <table className="terms__table"><thead><tr><th scope="col">w</th><th scope="col">{ko ? '손실 L' : 'Loss L'}</th></tr></thead>
          <tbody><tr><th scope="row">{fmt(weight - run.probe, 6)}</th><td>{fmt(run.minus, 6)}</td></tr><tr><th scope="row">{fmt(weight, 6)}</th><td className="learning-update__loss">{fmt(run.before.loss, 6)}</td></tr><tr><th scope="row">{fmt(weight + run.probe, 6)}</th><td>{fmt(run.plus, 6)}</td></tr></tbody>
        </table>
        <p>{ko ? '손실 차이 ÷ 계수 차이' : 'Loss difference ÷ coefficient difference'} = ({fmt(run.plus, 6)} − {fmt(run.minus, 6)}) ÷ 0.002 = {fmt(run.estimatedGradient, 6)}</p>
        <p>{ko ? '미분으로 구한 기울기 g' : 'Analytic gradient g'}: <span className="learning-update__gradient">{fmt(run.gradient, 6)}</span></p>
      </div>
    </div>
    <div className="learning-update__proposal" aria-live="polite">
      <p>{ko ? '갱신할 값' : 'Proposed update'}: w − ηg = {fmt(weight, 3)} − {fmt(eta, 2)} × ({fmt(run.gradient, 3)}) = <strong>{fmt(run.after.weight, 3)}</strong></p>
      <p>P({correct}): {fmt(run.before.probabilities[0], 3)} → {fmt(run.after.probabilities[0], 3)} · L: {fmt(run.before.loss, 6)} → <span className="learning-update__after-loss">{fmt(run.after.loss, 6)}</span></p>
    </div>
    <button className="btn" onClick={() => { setWeight(run.after.weight); setSteps(s => s + 1); }}>{ko ? '이 갱신을 한 번 적용' : 'Apply this update once'}</button>
    <p className="learning-update__steps">{ko ? '적용한 갱신' : 'Updates applied'}: {steps}</p>
    <p className="lab__hint">{ko ? '입력 1에서는 계수를 키우는 쪽, 입력 −1에서는 줄이는 쪽으로 움직입니다. 입력 0이면 계수를 바꿔도 점수가 그대로여서 기울기는 0입니다. 적용하기 전에 방향을 예측하세요. 이 계산은 가중치 한 개의 갱신이며, 실제 LLM 전체의 역전파는 아닙니다.' : 'Input 1 moves the coefficient up; input −1 moves it down. With input 0 the score cannot change with w, so the gradient is 0. Predict the direction before applying. This updates one weight; it is not backpropagation through an entire LLM.'}</p>
  </section>;
}
