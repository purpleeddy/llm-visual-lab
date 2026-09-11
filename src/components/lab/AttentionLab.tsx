import { useCallback, useMemo, useRef, useState } from 'react';
import { MatrixGrid, type CellRef } from './MatrixGrid';
import { EditableMatrix } from './EditableMatrix';
import { ConnectorOverlay, type ConnectorLink } from './ConnectorOverlay';
import { TermExpansion } from './TermExpansion';
import {
  ATTENTION_STEPS,
  computeAttention,
  type AttentionResult,
  type AttentionStep,
} from '../../lib/math/attention';
import { defaultAttentionInput } from '../../lib/math/examples';
import { cellDerivation, type Matrix } from '../../lib/math/matrix';
import { fmt, fmtPercent } from '../../lib/math/format';
import { t } from '../../lib/i18n/ui';
import { formatCalcError } from '../../lib/i18n/calcError';
import { LAB_TEXT } from '../../lib/i18n/labText';
import type { Locale } from '../../lib/i18n/routing';

type MatrixKey = 'Q' | 'K' | 'V' | 'S' | 'A' | 'O';

interface Selection {
  matrix: MatrixKey;
  row: number;
  col: number;
}

const DEFAULT_SELECTION: Record<AttentionStep, Selection> = {
  input: { matrix: 'Q', row: 0, col: 0 },
  project: { matrix: 'Q', row: 0, col: 0 },
  scores: { matrix: 'S', row: 0, col: 1 },
  scale: { matrix: 'S', row: 0, col: 1 },
  mask: { matrix: 'S', row: 0, col: 1 },
  softmax: { matrix: 'A', row: 0, col: 1 },
  output: { matrix: 'O', row: 2, col: 0 },
};

/** Which part of the formula to light up at each step */
function StepFormula({ step, scaled, masked }: { step: AttentionStep; scaled: boolean; masked: boolean }) {
  const on = (...steps: AttentionStep[]) => (steps.includes(step) ? ' is-lit' : '');
  return (
    <p className="formula" aria-hidden="true">
      <span className={`formula__part formula__part--out${on('output')}`}>O</span>
      <span className="formula__op">=</span>
      <span className={`formula__part${on('softmax')}`}>softmax</span>
      <span className="formula__paren">(</span>
      <span className={`formula__part formula__part--q${on('project', 'scores')}`}>Q</span>
      <span className={`formula__part formula__part--k${on('project', 'scores')}`}>
        K<sup>⊤</sup>
      </span>
      {scaled ? (
        <>
          <span className="formula__op">/</span>
          <span className={`formula__part${on('scale')}`}>
            √<span className="formula__sub">d</span>
            <sub>k</sub>
          </span>
        </>
      ) : null}
      {masked ? (
        <>
          <span className="formula__op">+</span>
          <span className={`formula__part${on('mask')}`}>M</span>
        </>
      ) : null}
      <span className="formula__paren">)</span>
      <span className={`formula__part formula__part--v${on('project', 'output')}`}>V</span>
    </p>
  );
}

export interface AttentionLabProps {
  locale: Locale;
}

/**
 * Equation (1) of the paper, worked through end to end on a small example.
 *
 * Every number on screen comes from a single call to computeAttention.
 * Nothing plays automatically; the reader moves between the steps.
 */
export function AttentionLab({ locale }: AttentionLabProps) {
  const ui = t(locale);
  const text = LAB_TEXT[locale];

  const initial = useMemo(() => defaultAttentionInput(), []);
  const [X, setX] = useState<Matrix>(initial.X);
  const [WQ, setWQ] = useState<Matrix>(initial.WQ);
  const [WK, setWK] = useState<Matrix>(initial.WK);
  const [WV, setWV] = useState<Matrix>(initial.WV);
  const [scaled, setScaled] = useState(initial.scaled);
  const [masked, setMasked] = useState(initial.masked);

  const [stepIndex, setStepIndex] = useState(0);
  const [selection, setSelection] = useState<Selection>(DEFAULT_SELECTION.input);
  const [activeTerm, setActiveTerm] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState('');

  const step = ATTENTION_STEPS[stepIndex];

  const computed = useMemo<{ result: AttentionResult | null; error: string | null }>(() => {
    try {
      return { result: computeAttention({ X, WQ, WK, WV, scaled, masked }), error: null };
    } catch (e) {
      // The maths throws in English with a code; the reader gets their own language.
      return { result: null, error: formatCalcError(e, ui) };
    }
  }, [X, WQ, WK, WV, scaled, masked, ui]);

  const reset = useCallback(() => {
    const fresh = defaultAttentionInput();
    setX(fresh.X);
    setWQ(fresh.WQ);
    setWK(fresh.WK);
    setWV(fresh.WV);
    setScaled(fresh.scaled);
    setMasked(fresh.masked);
    setStepIndex(0);
    setSelection(DEFAULT_SELECTION.input);
    setActiveTerm(null);
    setAnnouncement(ui.lab.resetDone);
  }, [ui.lab.resetDone]);

  const goStep = useCallback((next: number) => {
    const clamped = Math.max(0, Math.min(ATTENTION_STEPS.length - 1, next));
    setStepIndex(clamped);
    setSelection(DEFAULT_SELECTION[ATTENTION_STEPS[clamped]]);
    setActiveTerm(null);
  }, []);

  const editCell =
    (setter: React.Dispatch<React.SetStateAction<Matrix>>) => (r: number, c: number, v: number) =>
      setter((prev) => prev.map((row, ri) => row.map((x, ci) => (ri === r && ci === c ? v : x))));

  const result = computed.result;

  const tokenLabels = useMemo(
    () => X.map((_, i) => ui.lab.tokenLabel.replace('{n}', String(i + 1))),
    [X, ui],
  );
  const shortTokens = useMemo(() => X.map((_, i) => `${i + 1}`), [X]);

  // ---- The derivation of the selected cell ---------------------------------
  const derivation = useMemo(() => {
    if (!result) return null;
    const { row, col } = selection;
    const dim = (m: Matrix) => ({ r: m.length, c: m[0].length });
    try {
      switch (selection.matrix) {
        case 'Q': {
          if (row >= dim(result.Q).r || col >= dim(result.Q).c) return null;
          return {
            d: cellDerivation(X, WQ, row, col),
            left: `X ${row + 1}${ui.lab.row}`,
            right: `W_Q ${col + 1}${ui.lab.col}`,
            label: `Q(${row + 1}, ${col + 1})`,
          };
        }
        case 'K': {
          if (row >= dim(result.K).r || col >= dim(result.K).c) return null;
          return {
            d: cellDerivation(X, WK, row, col),
            left: `X ${row + 1}${ui.lab.row}`,
            right: `W_K ${col + 1}${ui.lab.col}`,
            label: `K(${row + 1}, ${col + 1})`,
          };
        }
        case 'V': {
          if (row >= dim(result.V).r || col >= dim(result.V).c) return null;
          return {
            d: cellDerivation(X, WV, row, col),
            left: `X ${row + 1}${ui.lab.row}`,
            right: `W_V ${col + 1}${ui.lab.col}`,
            label: `V(${row + 1}, ${col + 1})`,
          };
        }
        case 'S': {
          if (row >= dim(result.scores).r || col >= dim(result.scores).c) return null;
          return {
            d: cellDerivation(result.Q, result.KT, row, col),
            left: `Q ${row + 1}${ui.lab.row}`,
            right: `K ${col + 1}${ui.lab.row}`,
            label: `S(${row + 1}, ${col + 1})`,
          };
        }
        case 'O': {
          if (row >= dim(result.output).r || col >= dim(result.output).c) return null;
          return {
            d: cellDerivation(result.weights, result.V, row, col),
            left: `A ${row + 1}${ui.lab.row}`,
            right: `V ${col + 1}${ui.lab.col}`,
            label: `O(${row + 1}, ${col + 1})`,
          };
        }
        default:
          return null;
      }
    } catch {
      return null;
    }
  }, [result, selection, X, WQ, WK, WV, ui.lab.row, ui.lab.col]);

  const select = (matrix: MatrixKey) => (cell: CellRef) => {
    setSelection({ matrix, ...cell });
    setActiveTerm(null);
  };

  const dims = result?.dims;
  const stepText = text[step];

  const stageRef = useRef<HTMLDivElement>(null);

  /*
   * Joins the selected result cell to the row and the column it came from.
   * Only meaningful at a step laid out as three matrices, A · B = C.
   */
  const links = useMemo<ConnectorLink[]>(() => {
    const { row, col, matrix } = selection;
    const pair = (left: string, leftIsRow: boolean, right: string, target: string): ConnectorLink[] => [
      {
        from: leftIsRow ? { matrix: left, row, side: 'right' } : { matrix: left, col, side: 'right' },
        to: { matrix: target, row, col, side: 'left' },
        color: 'var(--data-q)',
      },
      {
        from: { matrix: right, col, side: 'right' },
        to: { matrix: target, row, col, side: 'left' },
        color: 'var(--data-k)',
      },
    ];
    if (step === 'project' && (matrix === 'Q' || matrix === 'K' || matrix === 'V')) {
      const w = matrix === 'Q' ? 'W_Q' : matrix === 'K' ? 'W_K' : 'W_V';
      return pair('X', true, w, matrix);
    }
    if (step === 'scores' && matrix === 'S') return pair('Q', true, 'KT', 'S');
    if (step === 'output' && matrix === 'O') return pair('A', true, 'V', 'O');
    return [];
  }, [step, selection]);

  return (
    <section className="lab lab--attention" aria-label={ui.lab.title}>
      <header className="lab__header">
        <div>
          <h3 className="lab__title">{ui.lab.title}</h3>
          <p className="lab__kind">
            <span className="badge badge--complete">
              <span className="badge__dot" />
              {ui.lab.kind}
            </span>
            {dims ? (
              <span className="lab__dims">
                {ui.lab.dimensions}: n={dims.n}, d<sub>model</sub>={dims.dModel}, d<sub>k</sub>=
                {dims.dK}, d<sub>v</sub>={dims.dV}
              </span>
            ) : null}
          </p>
        </div>
        <div className="lab__toggles">
          <div className="lab__toggle">
            <span className="lab__toggle-label" id="lab-scale-label">
              {ui.lab.scaling}
            </span>
            <div className="segmented" role="group" aria-labelledby="lab-scale-label">
              <button type="button" aria-pressed={scaled} onClick={() => setScaled(true)}>
                {ui.lab.scalingOn}
              </button>
              <button type="button" aria-pressed={!scaled} onClick={() => setScaled(false)}>
                {ui.lab.scalingOff}
              </button>
            </div>
          </div>
          <div className="lab__toggle">
            <span className="lab__toggle-label" id="lab-mask-label">
              {ui.lab.masking}
            </span>
            <div className="segmented" role="group" aria-labelledby="lab-mask-label">
              <button type="button" aria-pressed={masked} onClick={() => setMasked(true)}>
                {ui.lab.maskingOn}
              </button>
              <button type="button" aria-pressed={!masked} onClick={() => setMasked(false)}>
                {ui.lab.maskingOff}
              </button>
            </div>
          </div>
          <button type="button" className="btn lab__reset" onClick={reset}>
            {ui.lab.reset}
          </button>
        </div>
      </header>

      <p className="lab__note">{ui.lab.kindNote}</p>

      {/* ---- Moving between steps ---- */}
      <nav className="stepper" aria-label={ui.lab.step}>
        <button
          type="button"
          className="btn stepper__arrow"
          onClick={() => goStep(stepIndex - 1)}
          disabled={stepIndex === 0}
        >
          <span aria-hidden="true">←</span> {ui.lab.prevStep}
        </button>
        <ol className="stepper__list">
          {ATTENTION_STEPS.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                className={`stepper__chip${i === stepIndex ? ' is-current' : ''}${i < stepIndex ? ' is-done' : ''}`}
                aria-current={i === stepIndex ? 'step' : undefined}
                onClick={() => goStep(i)}
              >
                <span className="stepper__num">{i + 1}</span>
                <span className="stepper__name">{ui.lab.steps[s].name}</span>
              </button>
            </li>
          ))}
        </ol>
        <button
          type="button"
          className="btn stepper__arrow"
          onClick={() => goStep(stepIndex + 1)}
          disabled={stepIndex === ATTENTION_STEPS.length - 1}
        >
          {ui.lab.nextStep} <span aria-hidden="true">→</span>
        </button>
      </nav>

      <p className="visually-hidden" aria-live="polite">
        {announcement ||
          `${ui.lab.step} ${stepIndex + 1} ${ui.lab.stepOf} ${ATTENTION_STEPS.length}: ${ui.lab.steps[step].name}`}
      </p>

      <StepFormula step={step} scaled={scaled} masked={masked} />

      {computed.error ? (
        <div className="lab__error" role="alert">
          <strong>{ui.lab.error}</strong>
          <p>{computed.error}</p>
          <button type="button" className="btn" onClick={reset}>
            {ui.lab.reset}
          </button>
        </div>
      ) : null}

      {result ? (
        <>
          {/* ---- The stage: the matrices for this step ---- */}
          <div className="lab__stage" ref={stageRef}>
            {step === 'input' ? (
              <div className="lab__row lab__row--inputs">
                <EditableMatrix
                  matrix={X}
                  name="X"
                  shape={`${dims!.n} × ${dims!.dModel}`}
                  rowLabels={shortTokens}
                  tone="input"
                  onChange={editCell(setX)}
                />
                <EditableMatrix
                  matrix={WQ}
                  name="W_Q"
                  shape={`${dims!.dModel} × ${dims!.dK}`}
                  tone="q"
                  onChange={editCell(setWQ)}
                />
                <EditableMatrix
                  matrix={WK}
                  name="W_K"
                  shape={`${dims!.dModel} × ${dims!.dK}`}
                  tone="k"
                  onChange={editCell(setWK)}
                />
                <EditableMatrix
                  matrix={WV}
                  name="W_V"
                  shape={`${dims!.dModel} × ${dims!.dV}`}
                  tone="v"
                  onChange={editCell(setWV)}
                />
              </div>
            ) : null}

            {step === 'project' ? (
              <div className="lab__row">
                <MatrixGrid
                  matrix={X}
                  name="X"
                  shape={`${dims!.n} × ${dims!.dModel}`}
                  rowLabels={shortTokens}
                  tone="input"
                  compact
                  highlightRow={['Q', 'K', 'V'].includes(selection.matrix) ? selection.row : null}
                  activeTerm={activeTerm}
                  activeTermAxis="row"
                />
                <span className="lab__op" aria-hidden="true">
                  ·
                </span>
                <div className="lab__stack">
                  <MatrixGrid matrix={WQ} name="W_Q" tone="q" compact
                    highlightCol={selection.matrix === 'Q' ? selection.col : null}
                    activeTerm={activeTerm} activeTermAxis="col" />
                  <MatrixGrid matrix={WK} name="W_K" tone="k" compact
                    highlightCol={selection.matrix === 'K' ? selection.col : null}
                    activeTerm={activeTerm} activeTermAxis="col" />
                  <MatrixGrid matrix={WV} name="W_V" tone="v" compact
                    highlightCol={selection.matrix === 'V' ? selection.col : null}
                    activeTerm={activeTerm} activeTermAxis="col" />
                </div>
                <span className="lab__op" aria-hidden="true">
                  =
                </span>
                <div className="lab__stack">
                  <MatrixGrid matrix={result.Q} name="Q" shape={`${dims!.n} × ${dims!.dK}`} rowLabels={shortTokens}
                    tone="q" compact selectable
                    selected={selection.matrix === 'Q' ? selection : null}
                    onSelect={select('Q')} caption={ui.lab.selectHint} />
                  <MatrixGrid matrix={result.K} name="K" shape={`${dims!.n} × ${dims!.dK}`} rowLabels={shortTokens}
                    tone="k" compact selectable
                    selected={selection.matrix === 'K' ? selection : null}
                    onSelect={select('K')} />
                  <MatrixGrid matrix={result.V} name="V" shape={`${dims!.n} × ${dims!.dV}`} rowLabels={shortTokens}
                    tone="v" compact selectable
                    selected={selection.matrix === 'V' ? selection : null}
                    onSelect={select('V')} />
                </div>
              </div>
            ) : null}

            {step === 'scores' ? (
              <div className="lab__row">
                <MatrixGrid matrix={result.Q} name="Q" shape={`${dims!.n} × ${dims!.dK}`} rowLabels={shortTokens}
                  tone="q" compact highlightRow={selection.matrix === 'S' ? selection.row : null}
                  activeTerm={activeTerm} activeTermAxis="row" />
                <span className="lab__op" aria-hidden="true">·</span>
                <MatrixGrid matrix={result.KT} name="K⊤" matrixId="KT" shape={`${dims!.dK} × ${dims!.n}`} colLabels={shortTokens}
                  tone="k" compact highlightCol={selection.matrix === 'S' ? selection.col : null}
                  activeTerm={activeTerm} activeTermAxis="col" />
                <span className="lab__op" aria-hidden="true">=</span>
                <MatrixGrid matrix={result.scores} name="S" shape={`${dims!.n} × ${dims!.n}`}
                  rowLabels={shortTokens} colLabels={shortTokens} tone="score" compact selectable
                  selected={selection.matrix === 'S' ? selection : null} onSelect={select('S')}
                  caption={ui.lab.selectHint} />
              </div>
            ) : null}

            {step === 'scale' ? (
              <div className="lab__row">
                <MatrixGrid matrix={result.scores} name="S" shape={`${dims!.n} × ${dims!.n}`}
                  rowLabels={shortTokens} colLabels={shortTokens} tone="score" compact selectable
                  selected={selection.matrix === 'S' ? selection : null} onSelect={select('S')} />
                <span className="lab__op" aria-hidden="true">
                  {scaled ? `÷ ${fmt(Math.sqrt(dims!.dK), 3)}` : '×1'}
                </span>
                <MatrixGrid matrix={result.scaledScores} name={scaled ? 'S / √d_k' : 'S'}
                  shape={`${dims!.n} × ${dims!.n}`} rowLabels={shortTokens} colLabels={shortTokens}
                  tone="score" selectable selected={selection.matrix === 'S' ? selection : null}
                  onSelect={select('S')} caption={ui.lab.selectHint} />
              </div>
            ) : null}

            {step === 'mask' ? (
              <div className="lab__row">
                <MatrixGrid matrix={result.scaledScores} name={scaled ? 'S / √d_k' : 'S'}
                  shape={`${dims!.n} × ${dims!.n}`} rowLabels={shortTokens} colLabels={shortTokens}
                  tone="score" selectable selected={selection.matrix === 'S' ? selection : null}
                  onSelect={select('S')} />
                <span className="lab__op" aria-hidden="true">+</span>
                <MatrixGrid matrix={result.M} name="M" shape={`${dims!.n} × ${dims!.n}`}
                  rowLabels={shortTokens} colLabels={shortTokens} tone="neutral" compact
                  allowed={result.allowed} blockedLabel={ui.lab.blocked} />
                <span className="lab__op" aria-hidden="true">=</span>
                <MatrixGrid matrix={result.scaledScores} name="S′" shape={`${dims!.n} × ${dims!.n}`}
                  rowLabels={shortTokens} colLabels={shortTokens} tone="score" selectable
                  allowed={result.allowed} blockedLabel={ui.lab.blocked}
                  selected={selection.matrix === 'S' ? selection : null} onSelect={select('S')}
                  caption={ui.lab.selectHint} />
              </div>
            ) : null}

            {step === 'softmax' ? (
              <div className="lab__row">
                <MatrixGrid matrix={result.scaledScores} name="S′" shape={`${dims!.n} × ${dims!.n}`}
                  rowLabels={shortTokens} colLabels={shortTokens} tone="score" allowed={result.allowed}
                  blockedLabel={ui.lab.blocked} highlightRow={selection.row} />
                <span className="lab__op" aria-hidden="true">→</span>
                <MatrixGrid matrix={result.weights} name="A" shape={`${dims!.n} × ${dims!.n}`}
                  rowLabels={shortTokens} colLabels={shortTokens} tone="weight" heatmap selectable
                  allowed={result.allowed} blockedLabel={ui.lab.blocked}
                  selected={selection.matrix === 'A' ? selection : null} onSelect={select('A')}
                  caption={ui.lab.selectHint} />
              </div>
            ) : null}

            {step === 'output' ? (
              <div className="lab__row">
                <MatrixGrid matrix={result.weights} name="A" shape={`${dims!.n} × ${dims!.n}`}
                  rowLabels={shortTokens} colLabels={shortTokens} tone="weight" heatmap
                  allowed={result.allowed} blockedLabel={ui.lab.blocked}
                  highlightRow={selection.matrix === 'O' ? selection.row : null}
                  activeTerm={activeTerm} activeTermAxis="row" />
                <span className="lab__op" aria-hidden="true">·</span>
                <MatrixGrid matrix={result.V} name="V" shape={`${dims!.n} × ${dims!.dV}`}
                  rowLabels={shortTokens} tone="v" compact
                  highlightCol={selection.matrix === 'O' ? selection.col : null}
                  activeTerm={activeTerm} activeTermAxis="col" />
                <span className="lab__op" aria-hidden="true">=</span>
                <MatrixGrid matrix={result.output} name="O" shape={`${dims!.n} × ${dims!.dV}`}
                  rowLabels={shortTokens} tone="score" selectable
                  selected={selection.matrix === 'O' ? selection : null} onSelect={select('O')}
                  caption={ui.lab.selectHint} />
              </div>
            ) : null}

            <ConnectorOverlay
              containerRef={stageRef}
              links={links}
              recomputeKey={`${step}-${selection.matrix}-${selection.row}-${selection.col}-${scaled}-${masked}-${JSON.stringify(X)}`}
            />
          </div>

          {/* ---- The working for the selected cell ---- */}
          {step === 'softmax' ? (
            <div className="lab__readout">
              <p className="terms__sentence">
                <span className="terms__result">{`A(${selection.row + 1}, ·)`}</span>
                <span className="terms__eq">=</span>
                <span className="terms__source">
                  softmax({tokenLabels[selection.row]} {ui.lab.score})
                </span>
              </p>
              <div className="terms__tablewrap">
                <table className="terms__table">
                  <thead>
                    <tr>
                      <th scope="col">{ui.lab.token}</th>
                      <th scope="col">{ui.lab.score}</th>
                      <th scope="col">{ui.lab.shifted}</th>
                      <th scope="col">exp</th>
                      <th scope="col">{ui.lab.probability}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.softmax[selection.row].terms.map((term, i) => (
                      <tr key={i} className={selection.col === i ? 'is-active' : undefined}>
                        <th scope="row">{i + 1}</th>
                        <td>{term.allowed ? fmt(term.score) : '−∞'}</td>
                        <td>{term.shifted === null ? `(${ui.lab.blocked})` : fmt(term.shifted)}</td>
                        <td>{fmt(term.exp)}</td>
                        <td className="terms__running">
                          {fmt(term.probability)}{' '}
                          <span className="terms__pct">{fmtPercent(term.probability)}</span>
                        </td>
                      </tr>
                    ))}
                    <tr className="terms__sumrow">
                      <th scope="row">{ui.lab.sum}</th>
                      <td>—</td>
                      <td>—</td>
                      <td>{fmt(result.softmax[selection.row].sumExp)}</td>
                      <td className="terms__running">{fmt(1)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ) : derivation ? (
            <div className="lab__readout">
              <TermExpansion
                terms={derivation.d.terms}
                leftLabel={derivation.left}
                rightLabel={derivation.right}
                resultLabel={derivation.label}
                value={derivation.d.value}
                activeTerm={activeTerm}
                onTermFocus={setActiveTerm}
                compact={selection.matrix !== 'O'}
                labels={{ term: ui.lab.term, product: ui.lab.product, sum: ui.lab.sum }}
              />
            </div>
          ) : (
            <p className="lab__hint">{ui.lab.noSelection}</p>
          )}

          {/* ---- Guidance ---- */}
          <div className="lab__guide">
            <p className="lab__what">{stepText.what}</p>
            <div className="note note--try">
              <p className="note__title">{ui.lab.tryThis}</p>
              <p>{stepText.tryThis}</p>
            </div>
            <div className="note note--why">
              <p className="note__title">{ui.lab.whatChanged}</p>
              <p>{stepText.why}</p>
            </div>
          </div>

          {/* ---- The editable inputs ---- */}
          {step !== 'input' ? (
            <details className="expand lab__inputs">
              <summary>{ui.lab.inputs}</summary>
              <div className="expand__body">
                <p className="lab__hint" id="lab-inputs-hint">
                  {ui.lab.inputsHint}
                </p>
                <div className="lab__row lab__row--inputs">
                  <EditableMatrix matrix={X} name="X" shape={`${dims!.n} × ${dims!.dModel}`}
                    rowLabels={shortTokens} tone="input" onChange={editCell(setX)}
                    describedBy="lab-inputs-hint" />
                  <EditableMatrix matrix={WQ} name="W_Q" shape={`${dims!.dModel} × ${dims!.dK}`}
                    tone="q" onChange={editCell(setWQ)} describedBy="lab-inputs-hint" />
                  <EditableMatrix matrix={WK} name="W_K" shape={`${dims!.dModel} × ${dims!.dK}`}
                    tone="k" onChange={editCell(setWK)} describedBy="lab-inputs-hint" />
                  <EditableMatrix matrix={WV} name="W_V" shape={`${dims!.dModel} × ${dims!.dV}`}
                    tone="v" onChange={editCell(setWV)} describedBy="lab-inputs-hint" />
                </div>
              </div>
            </details>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
