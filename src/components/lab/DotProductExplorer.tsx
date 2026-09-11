import { useCallback, useMemo, useState } from 'react';
import { TermExpansion } from './TermExpansion';
import { dotProduct } from '../../lib/math/matrix';
import { fmt } from '../../lib/math/format';
import { t } from '../../lib/i18n/ui';
import type { Locale } from '../../lib/i18n/routing';

export interface DotProductExplorerProps {
  locale: Locale;
  initialU: number[];
  initialV: number[];
  nameU?: string;
  nameV?: string;
}

/**
 * Draws one arrow.
 *
 * Two equal vectors put one arrow exactly on top of the other, so the lower is
 * drawn thick and pale and the upper thin and dark. Both stay visible when
 * they coincide, and they are still told apart when they do not. The labels
 * are pushed in opposite directions for the same reason.
 */
function Arrow({
  x,
  y,
  scale,
  color,
  label,
  markerId,
  layer,
}: {
  x: number;
  y: number;
  scale: number;
  color: string;
  label: string;
  markerId: string;
  /** 'under' is thick and pale, 'over' thin and dark */
  layer: 'under' | 'over';
}) {
  // The SVG y axis grows downward; flip the sign to match the maths.
  const px = x * scale;
  const py = -y * scale;
  const len = Math.hypot(px, py);
  const under = layer === 'under';
  const labelDy = under ? 20 : -12;
  return (
    <g>
      <line
        x1={0}
        y1={0}
        x2={px}
        y2={py}
        stroke={color}
        strokeWidth={under ? 6 : 2.5}
        opacity={under ? 0.45 : 1}
        markerEnd={len > 6 ? `url(#${markerId})` : undefined}
        strokeLinecap="round"
      />
      {len > 2 ? (
        <text
          x={px + (px >= 0 ? 10 : -10)}
          y={py + labelDy}
          fill={color}
          fontSize={13}
          fontWeight={700}
          textAnchor={px >= 0 ? 'start' : 'end'}
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}

/**
 * Shows a dot product both term by term and as two arrows in the plane.
 *
 * The arrow picture is only honest with two coordinates. Vectors in a real
 * model have far more, and there the numbers and the table are what to read.
 */
export function DotProductExplorer({
  locale,
  initialU,
  initialV,
  nameU = 'q',
  nameV = 'k',
}: DotProductExplorerProps) {
  const ui = t(locale);
  const [u, setU] = useState<number[]>(() => [...initialU]);
  const [v, setV] = useState<number[]>(() => [...initialV]);
  const [activeTerm, setActiveTerm] = useState<number | null>(null);

  const result = useMemo(() => dotProduct(u, v), [u, v]);
  const reset = useCallback(() => {
    setU([...initialU]);
    setV([...initialV]);
    setActiveTerm(null);
  }, [initialU, initialV]);

  const drawable = u.length === 2 && v.length === 2;
  const extent = Math.max(3, ...u.map(Math.abs), ...v.map(Math.abs));
  const size = 210;
  const half = size / 2;
  const scale = (half - 26) / extent;
  const ticks = Array.from({ length: 2 * Math.ceil(extent) + 1 }, (_, i) => i - Math.ceil(extent));

  const lenU = Math.hypot(...u);
  const lenV = Math.hypot(...v);
  const cos = lenU > 0 && lenV > 0 ? result.value / (lenU * lenV) : Number.NaN;

  return (
    <section className="lab lab--dot" aria-label={ui.math.dotProduct}>
      <div className="lab__dotrow">
        {drawable ? (
          <figure className="lab__figure">
            <svg
              viewBox={`${-half} ${-half} ${size} ${size}`}
              width={size}
              height={size}
              role="img"
              aria-label={`${nameU} = (${u.join(', ')}), ${nameV} = (${v.join(', ')}), ${ui.math.dotProduct} ${fmt(result.value)}`}
            >
              <defs>
                <marker id="arrow-u" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="3.2" markerHeight="3.2" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--data-q)" />
                </marker>
                <marker id="arrow-v" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--data-k)" />
                </marker>
              </defs>
              {ticks.map((tk) => (
                <g key={tk}>
                  <line
                    x1={tk * scale}
                    y1={-half + 6}
                    x2={tk * scale}
                    y2={half - 6}
                    stroke="var(--line-1)"
                    strokeWidth={tk === 0 ? 0 : 1}
                  />
                  <line
                    x1={-half + 6}
                    y1={tk * scale}
                    x2={half - 6}
                    y2={tk * scale}
                    stroke="var(--line-1)"
                    strokeWidth={tk === 0 ? 0 : 1}
                  />
                </g>
              ))}
              <line x1={-half + 6} y1={0} x2={half - 6} y2={0} stroke="var(--ink-3)" strokeWidth={1.25} />
              <line x1={0} y1={-half + 6} x2={0} y2={half - 6} stroke="var(--ink-3)" strokeWidth={1.25} />
              <Arrow x={u[0]} y={u[1]} scale={scale} color="var(--data-q)" label={nameU} markerId="arrow-u" layer="under" />
              <Arrow x={v[0]} y={v[1]} scale={scale} color="var(--data-k)" label={nameV} markerId="arrow-v" layer="over" />
            </svg>
          </figure>
        ) : null}

        <div className="lab__dotinputs">
          {[
            { name: nameU, vec: u, set: setU, tone: 'q' as const },
            { name: nameV, vec: v, set: setV, tone: 'k' as const },
          ].map(({ name, vec, set, tone }) => (
            <div key={name} className={`vecinput vecinput--${tone}`}>
              <span className="vecinput__name">{name}</span>
              <span className="vecinput__paren" aria-hidden="true">
                (
              </span>
              {vec.map((value, i) => (
                <input
                  key={i}
                  className={`vecinput__field${activeTerm === i ? ' is-active' : ''}`}
                  type="number"
                  step={1}
                  value={value}
                  aria-label={`${name} ${i + 1}`}
                  onFocus={(e) => {
                    e.currentTarget.select();
                    setActiveTerm(i);
                  }}
                  onBlur={() => setActiveTerm(null)}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n)) set((prev) => prev.map((x, j) => (j === i ? n : x)));
                  }}
                />
              ))}
              <span className="vecinput__paren" aria-hidden="true">
                )
              </span>
            </div>
          ))}

          <dl className="lab__stats">
            <div>
              <dt>{`|${nameU}|`}</dt>
              <dd>{fmt(lenU)}</dd>
            </div>
            <div>
              <dt>{`|${nameV}|`}</dt>
              <dd>{fmt(lenV)}</dd>
            </div>
            <div>
              <dt>cos θ</dt>
              <dd>{Number.isFinite(cos) ? fmt(cos) : '—'}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="lab__readout" aria-live="polite">
        <TermExpansion
          terms={result.terms}
          leftLabel={nameU}
          rightLabel={nameV}
          resultLabel={`${nameU} · ${nameV}`}
          showSentence={false}
          value={result.value}
          activeTerm={activeTerm}
          onTermFocus={setActiveTerm}
          labels={{ term: ui.lab.term, product: ui.lab.product, sum: ui.lab.sum }}
        />
      </div>

      <div className="lab__footer">
        <button type="button" className="btn" onClick={reset}>
          {ui.lab.reset}
        </button>
      </div>
    </section>
  );
}
