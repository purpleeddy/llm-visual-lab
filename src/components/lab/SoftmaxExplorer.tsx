import { useCallback, useMemo, useState } from 'react';
import { softmaxRow } from '../../lib/math/softmax';
import { fmt, fmtPercent } from '../../lib/math/format';
import { t } from '../../lib/i18n/ui';
import type { Locale } from '../../lib/i18n/routing';

export interface SoftmaxExplorerProps {
  locale: Locale;
  initialScores: number[];
  labels?: string[];
}

/**
 * Score, exponential and probability side by side, moving together.
 *
 * Raising one score and adding the same number to all of them are offered as
 * separate controls because the difference between them — the first changes
 * the distribution, the second does not — is the heart of softmax.
 */
export function SoftmaxExplorer({ locale, initialScores, labels }: SoftmaxExplorerProps) {
  const ui = t(locale);
  const [scores, setScores] = useState<number[]>(() => [...initialScores]);
  const [shift, setShift] = useState(0);

  const effective = useMemo(() => scores.map((s) => s + shift), [scores, shift]);
  const result = useMemo(() => softmaxRow(effective), [effective]);

  const reset = useCallback(() => {
    setScores([...initialScores]);
    setShift(0);
  }, [initialScores]);

  const names = labels ?? scores.map((_, i) => `${i + 1}`);
  const bump = (i: number, delta: number) =>
    setScores((prev) => prev.map((s, j) => (j === i ? Number((s + delta).toFixed(4)) : s)));

  return (
    <section className="lab lab--softmax" aria-label={ui.math.softmax}>
      <div className="softmax__rows">
        {result.terms.map((term, i) => (
          <div key={i} className="softmax__row">
            <span className="softmax__label">{names[i]}</span>

            <div className="softmax__stepper">
              <button
                type="button"
                className="btn btn--ghost softmax__bump"
                onClick={() => bump(i, -1)}
                aria-label={`${names[i]} ${ui.math.decrease}`}
              >
                −
              </button>
              <input
                className="softmax__score"
                type="number"
                step={0.5}
                value={scores[i]}
                aria-label={`${names[i]} ${ui.math.scores}`}
                onFocus={(e) => e.currentTarget.select()}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  if (Number.isFinite(n)) setScores((prev) => prev.map((s, j) => (j === i ? n : s)));
                }}
              />
              <button
                type="button"
                className="btn btn--ghost softmax__bump"
                onClick={() => bump(i, 1)}
                aria-label={`${names[i]} ${ui.math.increase}`}
              >
                +
              </button>
            </div>

            <span className="softmax__arrow" aria-hidden="true">
              →
            </span>
            <span className="softmax__exp" title="exp">
              {fmt(term.exp, 3)}
            </span>
            <span className="softmax__arrow" aria-hidden="true">
              →
            </span>

            <div className="softmax__barwrap">
              <div
                className="softmax__bar"
                style={{ width: `${Math.max(term.probability * 100, 0.6)}%` }}
              />
              <span className="softmax__pct">{fmtPercent(term.probability)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="softmax__controls">
        <div className="softmax__shift">
          <label htmlFor="softmax-shift">{ui.math.addToAll}</label>
          <input
            id="softmax-shift"
            type="range"
            min={-10}
            max={10}
            step={1}
            value={shift}
            onChange={(e) => setShift(Number(e.target.value))}
          />
          <output htmlFor="softmax-shift" className="softmax__shiftval">
            {shift >= 0 ? `+${shift}` : shift}
          </output>
        </div>
        <button type="button" className="btn" onClick={reset}>
          {ui.lab.reset}
        </button>
      </div>

      <div className="lab__readout" aria-live="polite">
        <div className="terms__tablewrap">
          <table className="terms__table">
            <thead>
              <tr>
                <th scope="col">{ui.math.position}</th>
                <th scope="col">{ui.lab.score}</th>
                <th scope="col">{ui.lab.shifted}</th>
                <th scope="col">exp</th>
                <th scope="col">{ui.lab.probability}</th>
              </tr>
            </thead>
            <tbody>
              {result.terms.map((term, i) => (
                <tr key={i}>
                  <th scope="row">{names[i]}</th>
                  <td>{fmt(term.score)}</td>
                  <td>{term.shifted === null ? '—' : fmt(term.shifted)}</td>
                  <td>{fmt(term.exp)}</td>
                  <td className="terms__running">{fmt(term.probability)}</td>
                </tr>
              ))}
              <tr className="terms__sumrow">
                <th scope="row">{ui.lab.sum}</th>
                <td>—</td>
                <td>—</td>
                <td>{fmt(result.sumExp)}</td>
                <td className="terms__running">{fmt(1)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
