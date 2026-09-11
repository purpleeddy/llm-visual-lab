import { useCallback, useMemo, useRef, useState } from 'react';
import { MatrixGrid, type CellRef } from './MatrixGrid';
import { EditableMatrix } from './EditableMatrix';
import { TermExpansion } from './TermExpansion';
import { ConnectorOverlay, type ConnectorLink } from './ConnectorOverlay';
import { cellDerivation, matmul, type Matrix } from '../../lib/math/matrix';
import { t } from '../../lib/i18n/ui';
import type { Locale } from '../../lib/i18n/routing';

export interface MatrixProductExplorerProps {
  locale: Locale;
  initialA: Matrix;
  initialB: Matrix;
  nameA?: string;
  nameB?: string;
  nameC?: string;
  rowLabelsA?: string[];
  colLabelsB?: string[];
  editable?: boolean;
  /** The cell selected to begin with */
  initialCell?: CellRef;
}

/**
 * Shows where one cell of a matrix product comes from.
 * Choosing a cell of the result highlights the row on the left and the column
 * on the right, and opens the products and the running sum underneath.
 */
export function MatrixProductExplorer({
  locale,
  initialA,
  initialB,
  nameA = 'A',
  nameB = 'B',
  nameC = 'C',
  rowLabelsA,
  colLabelsB,
  editable = true,
  initialCell = { row: 0, col: 0 },
}: MatrixProductExplorerProps) {
  const ui = t(locale);
  const [a, setA] = useState<Matrix>(() => initialA.map((r) => [...r]));
  const [b, setB] = useState<Matrix>(() => initialB.map((r) => [...r]));
  const [cell, setCell] = useState<CellRef>(initialCell);
  const [activeTerm, setActiveTerm] = useState<number | null>(null);

  const c = useMemo(() => matmul(a, b), [a, b]);
  const derivation = useMemo(
    () => cellDerivation(a, b, cell.row, cell.col),
    [a, b, cell],
  );

  const reset = useCallback(() => {
    setA(initialA.map((r) => [...r]));
    setB(initialB.map((r) => [...r]));
    setCell(initialCell);
    setActiveTerm(null);
  }, [initialA, initialB, initialCell]);

  const chainRef = useRef<HTMLDivElement>(null);

  /*
   * Lines joining the selected result cell to where it came from:
   * that row of A → that cell of C, and that column of B → that cell of C.
   */
  const links = useMemo<ConnectorLink[]>(
    () => [
      {
        from: { matrix: nameA, row: cell.row, side: 'right' },
        to: { matrix: nameC, row: cell.row, col: cell.col, side: 'left' },
        color: 'var(--data-q)',
      },
      {
        from: { matrix: nameB, col: cell.col, side: 'right' },
        to: { matrix: nameC, row: cell.row, col: cell.col, side: 'left' },
        color: 'var(--data-k)',
      },
    ],
    [nameA, nameB, nameC, cell],
  );

  const rowsA = a.length;
  const colsA = a[0].length;
  const colsB = b[0].length;

  const rowNames = rowLabelsA ?? Array.from({ length: rowsA }, (_, i) => `${i + 1}`);
  const colNames = colLabelsB ?? Array.from({ length: colsB }, (_, i) => `${i + 1}`);
  const innerNames = Array.from({ length: colsA }, (_, i) => `${i + 1}`);

  return (
    <section className="lab lab--matmul" aria-label={ui.math.matrixProduct}>
      <div className="lab__chain" ref={chainRef}>
        {editable ? (
          <EditableMatrix
            matrix={a}
            name={nameA}
            shape={`${rowsA} × ${colsA}`}
            rowLabels={rowNames}
            colLabels={innerNames}
            tone="q"
            highlightRow={cell.row}
            activeTerm={activeTerm}
            activeTermAxis="row"
            onChange={(r, col, v) =>
              setA((prev) => prev.map((row, ri) => row.map((x, ci) => (ri === r && ci === col ? v : x))))
            }
          />
        ) : (
          <MatrixGrid
            matrix={a}
            name={nameA}
            shape={`${rowsA} × ${colsA}`}
            rowLabels={rowNames}
            colLabels={innerNames}
            tone="q"
            compact
            highlightRow={cell.row}
            activeTerm={activeTerm}
            activeTermAxis="row"
          />
        )}

        <span className="lab__op" aria-hidden="true">
          ·
        </span>

        {editable ? (
          <EditableMatrix
            matrix={b}
            name={nameB}
            shape={`${colsA} × ${colsB}`}
            rowLabels={innerNames}
            colLabels={colNames}
            tone="k"
            highlightCol={cell.col}
            activeTerm={activeTerm}
            activeTermAxis="col"
            onChange={(r, col, v) =>
              setB((prev) => prev.map((row, ri) => row.map((x, ci) => (ri === r && ci === col ? v : x))))
            }
          />
        ) : (
          <MatrixGrid
            matrix={b}
            name={nameB}
            shape={`${colsA} × ${colsB}`}
            rowLabels={innerNames}
            colLabels={colNames}
            tone="k"
            compact
            highlightCol={cell.col}
            activeTerm={activeTerm}
            activeTermAxis="col"
          />
        )}

        <span className="lab__op" aria-hidden="true">
          =
        </span>

        <MatrixGrid
          matrix={c}
          name={nameC}
          shape={`${rowsA} × ${colsB}`}
          rowLabels={rowNames}
          colLabels={colNames}
          tone="score"
          compact
          selectable
          selected={cell}
          onSelect={setCell}
          caption={ui.math.selectOutputCell}
        />
        <ConnectorOverlay
          containerRef={chainRef}
          links={links}
          recomputeKey={`${cell.row}-${cell.col}-${JSON.stringify(a)}-${JSON.stringify(b)}`}
        />
      </div>


      <div className="lab__readout" aria-live="polite">
        <TermExpansion
          terms={derivation.terms}
          leftLabel={`${nameA} ${rowNames[cell.row]}${ui.lab.row}`}
          rightLabel={`${nameB} ${colNames[cell.col]}${ui.lab.col}`}
          resultLabel={`${nameC}(${rowNames[cell.row]}, ${colNames[cell.col]})`}
          value={derivation.value}
          activeTerm={activeTerm}
          onTermFocus={setActiveTerm}
          labels={{ term: ui.lab.term, product: ui.lab.product, sum: ui.lab.sum }}
        />
      </div>

      <div className="lab__footer">
        <button type="button" className="btn" onClick={reset}>
          {ui.lab.reset}
        </button>
        <p className="lab__hint">{ui.lab.selectHint}</p>
      </div>
    </section>
  );
}
