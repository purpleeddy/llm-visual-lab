import { useMemo, useState } from 'react';
import { feedForward, layerNormRow } from '../../lib/math/blocks';
import { DEFAULT_X, FFN_B1, FFN_B2, FFN_W1, FFN_W2 } from '../../lib/math/examples';
import { fmt } from '../../lib/math/format';
import { t } from '../../lib/i18n/ui';
import { EXPLORER_TEXT } from '../../lib/i18n/explorers';
import type { Locale } from '../../lib/i18n/routing';

const LAYERS = 6;

function cosine(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const na = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const nb = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return na === 0 || nb === 0 ? 0 : dot / (na * nb);
}

/**
 * One token through six feed-forward layers, with and without the bypass.
 *
 * Everything is the worked example's own arithmetic: `feedForward` with the
 * hand-chosen W, then `layerNormRow`. The table is whatever that produces.
 */
export function ResidualExplorer({ locale }: { locale: Locale }) {
  const ui = t(locale);
  const text = EXPLORER_TEXT[locale].residual;
  const [skip, setSkip] = useState(true);

  const rows = useMemo(() => {
    const input = DEFAULT_X[0];
    const out: { layer: number; values: number[]; sim: number }[] = [{ layer: 0, values: input, sim: 1 }];
    let x = input;
    for (let k = 1; k <= LAYERS; k++) {
      const ff = feedForward([x], FFN_W1, FFN_B1, FFN_W2, FFN_B2).output[0];
      const summed = skip ? x.map((v, i) => v + ff[i]) : ff;
      x = layerNormRow(summed).output;
      out.push({ layer: k, values: x, sim: cosine(input, x) });
    }
    return out;
  }, [skip]);

  return (
    <section className="lab lab--residual" aria-label={text.title}>
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
            <span className="lab__toggle-label" id="res-skip-label">
              {text.skip}
            </span>
            <div className="segmented" role="group" aria-labelledby="res-skip-label">
              <button type="button" aria-pressed={skip} onClick={() => setSkip(true)}>
                {text.skipOn}
              </button>
              <button type="button" aria-pressed={!skip} onClick={() => setSkip(false)}>
                {text.skipOff}
              </button>
            </div>
          </div>
        </div>
      </header>
      <p className="lab__note">{text.note}</p>

      <div className="lab__readout" aria-live="polite">
        <div className="terms__tablewrap">
          <table className="terms__table">
            <thead>
              <tr>
                <th scope="col">{text.layer}</th>
                {rows[0].values.map((_, i) => (
                  <th key={i} scope="col">
                    {i + 1}
                  </th>
                ))}
                <th scope="col">{text.similarity}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.layer} className={r.layer === LAYERS ? 'is-active' : undefined}>
                  <th scope="row">{r.layer === 0 ? text.input : `${text.layer} ${r.layer}`}</th>
                  {r.values.map((v, i) => (
                    <td key={i}>{fmt(v, 3)}</td>
                  ))}
                  <td className="terms__running">{fmt(r.sim, 3)}</td>
                </tr>
              ))}
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
