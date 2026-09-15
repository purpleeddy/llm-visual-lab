import { useMemo, useState } from 'react';
import { crossEntropy, labelSmoothed, oneHot } from '../../lib/math/training';
import { LABEL_SMOOTHING, LOSS_EXAMPLE, LOSS_VOCABULARY } from '../../lib/math/examples';
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
  const { probabilities: base, target } = LOSS_EXAMPLE;
  const [p, setP] = useState(base[target]);
  const [eps, setEps] = useState(LABEL_SMOOTHING);

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
    { values: probs, tone: 'lp__bar--guess', head: text.guess, cap: `${LOSS_VOCABULARY[target]}: ${fmt(p, 2)}` },
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
      </header>
      <p className="lab__note">{text.note}</p>

      <div className="explorer__controls">
        <div className="explorer__control">
          <label className="lab__toggle-label" htmlFor="loss-p">
            {text.pCorrect}: {fmt(p, 2)}
          </label>
          <input id="loss-p" className="explorer__range" type="range" min={0.01} max={0.99} step={0.01} value={p} onChange={(e) => setP(Number(e.target.value))} />
        </div>
        <div className="explorer__control">
          <label className="lab__toggle-label" htmlFor="loss-eps">
            {text.epsilon}: {fmt(eps, 2)}
          </label>
          <input id="loss-eps" className="explorer__range" type="range" min={0} max={0.3} step={0.05} value={eps} onChange={(e) => setEps(Number(e.target.value))} />
        </div>
      </div>

      <div className="explorer__panels">
        <svg viewBox={`0 0 ${W} 160`} className="explorer__svg" aria-hidden="true">
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
                      {LOSS_VOCABULARY[i]}
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

        <svg viewBox={`0 0 ${CW} ${CH}`} className="explorer__svg" aria-hidden="true">
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
          <text className="tp__num" x={Math.min(cx(p) + 8, CW - 70)} y={cy(hardLoss) - 8}>
            −ln({fmt(p, 2)}) = {fmt(hardLoss, 3)}
          </text>
        </svg>
      </div>

      <p className="lab__hint">
        <strong>{ui.lab.tryThis}</strong> {text.tryThis}
      </p>
    </section>
  );
}
