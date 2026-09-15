import { useMemo, useState } from 'react';
import { beamSearch, greedy, END } from '../../lib/math/generation';
import { TOY_MODEL } from '../../lib/math/examples';
import { fmt } from '../../lib/math/format';
import { t } from '../../lib/i18n/ui';
import { EXPLORER_TEXT } from '../../lib/i18n/explorers';
import type { Locale } from '../../lib/i18n/routing';

/**
 * The toy tree with the beam width to choose.
 *
 * The tree is the toy model; the highlighted path is whatever `greedy` or
 * `beamSearch` returns for the chosen width, and the table under it lists what
 * each step kept. Nothing about the search is drawn by hand.
 */
export function BeamExplorer({ locale }: { locale: Locale }) {
  const ui = t(locale);
  const text = EXPLORER_TEXT[locale].beam;
  const [width, setWidth] = useState(1);

  const run = useMemo(() => (width === 1 ? greedy(TOY_MODEL) : beamSearch(TOY_MODEL, width)), [width]);
  const path = run.best.tokens;
  const onPath = (p: string[]) => p.every((tk, i) => path[i] === tk);

  const level1 = Object.entries(TOY_MODEL['']);
  const level2 = level1.map(([tok]) => ({ parent: tok, children: Object.entries(TOY_MODEL[tok] ?? {}) }));

  const ROOT_X = 24;
  const L1_X = 150;
  const L2_X = 330;
  const NODE_W = 40;
  const NODE_H = 26;
  const yMid = 140;
  const l1Y = (i: number) => 44 + i * 92;
  const l2Y = (p: number, i: number, total: number) => l1Y(p) - ((total - 1) * 24) / 2 + i * 24;
  const W = 460;

  return (
    <section className="lab lab--beam" aria-label={text.title}>
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
            <span className="lab__toggle-label" id="beam-width-label">
              {text.width}
            </span>
            <div className="segmented" role="group" aria-labelledby="beam-width-label">
              {text.widths.map((name, i) => (
                <button key={name} type="button" aria-pressed={width === i + 1} onClick={() => setWidth(i + 1)}>
                  {name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>
      <p className="lab__note">{text.note}</p>

      <div className="explorer__panels">
        <svg viewBox={`0 0 ${W} 300`} className="explorer__svg" aria-hidden="true">
          <rect className="tmap__box tmap__box--embed" x={ROOT_X} y={yMid - NODE_H / 2} width={52} height={NODE_H} rx="4" />
          <text className="tmap__note" x={ROOT_X + 26} y={yMid + 4} textAnchor="middle">
            {locale === 'ko' ? '시작' : 'start'}
          </text>
          {level1.map(([tok, p], i) => (
            <g key={tok}>
              <path
                className={`bt__edge${onPath([tok]) ? ' bt__edge--beam' : ''}`}
                d={`M ${ROOT_X + 54} ${yMid} C ${ROOT_X + 100} ${yMid}, ${L1_X - 46} ${l1Y(i) + NODE_H / 2}, ${L1_X - 2} ${l1Y(i) + NODE_H / 2}`}
              />
              <text className="tmap__note" x={(ROOT_X + 54 + L1_X) / 2} y={(yMid + l1Y(i) + NODE_H / 2) / 2 - 6} textAnchor="middle">
                {p}
              </text>
              <rect className="tmap__box tmap__box--head" x={L1_X} y={l1Y(i)} width={NODE_W} height={NODE_H} rx="4" />
              <text className="tmap__head" x={L1_X + NODE_W / 2} y={l1Y(i) + 18} textAnchor="middle">
                {tok}
              </text>
              {level2[i].children.map(([tok2, p2], j) => {
                const y = l2Y(i, j, level2[i].children.length);
                return (
                  <g key={tok2}>
                    <path
                      className={`bt__edge${onPath([tok, tok2]) ? ' bt__edge--beam' : ''}`}
                      d={`M ${L1_X + NODE_W + 2} ${l1Y(i) + NODE_H / 2} C ${L1_X + 80} ${l1Y(i) + NODE_H / 2}, ${L2_X - 56} ${y + 9}, ${L2_X - 2} ${y + 9}`}
                    />
                    <rect className={`tmap__box${tok2 === END ? ' tmap__box--norm' : ''}`} x={L2_X} y={y} width={NODE_W} height={18} rx="3" />
                    <text className="hp__value" x={L2_X + NODE_W / 2} y={y + 13} textAnchor="middle" style={{ fill: 'var(--ink-1)' }}>
                      {tok2}
                    </text>
                    <text className="tmap__note" x={L2_X + NODE_W + 6} y={y + 13}>
                      {p2}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>

        <div className="lab__readout" aria-live="polite">
          <p className="explorer__line">
            <strong>{text.result}</strong> {path.join(' ')}
          </p>
          <p className="explorer__line">
            <strong>{text.probability}</strong> {fmt(run.best.probability, 3)}
          </p>
          <div className="terms__tablewrap">
            <table className="terms__table">
              <thead>
                <tr>
                  <th scope="col">{text.step}</th>
                  <th scope="col">{text.kept}</th>
                </tr>
              </thead>
              <tbody>
                {run.steps.map((s) => (
                  <tr key={s.step}>
                    <th scope="row">{s.step}</th>
                    <td>
                      {s.kept.map((c) => (
                        <span key={c.tokens.join(' ')} className="beam__cand">
                          {c.tokens.join(' ')} ({fmt(c.probability, 3)})
                        </span>
                      ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <p className="lab__hint">
        <strong>{ui.lab.tryThis}</strong> {text.tryThis}
      </p>
    </section>
  );
}
