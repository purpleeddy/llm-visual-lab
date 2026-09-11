import { useId } from 'react';
import type { Tone } from './MatrixGrid';
import { fmtInput, parseNumber } from '../../lib/math/format';

export interface EditableMatrixProps {
  matrix: number[][];
  name: string;
  shape?: string;
  rowLabels?: string[];
  colLabels?: string[];
  tone?: Tone;
  onChange: (row: number, col: number, value: number) => void;
  step?: number;
  describedBy?: string;
  /** The row the selected result cell draws on */
  highlightRow?: number | null;
  /** The column the selected result cell draws on */
  highlightCol?: number | null;
  /** Which term is currently being looked at */
  activeTerm?: number | null;
  /** Whether activeTerm runs along a row or down a column */
  activeTermAxis?: 'row' | 'col';
  /** The name the connectors use to find this matrix */
  matrixId?: string;
}

/**
 * A matrix whose numbers can be edited directly.
 *
 * Nothing here needs dragging, so every value is reachable from the keyboard.
 * The row and column highlight for a selected result cell is shown on this
 * same matrix; a separate copy just for highlighting would leave the reader
 * unsure which one to look at.
 */
export function EditableMatrix({
  matrix,
  name,
  shape,
  rowLabels,
  colLabels,
  tone = 'input',
  onChange,
  step = 1,
  describedBy,
  highlightRow = null,
  highlightCol = null,
  activeTerm = null,
  activeTermAxis = 'row',
  matrixId,
}: EditableMatrixProps) {
  const id = useId();

  return (
    <div className={`emat emat--${tone}`} data-matrix={matrixId ?? name}>
      <div className="emat__head">
        <span className="emat__name">{name}</span>
        {shape ? <span className="emat__shape">{shape}</span> : null}
      </div>
      <div className="emat__scroll">
        <table className="emat__table">
          {colLabels ? (
            <thead>
              <tr>
                <td className="emat__corner" />
                {colLabels.map((label, c) => (
                  <th
                    key={c}
                    scope="col"
                    className={`emat__collabel${highlightCol === c ? ' is-hl' : ''}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {matrix.map((row, r) => (
              <tr key={r}>
                {rowLabels ? (
                  <th
                    scope="row"
                    className={`emat__rowlabel${highlightRow === r ? ' is-hl' : ''}`}
                  >
                    {rowLabels[r]}
                  </th>
                ) : (
                  <td className="emat__corner" />
                )}
                {row.map((value, c) => {
                  const inRow = highlightRow === r;
                  const inCol = highlightCol === c;
                  const isTerm =
                    activeTerm !== null &&
                    ((activeTermAxis === 'row' && inRow && c === activeTerm) ||
                      (activeTermAxis === 'col' && inCol && r === activeTerm));
                  const cls = [
                    'emat__input',
                    inRow ? 'is-in-row' : '',
                    inCol ? 'is-in-col' : '',
                    isTerm ? 'is-term' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <td key={c} data-r={r} data-c={c} className="emat__td">
                      <input
                        id={`${id}-${r}-${c}`}
                        className={cls}
                        type="number"
                        inputMode="decimal"
                        step={step}
                        value={fmtInput(value)}
                        aria-label={`${name} ${rowLabels ? rowLabels[r] : `row ${r + 1}`}, ${
                          colLabels ? colLabels[c] : `column ${c + 1}`
                        }`}
                        aria-describedby={describedBy}
                        onChange={(e) => {
                          const parsed = parseNumber(e.target.value);
                          if (parsed !== null) onChange(r, c, parsed);
                        }}
                        onFocus={(e) => e.currentTarget.select()}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
