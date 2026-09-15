import { useMemo, useState } from 'react';
import { computeMultiHead } from '../../lib/math/multihead';
import { defaultMultiHeadInput } from '../../lib/math/examples';
import { fmt, heatLevel } from '../../lib/math/format';
import { t } from '../../lib/i18n/ui';
import { EXPLORER_TEXT } from '../../lib/i18n/explorers';
import type { Locale } from '../../lib/i18n/routing';

/**
 * The two heads' weights with a query token to pick.
 *
 * The grids are `computeMultiHead` on the worked example, as in the static
 * figure; choosing a row is what lets the reader compare one token's two
 * readings instead of two whole grids at once.
 */
export function HeadPatternsExplorer({ locale }: { locale: Locale }) {
  const ui = t(locale);
  const text = EXPLORER_TEXT[locale].heads;
  const [q, setQ] = useState(0);
  const result = useMemo(() => computeMultiHead(defaultMultiHeadInput()), []);
  const grids = result.perHead.map((r) => r.weights);
  const n = result.dims.n;

  const CELL = 40;
  const PAD = 26;
  const GAP = 60;
  const gridW = n * CELL;
  const xOf = (g: number) => PAD + g * (gridW + GAP);
  const yTop = 48;
  const W = PAD * 2 + grids.length * gridW + (grids.length - 1) * GAP;

  const describe = (row: number[]) => {
    const max = Math.max(...row);
    const tops = row.map((v, j) => ({ v, j })).filter((x) => max - x.v < 0.02);
    const sep = locale === 'ko' ? '번과 ' : ' and ';
    return `${tops.map((x) => `${x.j + 1}`).join(sep)}${locale === 'ko' ? '번' : ''} (${tops.map((x) => fmt(x.v, 3)).join(', ')})`;
  };

  return (
    <section className="lab lab--heads" aria-label={text.title}>
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
            <span className="lab__toggle-label" id="hp-q-label">
              {text.query}
            </span>
            <div className="segmented" role="group" aria-labelledby="hp-q-label">
              {Array.from({ length: n }, (_, i) => (
                <button key={i} type="button" aria-pressed={q === i} onClick={() => setQ(i)}>
                  {ui.lab.tokenLabel.replace('{n}', String(i + 1))}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>
      <p className="lab__note">{text.note}</p>

      <div className="explorer__panels">
        <svg viewBox={`0 0 ${W} ${yTop + n * CELL + 16}`} className="explorer__svg" aria-hidden="true" style={{ maxWidth: `${W}px` }}>
          {grids.map((grid, g) => (
            <g key={g}>
              <text className="walk__title" x={xOf(g)} y={22}>
                {locale === 'ko' ? `갈래 ${g + 1}` : `head ${g + 1}`}
              </text>
              {grid.map((row, i) =>
                row.map((v, j) => (
                  <g key={`${i}-${j}`} style={{ opacity: i === q ? 1 : 0.35, transition: 'opacity var(--motion) var(--ease)' }}>
                    <rect className="hp__cell" x={xOf(g) + j * CELL} y={yTop + i * CELL} width={CELL} height={CELL} style={{ fill: `var(--seq-${heatLevel(v)})` }} />
                    <text className="hp__value" x={xOf(g) + j * CELL + CELL / 2} y={yTop + i * CELL + CELL / 2 + 4} textAnchor="middle" style={{ fill: `var(${heatLevel(v) >= 5 ? '--seq-ink-high' : '--seq-ink-low'})` }}>
                      {fmt(v, 2)}
                    </text>
                  </g>
                )),
              )}
              <rect x={xOf(g) - 2} y={yTop + q * CELL - 2} width={gridW + 4} height={CELL + 4} fill="none" stroke="var(--accent)" strokeWidth="2" rx="3" style={{ transition: 'y var(--motion) var(--ease)' }} />
              {grid.map((_, i) => (
                <text key={i} className="tmap__note" x={xOf(g) - 8} y={yTop + i * CELL + CELL / 2 + 4} textAnchor="end">
                  {i + 1}
                </text>
              ))}
              {grid[0].map((_, j) => (
                <text key={j} className="tmap__note" x={xOf(g) + j * CELL + CELL / 2} y={yTop - 6} textAnchor="middle">
                  {j + 1}
                </text>
              ))}
            </g>
          ))}
        </svg>
      </div>
      <p className="explorer__line" aria-live="polite">
        {text.sentence(q + 1, describe(grids[0][q]), describe(grids[1][q]))}
      </p>
      <p className="lab__hint">
        <strong>{ui.lab.tryThis}</strong> {text.tryThis}
      </p>
    </section>
  );
}
