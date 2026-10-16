import { useMemo, useState } from 'react';
import type { Locale } from '../../lib/i18n/routing';
import { lessonSnapshot, advanceLesson, LESSON_INITIAL_IDS } from '../../lib/math/lessonGeneration';
import { LessonToken as Token, LessonProbabilities } from './LessonPrimitives';
import { fmt } from '../../lib/math/format';
import '../../styles/lesson.css';

export function LessonGeneration({ locale }: { locale: Locale }) {
  const ko = locale === 'ko';
  const [ids, setIds] = useState<number[]>([...LESSON_INITIAL_IDS]);
  const [finished, setFinished] = useState(false);
  const run = useMemo(() => lessonSnapshot(ids), [ids]);
  const choose = () => {
    const choice = advanceLesson(run);
    if (choice.finished) setFinished(true);
    else setIds(choice.tokenIds);
  };
  return <section className="lesson-generation" data-generation-prefix={ids.join(',')} data-generation-finished={finished}>
    <p data-generation-input>{ko ? '현재 입력' : 'Current input'}: {ids.map((id, i) => <Token key={i} id={id} locale={locale} focus={i === run.lastPosition} newly={i > 1} />)}</p>
    <p>{ko ? '온도 T = 1 · 같은 어휘 점수에 softmax를 적용합니다.' : 'Temperature T = 1 · apply softmax to the same vocabulary scores.'}</p>
    <p className="lesson-equation" data-generation-logits>({run.logits[run.lastPosition].map(value => fmt(value, 3)).join(', ')})</p>
    <LessonProbabilities locale={locale} run={run} />
    <p>{ko ? '최댓값 후보' : 'Highest-probability candidate'}: <Token id={run.nextId} locale={locale} /></p>
    {finished ? <p role="status">{ko ? '[끝]을 골라 멈췄습니다. 끝 표시를 입력에 넣어 다시 조회하지 않습니다.' : 'Choosing [end] stops generation. It is not put into the input for another lookup.'}</p> : <button type="button" className="btn lesson-generate" onClick={choose}>{ko ? '가장 큰 확률의 후보 고르기' : 'Choose the highest-probability candidate'}</button>}
    <button type="button" className="btn lesson-generation-reset" onClick={() => { setIds([...LESSON_INITIAL_IDS]); setFinished(false); }}>{ko ? '두 입력부터 다시' : 'Restart with two inputs'}</button>
  </section>;
}
