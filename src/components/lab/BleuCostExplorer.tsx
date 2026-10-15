import { ScrollRegion } from './ScrollRegion';
import { useMemo, useState } from 'react';
import { TABLE2 } from '../../lib/paper';
import { t } from '../../lib/i18n/ui';
import { EXPLORER_TEXT } from '../../lib/i18n/explorers';
import type { Locale } from '../../lib/i18n/routing';

type Pair = 'enDe' | 'enFr';

/**
 * Table 2 as quality against cost, with the language pair to choose.
 *
 * These are the authors' numbers, transcribed in `paper.ts`; the cost axis is
 * their own estimate. The only thing computed here is where to put the dots.
 */
export function BleuCostExplorer({ locale }: { locale: Locale }) {
  const ui = t(locale);
  const text = EXPLORER_TEXT[locale].bleuCost;
  const [pair, setPair] = useState<Pair>('enDe');

  const points = useMemo(
    () =>
      TABLE2.map((m) => ({
        model: m.model,
        bleu: pair === 'enDe' ? m.bleuEnDe : m.bleuEnFr,
        flops: pair === 'enDe' ? m.flopsEnDe : m.flopsEnFr,
        transformer: m.transformer,
      })).filter((p): p is typeof p & { bleu: number; flops: number } => p.bleu !== null && p.flops !== null),
    [pair],
  );

  const PAD_L = 50;
  const PAD_R = 250;
  const PAD_T = 24;
  const H = 320;
  const W = 760;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - 80;
  const exps = points.map((p) => Math.log10(p.flops));
  const minE = Math.floor(Math.min(...exps));
  const maxE = Math.ceil(Math.max(...exps));
  const bleus = points.map((p) => p.bleu);
  const minB = Math.floor(Math.min(...bleus) - 0.5);
  const maxB = Math.ceil(Math.max(...bleus) + 0.5);
  const cx = (flops: number) => PAD_L + ((Math.log10(flops) - minE) / (maxE - minE)) * plotW;
  const cy = (bleu: number) => PAD_T + plotH - ((bleu - minB) / (maxB - minB)) * plotH;
  const shortName = (m: string) => m.replace(' model', '');
  const labeledPoints = [...points].sort((a, b) => b.bleu - a.bleu).map((p, i) => ({ ...p, labelY: PAD_T + 14 + i * 24 }));
  const labelX = PAD_L + plotW + 18;
  const ticks = Array.from({ length: maxE - minE + 1 }, (_, i) => minE + i);
  const best = points.reduce((a, b) => (b.bleu > a.bleu ? b : a));

  return (
    <section className="lab lab--bleucost" aria-label={text.title}>
      <header className="lab__header">
        <div>
          <h3 className="lab__title">{text.title}</h3>
          <p className="lab__kind">
            <span className="badge badge--partial">
              <span className="badge__dot" />
              {text.kind}
            </span>
          </p>
        </div>
        <div className="lab__toggles">
          <div className="lab__toggle">
            <span className="lab__toggle-label" id="bc-pair-label">
              {text.pair}
            </span>
            <div className="segmented" role="group" aria-labelledby="bc-pair-label">
              <button type="button" aria-pressed={pair === 'enDe'} onClick={() => setPair('enDe')}>
                {text.pairs[0]}
              </button>
              <button type="button" aria-pressed={pair === 'enFr'} onClick={() => setPair('enFr')}>
                {text.pairs[1]}
              </button>
            </div>
          </div>
        </div>
      </header>
      <p className="lab__note">{text.note}</p>

      <div className="explorer__panels">
        <ScrollRegion className="explorer__plot-scroll" locale={locale} label={text.title}><svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="explorer__svg" aria-hidden="true">
          <path className="tmap__line tmap__line--faint" d={`M ${PAD_L} ${PAD_T} V ${PAD_T + plotH} H ${PAD_L + plotW}`} />
          <text className="tmap__note" x={10} y={PAD_T - 8}>
            BLEU
          </text>
          <text className="tmap__note" x={PAD_L + plotW} y={PAD_T + plotH + 36} textAnchor="end">
            {locale === 'ko' ? '학습에 든 계산량 (FLOPs, 로그)' : 'training cost (FLOPs, log)'}
          </text>
          {ticks.map((e) => (
            <g key={e}>
              <path className="tmap__line tmap__line--faint" d={`M ${cx(Math.pow(10, e))} ${PAD_T} V ${PAD_T + plotH}`} />
              <text className="tmap__note" x={cx(Math.pow(10, e))} y={PAD_T + plotH + 16} textAnchor="middle">
                10^{e}
              </text>
            </g>
          ))}
          {Array.from({ length: Math.floor((maxB - minB) / 2) + 1 }, (_, i) => minB + i * 2).map((v) => (
            <text key={v} className="tmap__note" x={PAD_L - 8} y={cy(v) + 4} textAnchor="end">
              {v}
            </text>
          ))}
          {labeledPoints.map((p) => (
            <g key={p.model} data-model={p.model} style={{ transition: 'transform var(--motion-slow) var(--ease)' }}>
              <circle className={`bc__dot${p.transformer ? ' bc__dot--transformer' : ''}`} cx={cx(p.flops)} cy={cy(p.bleu)} r={p.transformer ? 6 : 4.5} />
              <path className="tmap__line tmap__line--faint" d={`M ${cx(p.flops) + 7} ${cy(p.bleu)} H ${labelX - 8} V ${p.labelY - 4} H ${labelX - 3}`} />
              <text className="tmap__note" x={labelX} y={p.labelY}>
                {shortName(p.model)}
              </text>
            </g>
          ))}
          <g>
            <circle className="bc__dot bc__dot--transformer" cx={PAD_L} cy={H - 12} r="6" />
            <text className="tmap__note" x={PAD_L + 12} y={H - 8}>
              Transformer
            </text>
            <circle className="bc__dot" cx={PAD_L + 140} cy={H - 12} r="4.5" />
            <text className="tmap__note" x={PAD_L + 152} y={H - 8}>
              {locale === 'ko' ? '이전 모델' : 'earlier models'}
            </text>
          </g>
        </svg></ScrollRegion>
      </div>
      <p className="explorer__line" aria-live="polite">
        <strong>{text.pairs[pair === 'enDe' ? 0 : 1]}</strong> {locale === 'ko' ? `가장 높은 점수: ${shortName(best.model)} ${best.bleu}` : `highest: ${shortName(best.model)} at ${best.bleu}`}
      </p>
      <p className="lab__hint">
        <strong>{ui.lab.tryThis}</strong> {text.tryThis}
      </p>
    </section>
  );
}
