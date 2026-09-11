import type { ProductTerm } from '../../lib/math/matrix';
import { fmt, fmtCompact } from '../../lib/math/format';

export interface TermExpansionProps {
  terms: ProductTerm[];
  /** Where the left-hand value came from, e.g. "row 1 of Q" */
  leftLabel: string;
  /** Where the right-hand value came from, e.g. "column 2 of Kᵀ" */
  rightLabel: string;
  /** The name of the result cell, e.g. "S₁,₂" */
  resultLabel: string;
  value: number;
  activeTerm?: number | null;
  onTermFocus?: (index: number | null) => void;
  decimals?: number;
  compact?: boolean;
  /** Whether to show the one-line summary. Turned off when the two labels
   * repeat the result name. */
  showSentence?: boolean;
  labels: {
    term: string;
    product: string;
    sum: string;
  };
}

/**
 * Opens up, term by term, the sum of products behind a single cell.
 * Used by the matrix-product cell, the dot product and the attention scores.
 */
export function TermExpansion({
  terms,
  leftLabel,
  rightLabel,
  resultLabel,
  value,
  activeTerm = null,
  onTermFocus,
  decimals = 3,
  compact = true,
  showSentence = true,
  labels,
}: TermExpansionProps) {
  const f = (v: number) => (compact ? fmtCompact(v, decimals) : fmt(v, decimals));

  return (
    <div className="terms">
      {showSentence ? (
        <p className="terms__sentence">
          <span className="terms__result">{resultLabel}</span>
          <span className="terms__eq">=</span>
          <span className="terms__source terms__source--left">{leftLabel}</span>
          <span className="terms__dot">·</span>
          <span className="terms__source terms__source--right">{rightLabel}</span>
        </p>
      ) : null}

      <p className="terms__inline" aria-hidden="true">
        {terms.map((t, i) => (
          <span
            key={t.k}
            className={`terms__chunk${activeTerm === i ? ' is-active' : ''}`}
            onMouseEnter={() => onTermFocus?.(i)}
            onMouseLeave={() => onTermFocus?.(null)}
          >
            {i > 0 ? <span className="terms__plus">+</span> : null}
            <span className="terms__a">{f(t.a)}</span>
            <span className="terms__times">×</span>
            <span className="terms__b">{f(t.b)}</span>
          </span>
        ))}
        <span className="terms__plus">=</span>
        <span className="terms__total">{f(value)}</span>
      </p>

      <div className="terms__tablewrap">
        <table className="terms__table">
          <thead>
            <tr>
              <th scope="col">{labels.term}</th>
              <th scope="col" className="terms__col--left">
                {leftLabel}
              </th>
              <th scope="col" className="terms__col--right">
                {rightLabel}
              </th>
              <th scope="col">{labels.product}</th>
              <th scope="col">{labels.sum}</th>
            </tr>
          </thead>
          <tbody>
            {terms.map((t, i) => (
              <tr
                key={t.k}
                className={activeTerm === i ? 'is-active' : undefined}
                onMouseEnter={() => onTermFocus?.(i)}
                onMouseLeave={() => onTermFocus?.(null)}
              >
                <th scope="row">{i + 1}</th>
                <td className="terms__col--left">{f(t.a)}</td>
                <td className="terms__col--right">{f(t.b)}</td>
                <td>{f(t.product)}</td>
                <td className="terms__running">{f(t.runningSum)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
