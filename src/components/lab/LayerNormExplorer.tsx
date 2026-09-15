import { useCallback, useMemo, useState } from 'react';
import { layerNormRow } from '../../lib/math/blocks';
import { fmt, fmtCompact } from '../../lib/math/format';
import { t } from '../../lib/i18n/ui';
import { EXPLORER_TEXT } from '../../lib/i18n/explorers';
import type { Locale } from '../../lib/i18n/routing';

const INITIAL = [2, 8, 4, 6];

/**
 * Layer normalization on one editable row.
 *
 * The two group controls — add to all, multiply all — exist to make the one
 * fact that matters observable: the output ignores both. Only γ and β change it.
 */
export function LayerNormExplorer({ locale }: { locale: Locale }) {
  const ui = t(locale);
  const text = EXPLORER_TEXT[locale].layerNorm;
  const [values, setValues] = useState<number[]>(INITIAL);
  const [shift, setShift] = useState(0);
  const [scale, setScale] = useState(1);
  const [gamma, setGamma] = useState(1);
  const [beta, setBeta] = useState(0);

  const effective = useMemo(() => values.map((v) => v * scale + shift), [values, scale, shift]);
  const r = useMemo(
    () => layerNormRow(effective, effective.map(() => gamma), effective.map(() => beta)),
    [effective, gamma, beta],
  );
  const reset = useCallback(() => {
    setValues(INITIAL);
    setShift(0);
    setScale(1);
    setGamma(1);
    setBeta(0);
  }, []);

  const stages = [r.input, r.centred, r.output];
  const BAR_W = 26;
  const BAR_GAP = 8;
  const PANEL_W = values.length * (BAR_W + BAR_GAP) + 12;
  const PANEL_GAP = 40;
  const xOf = (s: number) => 16 + s * (PANEL_W + PANEL_GAP);
  const yBase = 120;
  const maxAbs = Math.max(1, ...stages.flat().map((v) => Math.abs(v)));
  const SCALE = 80 / maxAbs;
  const W = 16 + 3 * PANEL_W + 2 * PANEL_GAP + 8;

  return (
    <section className="lab lab--layernorm" aria-label={text.title}>
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
        <button type="button" className="btn lab__reset" onClick={reset}>
          {ui.lab.reset}
        </button>
      </header>
      <p className="lab__note">{text.note}</p>

      <div className="explorer__controls">
        <div className="explorer__control explorer__control--wide">
          <span className="lab__toggle-label">{text.values}</span>
          <div className="explorer__numbers">
            {values.map((v, i) => (
              <input
                key={i}
                className="softmax__score"
                type="number"
                step={1}
                value={v}
                aria-label={`${text.values} ${i + 1}`}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) setValues((prev) => prev.map((x, j) => (j === i ? n : x)));
                }}
              />
            ))}
          </div>
        </div>
        <div className="explorer__control">
          <label className="lab__toggle-label" htmlFor="ln-shift">
            {text.addToAll}: {shift >= 0 ? `+${shift}` : shift}
          </label>
          <input id="ln-shift" className="explorer__range" type="range" min={-10} max={10} step={1} value={shift} onChange={(e) => setShift(Number(e.target.value))} />
        </div>
        <div className="explorer__control">
          <label className="lab__toggle-label" htmlFor="ln-scale">
            {text.multiplyAll}: ×{scale}
          </label>
          <input id="ln-scale" className="explorer__range" type="range" min={0.5} max={4} step={0.5} value={scale} onChange={(e) => setScale(Number(e.target.value))} />
        </div>
        <div className="explorer__control">
          <label className="lab__toggle-label" htmlFor="ln-gamma">
            {text.gamma}: {gamma}
          </label>
          <input id="ln-gamma" className="explorer__range" type="range" min={0} max={3} step={0.5} value={gamma} onChange={(e) => setGamma(Number(e.target.value))} />
        </div>
        <div className="explorer__control">
          <label className="lab__toggle-label" htmlFor="ln-beta">
            {text.beta}: {beta}
          </label>
          <input id="ln-beta" className="explorer__range" type="range" min={-2} max={2} step={0.5} value={beta} onChange={(e) => setBeta(Number(e.target.value))} />
        </div>
      </div>

      <svg viewBox={`0 0 ${W} 190`} className="explorer__svg explorer__svg--bars" aria-hidden="true">
        {stages.map((vals, s) => (
          <g key={s}>
            <text className="walk__title" x={xOf(s)} y={22}>
              {text.stages[s]}
            </text>
            <path className={s === 0 ? 'tmap__line tmap__line--faint' : 'tmap__line'} d={`M ${xOf(s)} ${yBase} H ${xOf(s) + PANEL_W - 8}`} />
            {vals.map((v, i) => {
              const h = Math.max(Math.abs(v) * SCALE, 1);
              const top = v >= 0 ? yBase - h : yBase;
              return (
                <g key={i}>
                  <rect className={`lns__bar${v < 0 ? ' lns__bar--neg' : ''}`} x={xOf(s) + i * (BAR_W + BAR_GAP)} y={top} width={BAR_W} height={h} rx="2" style={{ transition: 'y var(--motion) var(--ease), height var(--motion) var(--ease)' }} />
                  <text className="hp__value" x={xOf(s) + i * (BAR_W + BAR_GAP) + BAR_W / 2} y={v >= 0 ? top - 4 : top + h + 11} textAnchor="middle" style={{ fill: 'var(--ink-2)' }}>
                    {fmt(v, 2)}
                  </text>
                </g>
              );
            })}
          </g>
        ))}
      </svg>

      <div className="lab__readout" aria-live="polite">
        <div className="terms__tablewrap">
          <table className="terms__table">
            <tbody>
              <tr>
                <th scope="row">{text.mean}</th>
                <td>{fmtCompact(r.mean)}</td>
                <th scope="row">{text.variance}</th>
                <td>{fmtCompact(r.variance)}</td>
                <th scope="row">{text.denominator}</th>
                <td>{fmt(r.denominator, 3)}</td>
              </tr>
              <tr>
                <th scope="row">{text.output}</th>
                <td colSpan={5} className="terms__running">
                  ({r.output.map((v) => fmt(v, 3)).join(', ')})
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <p className="lab__hint">
        <strong>{ui.lab.tryThis}</strong> {text.tryThis}
      </p>
    </section>
  );
}
