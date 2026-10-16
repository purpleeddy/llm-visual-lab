import type { Locale } from '../../lib/i18n/routing';
import { lessonSnapshot, advanceLesson } from '../../lib/math/lessonGeneration';
import { LessonToken as Token } from './LessonPrimitives';
import { fmtPercent } from '../../lib/math/format';
import '../../styles/lesson.css';

/** A compact reference to the opening, calculated from the same model. */
export function LessonGeneration({ locale }: { locale: Locale }) {
  const ko = locale === 'ko';
  const first = lessonSnapshot();
  const appended = lessonSnapshot(advanceLesson(first).tokenIds);
  return <figure className="lesson-generation" data-generation-reference>
    <div className="lesson-generation-steps">{[first, appended].map((run, i) => <div key={i} data-generation-prefix={run.tokenIds.join(',')}>
      <span>{run.tokenIds.map((id, j) => <Token key={j} id={id} locale={locale} />)}</span>
      <span>→ <Token id={run.nextId} locale={locale} /> <strong data-generation-choice-probability>{fmtPercent(run.probabilities[run.lastPosition][run.nextId], 1)}</strong></span>
    </div>)}</div>
    <figcaption>{ko ? '같은 계수로 다시 계산합니다. 끝을 고르면 멈춥니다.' : 'Recompute with the same coefficients. Choosing end stops generation.'} <a href="#generation-opening">{ko ? '위에서 직접 해 보기' : 'Try it above'} ↑</a></figcaption>
  </figure>;
}
