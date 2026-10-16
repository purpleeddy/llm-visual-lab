import { useMemo, useState } from 'react';
import { advanceLesson, lessonSnapshot, LESSON_INITIAL_IDS } from '../../lib/math/lessonGeneration';
import { LEARNING_EXAMPLE } from '../../lib/math/examples';
import { LessonToken as Token, LessonProbabilities } from './LessonPrimitives';
import type { Locale } from '../../lib/i18n/routing';
import '../../styles/journey.css';

/** One choice, append, recompute loop. Its calculation is explained once in the article. */
export function GenerationJourney({ locale }: { locale: Locale }) {
  const ko = locale === 'ko';
  const [ids, setIds] = useState<number[]>([...LESSON_INITIAL_IDS]);
  const [finished, setFinished] = useState(false);
  const [status, setStatus] = useState('');
  const run = useMemo(() => lessonSnapshot(ids), [ids]);
  const stage = finished ? 'finished' : ids.length > 2 ? 'append' : 'purpose';
  const reset = () => {
    setIds([...LESSON_INITIAL_IDS]); setFinished(false);
    setStatus(ko ? '나는 / 학교에 두 입력으로 돌아왔습니다.' : 'Reset to the two inputs: I / went.');
  };
  const next = () => {
    const choice = advanceLesson(run);
    if (choice.finished) {
      setFinished(true);
      setStatus(ko ? '끝을 골라 생성을 멈췄습니다.' : 'Selected end. Generation has stopped.');
    } else {
      setIds(choice.tokenIds);
      const token = LEARNING_EXAMPLE[locale].tokens[run.nextId];
      setStatus(ko ? `${token}를 붙였습니다. 늘어난 입력으로 다음 확률을 다시 계산했습니다.` : `Appended ${token}. Recomputed the next probabilities from the longer input.`);
    }
  };
  return <section id="generation-opening" className="lab lab--generation-journey" aria-label={ko ? '다음 토큰 고르기' : 'Choose the next token'} data-mode="overview" data-progress={`${finished ? 3 : ids.length > 2 ? 2 : 1}/3`} data-stage={stage} data-prefix={ids.join(',')} data-finished={finished}>
    <div className="journey__input" data-journey-input><span>{ko ? '입력' : 'Input'}</span><div>{ids.map((id, i) => <Token key={i} id={id} locale={locale} focus={i === run.lastPosition} newly={i > 1} />)}</div></div>
    <LessonProbabilities locale={locale} run={run} />
    <div className="journey__controls">
      {!finished && <button type="button" className="btn journey__next" onClick={next}>{ko ? (ids.length > 2 ? '끝 고르기' : '갔다 붙이기') : (ids.length > 2 ? 'Choose end' : 'Append “to school”')}</button>}
      {ids.length > 2 && <button type="button" className="btn journey__restart" onClick={reset}>{ko ? '처음부터' : 'Reset'}</button>}
    </div>
    <p className="journey__status" role="status" aria-live="polite" aria-atomic="true">{status || (ko ? '가장 큰 확률의 조각을 고릅니다.' : 'Choose the highest-probability chunk.')}</p>
    <a className="journey__secondary journey__detail" href="#tokens">{ko ? '계산 살펴보기' : 'Explore the calculation'} →</a>
  </section>;
}
