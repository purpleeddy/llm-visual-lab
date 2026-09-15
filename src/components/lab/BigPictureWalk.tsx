import { useState } from 'react';
import { Stepper } from './Stepper';
import { t } from '../../lib/i18n/ui';
import { WALK_STEPS, WALK_TEXT, type WalkStep } from '../../lib/i18n/labText';
import type { Locale } from '../../lib/i18n/routing';

/**
 * The whole route from a sentence to the next-word probabilities, one frame
 * per step of the prose in "the big picture".
 *
 * This is a conceptual sketch (docs/plan.md §8.1): the cells carry no values.
 * What it is careful about is **counts and shapes** — five tokens become five
 * rows, the five rows become one block, and the block keeps its five rows
 * through the encoder. Those are the facts the prose asks the reader to hold.
 *
 * Nothing plays by itself. Frames 1–4 share one drawing whose parts move into
 * place; frames 5–7 are separate drawings that fade in. Every movement uses the
 * motion tokens, so a reduced-motion setting turns it into a cut.
 */

const TOKENS = ['The', 'animal', 'did', "n't", 'cross'];
/** Example ids, the same ones the prose uses. Not computed. */
const IDS = ['1996', '8123', '751', '83', '4417'];
const COLS = 7;
const CELL = 12;

/** Illustrative numbers for the last frame. They sum to 1; nothing else about them is real. */
const VOCAB_KO = ['길을', '건너지', '못했다', '동물은', '그', '…'];
const VOCAB_EN = ['street', 'cross', "didn't", 'animal', 'the', '…'];
const VOCAB_P = [0.62, 0.18, 0.08, 0.05, 0.03, 0.04];
const ATTN_P = [0.05, 0.55, 0.1, 0.05, 0.25];
const OUT_SO_FAR_KO = ['<시작>', '그', '동물은'];
const OUT_SO_FAR_EN = ['<start>', 'Das', 'Tier'];

export interface BigPictureWalkProps {
  locale: Locale;
}

export function BigPictureWalk({ locale }: BigPictureWalkProps) {
  const ui = t(locale);
  const text = WALK_TEXT[locale];
  const [index, setIndex] = useState(0);
  const step: WalkStep = WALK_STEPS[index];
  const stepText = text.steps[step];

  return (
    <section className="lab lab--walk" aria-label={text.title}>
      <header className="lab__header">
        <div>
          <h3 className="lab__title">{text.title}</h3>
          <p className="lab__kind">
            <span className="badge badge--planned"><span className="badge__dot" />{text.kind}</span>
          </p>
        </div>
      </header>
      <p className="lab__note">{text.kindNote}</p>

      <Stepper
        steps={WALK_STEPS.map((s) => ({ id: s, name: text.steps[s].name }))}
        index={index}
        onChange={setIndex}
        labels={{ rail: ui.lab.step, prev: ui.lab.prevStep, next: ui.lab.nextStep }}
      />

      <p className="visually-hidden" aria-live="polite">
        {`${ui.lab.step} ${index + 1} ${ui.lab.stepOf} ${WALK_STEPS.length}: ${stepText.name}`}
      </p>

      <div className="walk__panels">
        <div className="walk__map" aria-hidden="true">
          <MiniMap step={step} locale={locale} />
        </div>
        <div className="walk__stage" aria-hidden="true">
          <Stage step={step} locale={locale} />
        </div>
      </div>

      <div className="walk__text" data-step={step}>
        <p className="walk__what">
          <span className="walk__num">{index + 1}</span> {stepText.what}
        </p>
        <p className="walk__watch">
          <strong>{locale === 'ko' ? '기억할 것' : 'Hold on to'}</strong> {stepText.watch}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The small map: where along the route the current frame sits.        */

type MapPart = 'encIn' | 'encEmbed' | 'encPlus' | 'encStack' | 'decStack' | 'head';

const LIT: Record<WalkStep, MapPart> = {
  tokens: 'encIn',
  row: 'encEmbed',
  block: 'encEmbed',
  position: 'encPlus',
  encoder: 'encStack',
  decoder: 'decStack',
  probs: 'head',
};

function MiniMap({ step, locale }: { step: WalkStep; locale: Locale }) {
  const L = WALK_TEXT[locale].fig.map;
  const lit = LIT[step];
  const on = (p: MapPart) => (lit === p ? ' walk__lit' : '');

  const W = 108;
  const EX = 76;
  const DX = 222;
  const ex = EX - W / 2;
  const dx = DX - W / 2;

  const box = (x: number, y: number, h: number, label: string, kind: string, part?: MapPart) => (
    <g className={part ? on(part) : ''}>
      <rect className={`tmap__box tmap__box--${kind}`} x={x} y={y} width={W} height={h} rx="4" />
      <text className="tmap__label" x={x + W / 2} y={y + h / 2 + 4} textAnchor="middle">
        {label}
      </text>
    </g>
  );

  const line = (x: number, y1: number, y2: number) => (
    <path className="tmap__line" d={`M ${x} ${y1} L ${x} ${y2 + 3}`} markerEnd="url(#bpw-arrow)" />
  );

  const plus = (cx: number, cy: number, part: MapPart) => (
    <g className={on(part)}>
      <circle cx={cx} cy={cy} r="9" fill="var(--surface-raised)" stroke="var(--line-3)" strokeWidth="1.25" />
      <path d={`M ${cx - 5} ${cy} H ${cx + 5} M ${cx} ${cy - 5} V ${cy + 5}`} stroke="var(--ink-1)" strokeWidth="1.4" />
      <text className="tmap__label--sm" x={cx + 14} y={cy + 4}>
        {L.position}
      </text>
    </g>
  );

  return (
    <svg viewBox="-24 0 348 336" width="348" height="336" className="walk__svg">
      <defs>
        <marker id="bpw-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ink-3)" />
        </marker>
      </defs>

      {/* Encoder column, bottom up */}
      <g className={on('encIn')}>
        <text className="tmap__label" x={EX} y={326} textAnchor="middle">
          {L.inputs}
        </text>
      </g>
      {line(EX, 312, 300)}
      {box(ex, 274, 26, L.embed, 'embed', 'encEmbed')}
      {line(EX, 274, 250)}
      {plus(EX, 240, 'encPlus')}
      {line(EX, 231, 212)}
      <g className={on('encStack')}>
        <rect className="tmap__stack" x={ex - 8} y={110} width={W + 16} height={102} rx="6" />
        <text className="tmap__title" x={EX} y={100} textAnchor="middle">
          {L.encoder}
        </text>
        <text className="tmap__label--sm" x={ex - 14} y={165} textAnchor="end">
          {L.times}
        </text>
        {box(ex, 172, 30, 'Attention', 'attn')}
        {line(EX, 172, 152)}
        {box(ex, 122, 30, 'Feed forward', 'ffn')}
      </g>

      {/* Decoder column */}
      <text className="tmap__label" x={DX} y={326} textAnchor="middle">
        {L.outputs}
      </text>
      {line(DX, 312, 300)}
      {box(dx, 274, 26, L.embed, 'embed')}
      {line(DX, 274, 250)}
      {plus(DX, 240, 'decStack')}
      {line(DX, 231, 212)}
      <g className={on('decStack')}>
        <rect className="tmap__stack" x={dx - 8} y={62} width={W + 16} height={150} rx="6" />
        <text className="tmap__title" x={dx - 12} y={76} textAnchor="end">
          {L.decoder}
        </text>
        <text className="tmap__label--sm" x={dx + W + 14} y={140} textAnchor="start">
          {L.times}
        </text>
        {box(dx, 172, 30, 'Masked attention', 'attn')}
        {line(DX, 172, 152)}
        {box(dx, 122, 30, 'Attention', 'attn')}
        {line(DX, 122, 102)}
        {box(dx, 72, 30, 'Feed forward', 'ffn')}
      </g>
      {/* K, V from the encoder into the middle decoder box */}
      <path
        className="tmap__line tmap__line--cross"
        d={`M ${ex + W + 8} 118 C ${ex + W + 40} 118, ${dx - 40} 137, ${dx - 3} 137`}
        markerEnd="url(#bpw-arrow)"
      />
      {line(DX, 62, 40)}
      <g className={on('head')}>
        {box(dx, 14, 26, L.head, 'head')}
        <text className="tmap__label--sm" x={DX} y={8} textAnchor="middle">
          {L.probs}
        </text>
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* The data as it looks at each step.                                   */

function Stage({ step, locale }: { step: WalkStep; locale: Locale }) {
  const F = WALK_TEXT[locale].fig;
  const i = WALK_STEPS.indexOf(step);
  const pipelineOn = i <= 3;

  return (
    <svg viewBox="0 0 460 300" width="460" height="300" className="walk__svg">
      <defs>
        <marker id="bpw-arrow2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--line-3)" />
        </marker>
        <pattern id="bpw-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--blocked-ink)" strokeWidth="1" />
        </pattern>
      </defs>

      <g className="walk__frame" data-on={pipelineOn}>
        <Pipeline step={step} F={F} />
      </g>
      <g className="walk__frame" data-on={step === 'encoder'}>
        <EncoderFrame F={F} />
      </g>
      <g className="walk__frame" data-on={step === 'decoder'}>
        <DecoderFrame F={F} locale={locale} />
      </g>
      <g className="walk__frame" data-on={step === 'probs'}>
        <ProbsFrame F={F} locale={locale} />
      </g>
    </svg>
  );
}

type Fig = (typeof WALK_TEXT)['ko']['fig'];

/** A grid of empty cells: rows × COLS, each cell CELL wide and `h` tall. */
function Cells({
  x,
  y,
  rows,
  h = CELL,
  gap = 0,
  kind = '',
}: {
  x: number;
  y: number;
  rows: number;
  h?: number;
  gap?: number;
  kind?: string;
}) {
  return (
    <g>
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: COLS }, (_, c) => (
          <rect
            key={`${r}-${c}`}
            className={`walk__cell${kind ? ` walk__cell--${kind}` : ''}`}
            x={x + c * CELL}
            y={y + r * (h + gap)}
            width={CELL}
            height={h}
          />
        )),
      )}
    </g>
  );
}

/** Frames 1–4: the same five rows, moving into place. */
function Pipeline({ step, F }: { step: WalkStep; F: Fig }) {
  const i = WALK_STEPS.indexOf(step);
  const loose = i <= 1; // frames 1–2: rows spaced out, ids visible
  const ROW_H = 22;
  const gap = loose ? 40 : 24;
  const y0 = 70;
  const yOf = (r: number) => y0 + r * gap;
  const xTok = 16;
  const wTok = 72;
  const xId = 104;
  const wId = 52;
  const xCells = loose ? 176 : 104;
  const cellY = (r: number) => yOf(r) + (ROW_H - CELL) / 2;
  const yEnd = yOf(TOKENS.length - 1) + ROW_H;

  const showIds = i === 1;
  const showCells = i >= 1;
  const showSentence = i <= 1;
  const showBracket = i === 2;
  const showPlus = i === 3;
  const xPos = 232;
  const xSum = 340;

  return (
    <g>
      {/* The sentence */}
      <g className="walk__move" style={{ opacity: showSentence ? 1 : 0 }}>
        <text className="tmap__title" x={xTok} y={22}>
          {F.sentence}
        </text>
        <rect className="tmap__box" x={xTok + 50} y={6} width={168} height={24} rx="4" />
        <text className="tmap__label" x={xTok + 60} y={22}>
          The animal didn’t cross
        </text>
        <path className="tmap__line" d={`M ${xTok + 36} 30 V ${y0 - 6}`} markerEnd="url(#bpw-arrow2)" />
      </g>

      {/* Column headings (frame 2) */}
      <g className="walk__move" style={{ opacity: showIds ? 1 : 0 }}>
        <text className="tmap__title" x={xTok + wTok / 2} y={56} textAnchor="middle">
          {F.token}
        </text>
        <text className="tmap__title" x={xId + wId / 2} y={56} textAnchor="middle">
          {F.id}
        </text>
        <text className="tmap__title" x={176} y={56}>
          {F.row}
        </text>
        <text className="tmap__note" x={176 + COLS * CELL + 18} y={56}>
          {F.really512}
        </text>
      </g>

      {TOKENS.map((tk, r) => (
        <g key={tk}>
          <g className="walk__move" style={{ transform: `translate(0px, ${yOf(r) - y0}px)` }}>
            <rect className="tmap__box tmap__box--embed" x={xTok} y={y0} width={wTok} height={ROW_H} rx="4" />
            <text className="tmap__label" x={xTok + wTok / 2} y={y0 + 15} textAnchor="middle">
              {tk}
            </text>
          </g>
          <g
            className="walk__move"
            style={{ transform: `translate(0px, ${yOf(r) - y0}px)`, opacity: showIds ? 1 : 0 }}
          >
            <path className="tmap__line" d={`M ${xTok + wTok + 2} ${y0 + ROW_H / 2} H ${xId - 5}`} markerEnd="url(#bpw-arrow2)" />
            <rect className="tmap__box" x={xId} y={y0} width={wId} height={ROW_H} rx="4" />
            <text className="tp__num" x={xId + wId / 2} y={y0 + 15} textAnchor="middle">
              {IDS[r]}
            </text>
            <path className="tmap__line" d={`M ${xId + wId + 2} ${y0 + ROW_H / 2} H ${176 - 5}`} markerEnd="url(#bpw-arrow2)" />
          </g>
          <g
            className="walk__move"
            style={{
              transform: `translate(${xCells - 176}px, ${cellY(r) - cellY(0)}px)`,
              opacity: showCells ? 1 : 0,
            }}
          >
            {Array.from({ length: COLS }, (_, c) => (
              <rect key={c} className="walk__cell" x={176 + c * CELL} y={cellY(0)} width={CELL} height={CELL} />
            ))}
            <text className="tmap__note" x={176 + COLS * CELL + 4} y={cellY(0) + 10} style={{ opacity: loose ? 1 : 0 }}>
              ⋯
            </text>
          </g>
        </g>
      ))}

      {/* Frame 3: the bracket that makes the block */}
      <g className="walk__move" style={{ opacity: showBracket ? 1 : 0 }}>
        <path className="tmap__stack" d={`M ${xCells + COLS * CELL + 8} ${y0 - 4} V ${yEnd + 4}`} style={{ strokeDasharray: 'none' }} />
        <path className="tmap__stack" d={`M ${xCells + COLS * CELL + 8} ${y0 - 4} h -5 M ${xCells + COLS * CELL + 8} ${yEnd + 4} h -5`} style={{ strokeDasharray: 'none' }} />
        <text className="tmap__label" x={xCells + COLS * CELL + 18} y={(y0 + yEnd) / 2 + 4}>
          {F.block}
        </text>
      </g>

      {/* Frame 4: position rows added, same shape out */}
      <g className="walk__move" style={{ opacity: showPlus ? 1 : 0 }}>
        <text className="tmap__op" x={xCells + COLS * CELL + 14} y={(y0 + yEnd) / 2 + 6}>
          +
        </text>
        <text className="tmap__note" x={xPos} y={y0 - 12}>
          {F.posRows}
        </text>
        <Cells x={xPos} y={cellY(0)} rows={TOKENS.length} gap={24 - CELL} kind="pos" />
        <text className="tmap__op" x={xPos + COLS * CELL + 12} y={(y0 + yEnd) / 2 + 6}>
          =
        </text>
        <Cells x={xSum} y={cellY(0)} rows={TOKENS.length} gap={24 - CELL} kind="sum" />
        <text className="tmap__label" x={xSum + (COLS * CELL) / 2} y={yEnd + 22} textAnchor="middle">
          {F.stillSame}
        </text>
      </g>
    </g>
  );
}

/** A small 5 × 7 block used in the later frames. */
function Block({ x, y, kind = '', label, sub }: { x: number; y: number; kind?: string; label?: string; sub?: string }) {
  const h = 10;
  return (
    <g>
      <Cells x={x} y={y} rows={TOKENS.length} h={h} kind={kind} />
      {label ? (
        <text className="tmap__label" x={x + (COLS * CELL) / 2} y={y + TOKENS.length * h + 16} textAnchor="middle">
          {label}
        </text>
      ) : null}
      {sub ? (
        <text className="tmap__note" x={x + (COLS * CELL) / 2} y={y + TOKENS.length * h + 30} textAnchor="middle">
          {sub}
        </text>
      ) : null}
    </g>
  );
}

function EncoderFrame({ F }: { F: Fig }) {
  const bw = COLS * CELL;
  const xIn = 16;
  const yBlock = 118;
  const xStack = 140;
  const wStack = 180;
  const layerH = 34;
  const layerGap = 6;
  const yTop = 22;
  const xOut = 360;
  return (
    <g>
      <Block x={xIn} y={yBlock} label={F.rowsIn} />
      <path className="tmap__line" d={`M ${xIn + bw + 6} ${yBlock + 25} H ${xStack - 10}`} markerEnd="url(#bpw-arrow2)" />
      <rect className="tmap__stack" x={xStack - 8} y={yTop - 8} width={wStack + 16} height={6 * layerH + 5 * layerGap + 16} rx="6" />
      {Array.from({ length: 6 }, (_, k) => {
        const y = yTop + (5 - k) * (layerH + layerGap);
        return (
          <g key={k}>
            <text className="tmap__label--sm" x={xStack - 14} y={y + layerH / 2 + 4} textAnchor="end">
              {F.layer} {k + 1}
            </text>
            <rect className="tmap__box tmap__box--attn" x={xStack} y={y} width={wStack / 2 - 3} height={layerH} rx="4" />
            <text className="tmap__label--sm" x={xStack + wStack / 4 - 1} y={y + layerH / 2 + 4} textAnchor="middle" style={{ fill: 'var(--ink-1)' }}>
              {F.attention}
            </text>
            <rect className="tmap__box tmap__box--ffn" x={xStack + wStack / 2 + 3} y={y} width={wStack / 2 - 3} height={layerH} rx="4" />
            <text className="tmap__label--sm" x={xStack + (3 * wStack) / 4 + 1} y={y + layerH / 2 + 4} textAnchor="middle" style={{ fill: 'var(--ink-1)' }}>
              {F.feedForward}
            </text>
          </g>
        );
      })}
      <path className="tmap__line" d={`M ${xStack + wStack + 10} ${yBlock + 25} H ${xOut - 6}`} markerEnd="url(#bpw-arrow2)" />
      <Block x={xOut} y={yBlock} kind="out" label={F.rowsOut} sub={F.valuesChanged} />
    </g>
  );
}

function DecoderFrame({ F, locale }: { F: Fig; locale: Locale }) {
  const out = locale === 'ko' ? OUT_SO_FAR_KO : OUT_SO_FAR_EN;
  const bw = COLS * CELL;
  const xEnc = 16;
  const yEnc = 60;
  const xStack = 170;
  const wStack = 170;
  const boxH = 30;
  const ys = [140, 96, 52]; // masked, cross, ffn (bottom up)
  const xRows = 200;
  const yRows = 214;
  const rowH = 16;
  return (
    <g>
      <Block x={xEnc} y={yEnc} kind="out" label={F.fromEncoder} />
      <path
        className="tmap__line tmap__line--cross"
        d={`M ${xEnc + bw + 6} ${yEnc + 25} C ${xEnc + bw + 60} ${yEnc + 25}, ${xStack - 50} ${ys[1] + boxH / 2}, ${xStack - 4} ${ys[1] + boxH / 2}`}
        markerEnd="url(#bpw-arrow2)"
      />
      <rect className="tmap__stack" x={xStack - 8} y={ys[2] - 10} width={wStack + 16} height={ys[0] + boxH - ys[2] + 20} rx="6" />
      <text className="tmap__label--sm" x={xStack + wStack + 14} y={ys[1] + boxH / 2 + 4}>
        × 6
      </text>
      {[
        { y: ys[0], label: `① ${F.maskedAttention}`, kind: 'attn' },
        { y: ys[1], label: `② ${F.crossAttention}`, kind: 'attn' },
        { y: ys[2], label: `③ ${F.feedForward}`, kind: 'ffn' },
      ].map((b) => (
        <g key={b.label}>
          <rect className={`tmap__box tmap__box--${b.kind}`} x={xStack} y={b.y} width={wStack} height={boxH} rx="4" />
          <text className="tmap__label" x={xStack + wStack / 2} y={b.y + boxH / 2 + 4} textAnchor="middle">
            {b.label}
          </text>
        </g>
      ))}
      <path className="tmap__line" d={`M ${xStack + wStack / 2} ${ys[0]} V ${ys[1] + boxH + 3}`} markerEnd="url(#bpw-arrow2)" />
      <path className="tmap__line" d={`M ${xStack + wStack / 2} ${ys[1]} V ${ys[2] + boxH + 3}`} markerEnd="url(#bpw-arrow2)" />
      <path className="tmap__line" d={`M ${xStack + wStack / 2} ${ys[2]} V ${ys[2] - 14}`} markerEnd="url(#bpw-arrow2)" />

      {/* The output so far: three rows written, two not yet */}
      <text className="walk__title" x={xRows - 70} y={yRows - 8}>
        {F.outputSoFar}
      </text>
      {Array.from({ length: 5 }, (_, r) => {
        const y = yRows + r * rowH;
        const written = r < out.length;
        return (
          <g key={r}>
            <text className="tmap__label--sm" x={xRows - 6} y={y + 11} textAnchor="end" style={{ fill: written ? 'var(--ink-1)' : 'var(--blocked-ink)' }}>
              {written ? out[r] : '·'}
            </text>
            {Array.from({ length: COLS }, (_, c) => (
              <rect key={c} className={`walk__cell${written ? '' : ' walk__cell--masked'}`} x={xRows + c * CELL} y={y + 2} width={CELL} height={rowH - 4} />
            ))}
          </g>
        );
      })}
      <rect x={xRows - 2} y={yRows + out.length * rowH} width={COLS * CELL + 4} height={(5 - out.length) * rowH} fill="url(#bpw-hatch)" opacity="0.7" />
      <text className="tmap__note" x={xRows + COLS * CELL + 10} y={yRows + out.length * rowH + rowH + 2}>
        {F.notYet}
      </text>
      <path className="tmap__line" d={`M ${xStack + wStack / 2} ${yRows - 14} V ${ys[0] + boxH + 3}`} markerEnd="url(#bpw-arrow2)" />
    </g>
  );
}

function ProbsFrame({ F, locale }: { F: Fig; locale: Locale }) {
  const vocab = locale === 'ko' ? VOCAB_KO : VOCAB_EN;
  const chart = (
    x: number,
    title: string,
    note: string,
    labels: string[],
    values: number[],
    labelW: number,
    barMax: number,
    kind: string,
  ) => {
    const rowH = 26;
    const y0 = 44;
    return (
      <g className="walk__chart" data-kind={kind}>
        <text className="walk__title" x={x} y={20}>
          {title}
        </text>
        {labels.map((lb, r) => {
          const y = y0 + r * rowH;
          return (
            <g key={lb}>
              <text className="tmap__label--sm" x={x + labelW - 6} y={y + 12} textAnchor="end" style={{ fill: 'var(--ink-1)' }}>
                {lb}
              </text>
              <rect className="walk__bar" x={x + labelW} y={y} width={Math.max(2, values[r] * barMax)} height={16} rx="2" />
              <text className="tp__num" x={x + labelW + values[r] * barMax + 6} y={y + 12}>
                {values[r].toFixed(2)}
              </text>
            </g>
          );
        })}
        <text className="tmap__note" x={x} y={y0 + labels.length * rowH + 10}>
          {note}
        </text>
      </g>
    );
  };
  return (
    <g>
      {chart(16, F.nextWordProbs, F.vocabCount, vocab, VOCAB_P, 62, 150, 'vocab')}
      <line x1="288" y1="10" x2="288" y2="220" className="tmap__stack" />
      {chart(304, F.attnProbs, F.tokenCount, TOKENS, ATTN_P, 50, 70, 'attention')}
    </g>
  );
}
