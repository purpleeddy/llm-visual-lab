import { useMemo, useState } from 'react';
import type { Locale } from '../../lib/i18n/routing';
import { lessonSnapshot, LESSON_INITIAL_IDS } from '../../lib/math/lessonGeneration';
import { addPositions } from '../../lib/math/positional';
import { MatrixGrid } from './MatrixGrid';
import { LessonComputation } from './LessonComputation';

export function LessonPositionExtension({ locale }: { locale: Locale }) {
  const ko = locale === 'ko';
  const [enabled, setEnabled] = useState(false);
  const run = useMemo(() => lessonSnapshot(LESSON_INITIAL_IDS, enabled), [enabled]);
  const added = addPositions(run.stages.embedding);
  return <section className="lesson-position-extension" data-position-added={enabled}>
    <label><input type="checkbox" checked={enabled} onChange={event => setEnabled(event.target.checked)} /> {ko ? '입력에 위치 벡터 더하기' : 'Add position vectors to the input'}</label>
    <p>{enabled ? (ko ? '입력 + 위치 벡터 → 새 입력으로 아래 계산을 다시 합니다.' : 'Input + position vectors → recompute the following operations from that new input.') : (ko ? '현재는 입력을 그대로 씁니다. 체크하면 각 칸에 위치 값을 더합니다.' : 'The input currently passes through unchanged. Check to add a position value to every entry.')}</p>
    <div className="lesson-position-addition"><MatrixGrid matrix={run.stages.embedding} name={ko ? '입력' : 'Input'} compact /><span aria-hidden="true">{enabled ? '+' : '→'}</span>{enabled && <><MatrixGrid matrix={added.pe} name={ko ? '위치 벡터' : 'Position vectors'} decimals={3} /><span aria-hidden="true">=</span></>}<MatrixGrid matrix={run.stages.position} name={ko ? '이후 계산의 입력' : 'Input to subsequent operations'} decimals={3} /></div>
    {(['projection', 'scores', 'shares', 'aggregation', 'heads', 'residual', 'feed-forward', 'hidden', 'readout'] as const).map(stage => <LessonComputation key={stage} locale={locale} stage={stage} snapshot={run} />)}
  </section>;
}
