import { useCallback, useId, useRef } from 'react';
import { fmt, fmtCompact, heatLevel } from '../../lib/math/format';

export type Tone = 'neutral' | 'q' | 'k' | 'v' | 'score' | 'weight' | 'input';

export interface CellRef {
  row: number;
  col: number;
}

export interface MatrixGridProps {
  matrix: number[][];
  /** The matrix name: the visible label and part of the accessible name */
  name: string;
  /** The size, written beside the name, e.g. "3 × 2" */
  shape?: string;
  rowLabels?: string[];
  colLabels?: string[];
  decimals?: number;
  /** Print integers as integers (for a matrix a person typed) */
  compact?: boolean;
  tone?: Tone;
  selectable?: boolean;
  selected?: CellRef | null;
  onSelect?: (cell: CellRef) => void;
  /** The row to highlight */
  highlightRow?: number | null;
  /** The column to highlight */
  highlightCol?: number | null;
  /** For values in 0..1, such as probabilities, shown as colour strength */
  heatmap?: boolean;
  /** A false entry is a cell the mask has blocked */
  allowed?: boolean[][];
  blockedLabel?: string;
  /** Which term of the product is currently being looked at */
  activeTerm?: number | null;
  /** Whether activeTerm runs along a row or down a column */
  activeTermAxis?: 'row' | 'col';
  caption?: string;
  /** The name the connectors use to find this matrix; falls back to name */
  matrixId?: string;
}

export function MatrixGrid({
  matrix,
  name,
  shape,
  rowLabels,
  colLabels,
  decimals = 3,
  compact = false,
  tone = 'neutral',
  selectable = false,
  selected = null,
  onSelect,
  highlightRow = null,
  highlightCol = null,
  heatmap = false,
  allowed,
  blockedLabel = 'blocked',
  activeTerm = null,
  activeTermAxis = 'row',
  caption,
  matrixId,
}: MatrixGridProps) {
  const gridId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);

  const rows = matrix.length;
  const cols = rows > 0 ? matrix[0].length : 0;

  const focusCell = useCallback((r: number, c: number) => {
    const el = wrapRef.current?.querySelector<HTMLButtonElement>(
      `button[data-r="${r}"][data-c="${c}"]`,
    );
    el?.focus();
  }, []);

  const handleKey = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, r: number, c: number) => {
      let nr = r;
      let nc = c;
      switch (e.key) {
        case 'ArrowUp':
          nr = Math.max(0, r - 1);
          break;
        case 'ArrowDown':
          nr = Math.min(rows - 1, r + 1);
          break;
        case 'ArrowLeft':
          nc = Math.max(0, c - 1);
          break;
        case 'ArrowRight':
          nc = Math.min(cols - 1, c + 1);
          break;
        case 'Home':
          nc = 0;
          break;
        case 'End':
          nc = cols - 1;
          break;
        default:
          return;
      }
      e.preventDefault();
      focusCell(nr, nc);
      onSelect?.({ row: nr, col: nc });
    },
    [rows, cols, focusCell, onSelect],
  );

  return (
    <div className={`mgrid mgrid--${tone}`} ref={wrapRef} data-matrix={matrixId ?? name}>
      <div className="mgrid__head">
        <span className="mgrid__name">{name}</span>
        {shape ? <span className="mgrid__shape">{shape}</span> : null}
      </div>
      <div className="mgrid__scroll">
        <table className="mgrid__table" aria-describedby={caption ? `${gridId}-cap` : undefined}>
          {caption ? (
            <caption id={`${gridId}-cap`} className="visually-hidden">
              {caption}
            </caption>
          ) : null}
          {colLabels ? (
            <thead>
              <tr>
                <td className="mgrid__corner" />
                {colLabels.map((label, c) => (
                  <th
                    key={c}
                    scope="col"
                    className={`mgrid__collabel${highlightCol === c ? ' is-hl' : ''}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {matrix.map((row, r) => (
              <tr key={r} className={highlightRow === r ? 'is-hl-row' : undefined}>
                {rowLabels ? (
                  <th scope="row" className={`mgrid__rowlabel${highlightRow === r ? ' is-hl' : ''}`}>
                    {rowLabels[r]}
                  </th>
                ) : (
                  <td className="mgrid__corner" />
                )}
                {row.map((value, c) => {
                  const isBlocked = allowed ? !allowed[r][c] : false;
                  const isSelected = selected?.row === r && selected?.col === c;
                  const inRow = highlightRow === r;
                  const inCol = highlightCol === c;
                  const isActiveTerm =
                    activeTerm !== null &&
                    ((activeTermAxis === 'row' && inRow && c === activeTerm) ||
                      (activeTermAxis === 'col' && inCol && r === activeTerm));

                  const classes = [
                    'mgrid__cell',
                    isSelected ? 'is-selected' : '',
                    inRow && !isSelected ? 'is-in-row' : '',
                    inCol && !isSelected ? 'is-in-col' : '',
                    isActiveTerm ? 'is-term' : '',
                    isBlocked ? 'is-blocked' : '',
                  ]
                    .filter(Boolean)
                    .join(' ');

                  const text = isBlocked
                    ? '−∞'
                    : compact
                      ? fmtCompact(value, decimals)
                      : fmt(value, decimals);

                  const heatStyle =
                    heatmap && !isBlocked
                      ? ({
                          '--heat': `var(--seq-${heatLevel(value)})`,
                          '--heat-ink':
                            heatLevel(value) >= 5 ? 'var(--seq-ink-high)' : 'var(--seq-ink-low)',
                        } as React.CSSProperties)
                      : undefined;

                  const label = [
                    name,
                    rowLabels ? rowLabels[r] : `row ${r + 1}`,
                    colLabels ? colLabels[c] : `column ${c + 1}`,
                    isBlocked ? blockedLabel : text,
                  ].join(', ');

                  if (!selectable) {
                    return (
                      <td
                        key={c}
                        data-r={r}
                        data-c={c}
                        className={`${classes} mgrid__cell--static${heatmap && !isBlocked ? ' is-heat' : ''}`}
                        style={heatStyle}
                      >
                        <span className="mgrid__value">{text}</span>
                        {isBlocked ? (
                          <>
                            <span className="mgrid__blocked-tag" aria-hidden="true">
                              ×
                            </span>
                            <span className="visually-hidden">{blockedLabel}</span>
                          </>
                        ) : null}
                      </td>
                    );
                  }

                  return (
                    <td
                      key={c}
                      className={`mgrid__td${heatmap && !isBlocked ? ' is-heat' : ''}`}
                      style={heatStyle}
                    >
                      <button
                        type="button"
                        data-r={r}
                        data-c={c}
                        className={classes}
                        aria-pressed={isSelected}
                        aria-label={label}
                        tabIndex={selected ? (isSelected ? 0 : -1) : r === 0 && c === 0 ? 0 : -1}
                        onClick={() => onSelect?.({ row: r, col: c })}
                        onKeyDown={(e) => handleKey(e, r, c)}
                      >
                        <span className="mgrid__value">{text}</span>
                        {isBlocked ? (
                          <span className="mgrid__blocked-tag" aria-hidden="true">
                            ×
                          </span>
                        ) : null}
                      </button>
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
