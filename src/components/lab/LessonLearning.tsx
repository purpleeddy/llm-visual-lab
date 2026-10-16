import { useMemo, useState } from 'react';
import type { Locale } from '../../lib/i18n/routing';
import { lessonReadoutStep } from '../../lib/math/lessonGeneration';
import { fmt } from '../../lib/math/format';
import { LessonToken as Token, LessonProbabilities } from './LessonPrimitives';
import '../../styles/lesson.css';

export function LessonLearning({ locale }: { locale: Locale }) {
  const ko = locale === 'ko';
  const step = useMemo(() => lessonReadoutStep(), []);
  const [applied, setApplied] = useState(false);
  const run = applied ? step.after : step.before;
  const row = run.lastPosition;
  return <section className="lesson-learning" data-learning-applied={applied} data-learning-prefix={run.tokenIds.join(',')}>
    <p data-learning-input>{ko ? '입력' : 'Input'}: {run.tokenIds.map(id => <Token key={id} id={id} locale={locale} />)}</p>
    <p>{ko ? '별도의 정답 라벨' : 'Separate target label'}: <Token id={step.targetId} locale={locale} /></p>
    <p>{ko ? '바꿀 계수: 마지막 표현의 셋째 값에서 정답 후보로 가는 계수 하나' : 'Change one coefficient: from the third hidden feature to the target candidate'}.</p>
    <p>{ko ? '현재 계수' : 'Current coefficient'}: <strong data-learning-weight>{fmt(applied ? step.nextWeight : step.weight, 6)}</strong></p>
    <p>{ko ? '기울기' : 'Gradient'} {fmt(step.gradient, 6)} · {ko ? '학습률' : 'learning rate'} {step.learningRate}</p>
    <p className="lesson-equation">{fmt(step.weight, 6)} − {step.learningRate} × ({fmt(step.gradient, 6)}) = {fmt(step.nextWeight, 6)}</p>
    <p>{ko ? '정답 확률' : 'Target probability'}: <strong data-learning-target>{fmt(run.probabilities[row][step.targetId], 7)}</strong> · {ko ? '손실' : 'loss'}: <strong data-learning-loss>{fmt(applied ? step.afterLoss : step.beforeLoss, 6)}</strong></p>
    <LessonProbabilities locale={locale} run={run} />
    <button type="button" className="btn" onClick={() => setApplied(value => !value)}>{applied ? (ko ? '학습 전으로 되돌리기' : 'Return to before the update') : (ko ? '이 계수 하나를 한 번 고치기' : 'Update this one coefficient once')}</button>
  </section>;
}
