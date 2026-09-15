import { useMemo, useState } from 'react';
import { positionalEncoding, PE_BASE } from '../../lib/math/positional';
import { fmt } from '../../lib/math/format';
import { t } from '../../lib/i18n/ui';
import { EXPLORER_TEXT } from '../../lib/i18n/explorers';
import type { Locale } from '../../lib/i18n/routing';

const D_MODEL = 4;
const N = 12;

/**
 * The positional encoding with a position and a pair to choose.
 *
 * The same `positionalEncoding` as the static figures; the point of being able
 * to move is that the fast pair and the slow pair behave so differently that a
 * still picture of both never quite lands.
 */
export function PositionExplorer({ locale }: { locale: Locale }) {
  const ui = t(locale);
  const text = EXPLORER_TEXT[locale].position;
  const [pos, setPos] = useState(3);
  const [pair, setPair] = useState(0);

  const pe = useMemo(() => positionalEncoding(N, D_MODEL), []);
  const row = pe.terms[pos];
  const sin = row.find((x) => x.pair === pair && x.kind === 'sin')!;
  const cos = row.find((x) => x.pair === pair && x.kind === 'cos')!;
  const wavelength = pe.wavelengths[pair];

  // Curve geometry
  const W = 420;
  const PAD_L = 28;
  const plotW = W - PAD_L - 16;
  const yMid = 70;
  const AMP = 40;
  const xOf = (p: number) => PAD_L + (p / (N - 1)) * plotW;
  const vOf = (v: number) => yMid - v * AMP;
  const curve = (kind: 'sin' | 'cos') => {
    const divisor = Math.pow(PE_BASE, (2 * pair) / D_MODEL);
    const pts: string[] = [];
    for (let s = 0; s <= 200; s++) {
      const p = (s / 200) * (N - 1);
      const a = p / divisor;
      pts.push(`${s === 0 ? 'M' : 'L'} ${xOf(p).toFixed(1)} ${vOf(kind === 'sin' ? Math.sin(a) : Math.cos(a)).toFixed(1)}`);
    }
    return pts.join(' ');
  };

  const CELL_W = 60;
  const CELL_H = 18;
  const level = (v: number) => Math.max(0, Math.min(7, Math.round(((v + 1) / 2) * 7)));

  return (
    <section className="lab lab--position" aria-label={text.title}>
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
        <div className="lab__toggles">
          <div className="lab__toggle">
            <label className="lab__toggle-label" htmlFor="pe-pos">
              {text.position}: {pos}
            </label>
            <input
              id="pe-pos"
              className="explorer__range"
              type="range"
              min={0}
              max={N - 1}
              step={1}
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
            />
          </div>
          <div className="lab__toggle">
            <span className="lab__toggle-label" id="pe-pair-label">
              {text.pair}
            </span>
            <div className="segmented" role="group" aria-labelledby="pe-pair-label">
              {text.pairs.map((name, i) => (
                <button key={name} type="button" aria-pressed={pair === i} onClick={() => setPair(i)}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>
      <p className="lab__note">{text.note}</p>

      <div className="explorer__panels">
        <svg viewBox={`0 0 ${W} 150`} className="explorer__svg" aria-hidden="true">
          <path className="tmap__line tmap__line--faint" d={`M ${PAD_L} ${yMid} H ${W - 16}`} />
          <path className="pw__curve pw__curve--sin" d={curve('sin')} />
          <path className="pw__curve pw__curve--cos" d={curve('cos')} />
          {Array.from({ length: N }, (_, p) => (
            <text key={p} className="tmap__note" x={xOf(p)} y={yMid + AMP + 22} textAnchor="middle">
              {p}
            </text>
          ))}
          <line x1={xOf(pos)} x2={xOf(pos)} y1={yMid - AMP - 6} y2={yMid + AMP + 6} stroke="var(--accent)" strokeDasharray="3 3" />
          <circle className="pw__dot pw__dot--sin" cx={xOf(pos)} cy={vOf(sin.value)} r="4.5" />
          <circle className="pw__dot pw__dot--cos" cx={xOf(pos)} cy={vOf(cos.value)} r="4.5" />
          <text className="tp__num" x={xOf(pos) + 8} y={vOf(sin.value) - 6}>
            sin {fmt(sin.value, 3)}
          </text>
          <text className="tp__num" x={xOf(pos) + 8} y={vOf(cos.value) + 14}>
            cos {fmt(cos.value, 3)}
          </text>
          <text className="tmap__note" x={PAD_L} y={16}>
            {text.turn}: {wavelength < 100 ? wavelength.toFixed(1) : Math.round(wavelength)} {locale === 'ko' ? '위치' : 'positions'}
          </text>
          <text className="tmap__note" x={PAD_L} y={148}>
            {text.angle} = {pos} ÷ {fmt(sin.divisor, 1)} = {fmt(sin.angle, 3)}
          </text>
        </svg>

        <svg viewBox={`0 0 ${40 + D_MODEL * CELL_W} ${40 + N * CELL_H + 8}`} className="explorer__svg" aria-hidden="true">
          {Array.from({ length: D_MODEL }, (_, d) => (
            <text
              key={d}
              className="tmap__note"
              x={40 + d * CELL_W + CELL_W / 2}
              y={14}
              textAnchor="middle"
              style={{ fill: Math.floor(d / 2) === pair ? 'var(--accent)' : undefined, fontWeight: Math.floor(d / 2) === pair ? 700 : undefined }}
            >
              {text.slot} {d} · {d % 2 === 0 ? 'sin' : 'cos'}
            </text>
          ))}
          {pe.matrix.map((r, p) => (
            <g key={p}>
              <text className="tmap__note" x={34} y={40 + p * CELL_H + 13} textAnchor="end" style={{ fill: p === pos ? 'var(--accent)' : undefined, fontWeight: p === pos ? 700 : undefined }}>
                {p}
              </text>
              {r.map((v, d) => {
                const on = p === pos && Math.floor(d / 2) === pair;
                return (
                  <g key={d}>
                    <rect
                      className="hp__cell"
                      x={40 + d * CELL_W}
                      y={40 + p * CELL_H}
                      width={CELL_W}
                      height={CELL_H}
                      style={{ fill: `var(--seq-${level(v)})`, stroke: on ? 'var(--accent)' : undefined, strokeWidth: on ? 2 : undefined }}
                    />
                    <text
                      className="hp__value"
                      x={40 + d * CELL_W + CELL_W / 2}
                      y={40 + p * CELL_H + 13}
                      textAnchor="middle"
                      style={{ fill: `var(${level(v) >= 5 ? '--seq-ink-high' : '--seq-ink-low'})` }}
                    >
                      {fmt(v, 2)}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
      </div>

      <div className="lab__readout" aria-live="polite">
        <p className="explorer__line">
          <strong>{text.row}</strong> {pos}: ({pe.matrix[pos].map((v) => fmt(v, 3)).join(', ')})
        </p>
        <p className="explorer__line">
          {text.pairs[pair]}: sin({fmt(sin.angle, 3)}) = {fmt(sin.value, 3)}, cos({fmt(cos.angle, 3)}) = {fmt(cos.value, 3)}
        </p>
      </div>
      <p className="lab__hint">
        <strong>{ui.lab.tryThis}</strong> {text.tryThis}
      </p>
    </section>
  );
}
