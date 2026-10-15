import { ScrollRegion } from './ScrollRegion';
import { useEffect, useMemo, useState } from 'react';
import { crossEntropy, labelSmoothed, oneHot } from '../../lib/math/training';
import { LABEL_SMOOTHING, LOSS_EXAMPLE, LEARNING_EXAMPLE } from '../../lib/math/examples';
import { fmt } from '../../lib/math/format';
import { t } from '../../lib/i18n/ui';
import { EXPLORER_TEXT } from '../../lib/i18n/explorers';
import type { Locale } from '../../lib/i18n/routing';

/**
 * Cross-entropy with the probability on the right word, and ε, to move.
 *
 * The other three probabilities keep their proportions, so the guess stays a
 * distribution. Both losses are `crossEntropy`, nothing precomputed.
 */
export function LossExplorer({ locale }: { locale: Locale }) {
  const ui = t(locale);
  const text = EXPLORER_TEXT[locale].loss;
  const vocabulary = LEARNING_EXAMPLE[locale].vocabulary;
  const { probabilities: base, target } = LOSS_EXAMPLE;
  const [p, setP] = useState(base[target]);
  const [eps, setEps] = useState(LABEL_SMOOTHING);
  const [ready, setReady] = useState(false);
  // Enable input after React commits, so a very early edit cannot be overwritten by hydration.
  useEffect(() => setReady(true), []);

  const probs = useMemo(() => {
    const restBase = base.reduce((s, v, i) => (i === target ? s : s + v), 0);
    return base.map((v, i) => (i === target ? p : ((1 - p) * v) / restBase));
  }, [base, target, p]);
  const hard = useMemo(() => oneHot(base.length, target), [base.length, target]);
  const soft = useMemo(() => labelSmoothed(base.length, target, eps), [base.length, target, eps]);
  const hardLoss = crossEntropy(probs, hard).loss;
  const softLoss = crossEntropy(probs, soft).loss;

  // Bars
  const BAR_W = 22;
  const BAR_GAP = 8;
  const PANEL_W = base.length * (BAR_W + BAR_GAP) + 8;
  const PANEL_GAP = 34;
  const xOf = (k: number) => 12 + k * (PANEL_W + PANEL_GAP);
  const yBase = 118;
  const SCALE = 84;
  const panels = [
    { values: probs, tone: 'lp__bar--guess', head: text.guess, cap: `${vocabulary[target]}: ${fmt(p, 2)}` },
    { values: hard, tone: 'lp__bar--target', head: text.hard, cap: `${text.loss} = ${fmt(hardLoss, 3)}` },
    { values: soft, tone: 'lp__bar--target', head: text.soft, cap: `${text.loss} = ${fmt(softLoss, 3)}` },
  ];
  const W = 12 + 3 * PANEL_W + 2 * PANEL_GAP + 8;

  // The −ln curve
  const CW = 300;
  const CH = 170;
  const cPadL = 34;
  const cPadB = 30;
  const cx = (q: number) => cPadL + q * (CW - cPadL - 12);
  const maxLoss = 4.7; // −ln(0.01)
  const cy = (l: number) => CH - cPadB - (Math.min(l, maxLoss) / maxLoss) * (CH - cPadB - 12);
  const curve = Array.from({ length: 100 }, (_, i) => {
    const q = 0.01 + (i / 99) * 0.99;
    return `${i === 0 ? 'M' : 'L'} ${cx(q).toFixed(1)} ${cy(-Math.log(q)).toFixed(1)}`;
  }).join(' ');

  return (
    <section className="lab lab--loss" aria-label={text.title}>
      <header className="lab__header">
        <div>
          <h3 className="lab__title">{text.title}</h3>
          <p className="lab__kind">
            <span className="badge badge--complete">
              <span className="badge__dot" />
              {text.kind}
            </span>
          </p>
        </div>
        <button type="button" className="btn lab__reset" disabled={!ready} onClick={() => { setP(base[target]); setEps(LABEL_SMOOTHING); }}>{ui.lab.reset}</button>
      </header>
      <p className="lab__note">{text.note}</p>
      <p className="lab__note">{locale === 'ko' ? '후보 순서' : 'Candidate order'}: {vocabulary.map((token, i) => `${i} = ${token === '.' ? (locale === 'ko' ? '끝 표시' : 'end') : token}`).join(' · ')}. {locale === 'ko' ? `지금 정답은 ${vocabulary[target]}입니다.` : `The target here is ${vocabulary[target]}.`}</p>

      <div className="explorer__controls">
        <div className="explorer__control">
          <label className="lab__toggle-label" htmlFor="loss-p">
            {text.pCorrect}: {fmt(p, 2)}
          </label>
          <input id="loss-p" disabled={!ready} className="explorer__range" type="range" min={0.01} max={0.99} step={0.01} value={p} onChange={(e) => setP(Number(e.target.value))} />
        </div>
      </div>

      <p className="loss__basic explorer__line">{text.pCorrect}: {fmt(p, 2)} → −ln({fmt(p, 2)}) = {fmt(hardLoss, 3)}</p>
      <div className="explorer__panels">
        <svg viewBox={`0 0 ${CW} ${CH}`} className="explorer__svg loss__basic-plot" aria-hidden="true">
          <text className="walk__title" x={cPadL} y={14}>
            {text.curve}
          </text>
          <path className="tmap__line tmap__line--faint" d={`M ${cPadL} ${cy(0)} H ${CW - 12} M ${cPadL} ${cy(0)} V 20`} />
          {[0, 0.5, 1].map((q) => (
            <text key={q} className="tmap__note" x={cx(q)} y={CH - cPadB + 14} textAnchor="middle">
              {q}
            </text>
          ))}
          {[1, 2, 3, 4].map((l) => (
            <text key={l} className="tmap__note" x={cPadL - 6} y={cy(l) + 4} textAnchor="end">
              {l}
            </text>
          ))}
          <path className="pw__curve pw__curve--sin" d={curve} />
          <line x1={cx(p)} x2={cx(p)} y1={cy(0)} y2={cy(hardLoss)} stroke="var(--accent)" strokeDasharray="3 3" />
          <circle cx={cx(p)} cy={cy(hardLoss)} r="5" fill="var(--accent)" />
          <text className="tp__num" x={CW - 12} y={Math.max(32, cy(hardLoss) - 8)} textAnchor="end">
            −ln({fmt(p, 2)}) = {fmt(hardLoss, 3)}
          </text>
        </svg>
      </div>

      <details className="expand loss__comparison">
        <summary>{locale === 'ko' ? '선택: 정답 분포를 완화한 손실과 비교' : 'Optional: compare a softened target distribution'}</summary>
        <div className="expand__body">
          <p>{locale === 'ko' ? '정답에만 1을 주는 분포와, 일부를 모든 후보에 나누는 분포를 비교합니다. ε을 0으로 두면 두 손실이 같아집니다.' : 'Compare a target with probability 1 only on the answer against one that shares some probability across all candidates. At ε = 0 the two losses coincide.'}</p>
        <div className="explorer__control">
          <label className="lab__toggle-label" htmlFor="loss-eps">{text.epsilon}: {fmt(eps, 2)}</label>
          <input id="loss-eps" disabled={!ready} className="explorer__range" type="range" min={0} max={0.3} step={0.05} value={eps} onChange={e => setEps(Number(e.target.value))} />
        </div>
          <ScrollRegion className="explorer__plot-scroll" locale={locale} label={locale === 'ko' ? '예측과 정답 분포 비교' : 'Prediction and target comparison'}>
        <svg viewBox={`0 0 ${W} 160`} className="explorer__svg" width={W} height={160} aria-hidden="true">
          {panels.map((panel, k) => (
            <g key={k}>
              <text className="walk__title" x={xOf(k)} y={18}>
                {panel.head}
              </text>
              <path className="tmap__line tmap__line--faint" d={`M ${xOf(k)} ${yBase} H ${xOf(k) + PANEL_W - 8}`} />
              {panel.values.map((v, i) => {
                const h = Math.max(v * SCALE, 1);
                return (
                  <g key={i}>
                    <rect className={`lp__bar ${panel.tone}${i === target ? ' lp__bar--right' : ''}`} x={xOf(k) + i * (BAR_W + BAR_GAP)} y={yBase - h} width={BAR_W} height={h} rx="2" style={{ transition: 'y var(--motion) var(--ease), height var(--motion) var(--ease)' }} />
                    <text className="hp__value" x={xOf(k) + i * (BAR_W + BAR_GAP) + BAR_W / 2} y={yBase - h - 4} textAnchor="middle" style={{ fill: 'var(--ink-2)' }}>
                      {fmt(v, 2)}
                    </text>
                    <text className="tmap__note" x={xOf(k) + i * (BAR_W + BAR_GAP) + BAR_W / 2} y={yBase + 13} textAnchor="middle">
                      {i}
                    </text>
                  </g>
                );
              })}
              <text className="tmap__note" x={xOf(k)} y={yBase + 34} style={{ fill: 'var(--ink-1)' }}>
                {panel.cap}
              </text>
            </g>
          ))}
        </svg>


          </ScrollRegion>
        </div>
      </details>

      <p className="lab__hint">
        <strong>{ui.lab.tryThis}</strong> {text.tryThis}
      </p>
    </section>
  );
}
