import type { HTMLAttributes } from 'react';
import type { Locale } from '../../lib/i18n/routing';
import type { LessonSnapshot } from '../../lib/math/lessonGeneration';
import { LESSON_END_ID } from '../../lib/math/lessonGeneration';
import { LEARNING_EXAMPLE } from '../../lib/math/examples';
import { fmtCompact, fmtPercent } from '../../lib/math/format';

export function LessonToken({ id, locale, focus = false, newly = false }: { id: number; locale: Locale; focus?: boolean; newly?: boolean }) {
  return <span className="journey-token" data-token-id={id} data-focused={focus} data-new={newly}>{id === LESSON_END_ID ? (locale === 'ko' ? '[끝]' : '[end]') : LEARNING_EXAMPLE[locale].tokens[id]}</span>;
}


export function LessonNumbers({ values, label, locale, ...attributes }: { values: number[]; label?: string; locale: Locale } & HTMLAttributes<HTMLSpanElement>) {
  return <span {...attributes} className={`journey__digits ${attributes.className ?? ''}`} data-size={values.length} role="group" aria-label={label}>{values.map((value, feature) => <span key={feature} aria-label={`${locale === 'ko' ? '값' : 'Entry'} ${feature + 1}: ${value}`}>{fmtCompact(value)}</span>)}</span>;
}

export function LessonProbabilities({ locale, run }: { locale: Locale; run: LessonSnapshot }) {
  const ko = locale === 'ko';
  const probabilityRow = run.probabilities[run.lastPosition];
  return <div className="journey__probabilities" role="group" aria-label={ko ? '다음 어휘 후보의 확률' : 'Next-vocabulary probabilities'} data-journey-probabilities>
    <p>{ko ? '지금 입력 바로 뒤에 올 한 조각의 확률' : 'Probabilities for one chunk immediately after this input'}</p>
    <dl>{probabilityRow.map((p, id) => <div className="journey__probability-row" key={id} data-vocabulary-id={id} data-largest={id === run.nextId}>
      <dt><LessonToken id={id} locale={locale} /></dt><dd><strong data-journey-probability>{fmtPercent(p, 1)}</strong><span className="journey__bar-track" aria-hidden="true"><span className="journey__bar" style={{ width: `${100 * p}%` }} /></span></dd>
    </div>)}</dl>
  </div>;
}

export function LessonContributions({ locale, run }: { locale: Locale; run: LessonSnapshot }) {
  const ko = locale === 'ko';
  const ids = run.tokenIds;
  const last = run.lastPosition;
  const head = run.attention.perHead[0];
  return (
        <figure className="journey__mixture" data-journey-mixture>
          <div className="journey__contributions">{ids.map((id, j) => <div className="journey__contribution" key={id} data-source-id={id}>
            <LessonToken id={id} locale={locale} />
            <div className="journey__coordinates" data-source-values>{head.V[j].map((value, feature) => <span key={feature} data-contribution-source>{fmtCompact(value)}</span>)}</div>
            <strong className="journey__multiply">× <span data-contribution-share>{fmtPercent(head.weights[last][j], 1)}</span></strong>
            <span className="journey__contribution-arrow" aria-hidden="true">→</span>
            <div className="journey__coordinates" data-weighted-values>{head.V[j].map((value, feature) => {
              const contribution = value * head.weights[last][j];
              return <span key={feature} className="journey__coordinate"><strong data-contribution-value>{fmtCompact(contribution, 3)}</strong><span className="journey__contribution-bar" style={{ width: `${head.output[last][feature] === 0 ? 0 : 100 * contribution / head.output[last][feature]}%` }} aria-hidden="true" /></span>;
            })}</div>
          </div>)}</div>
          <div className="journey__merge"><span aria-hidden="true">↓ + ↓</span><span>{ko ? '같은 자리끼리 더하기' : 'Add matching coordinates'}</span></div>
          <div className="journey__mixture-result"><LessonToken id={ids[last]} locale={locale} focus /><div className="journey__coordinates">{head.output[last].map((value, feature) => <span key={feature} className="journey__coordinate"><strong data-journey-head-output>{fmtCompact(value, 3)}</strong><span className="journey__sum-bar" aria-hidden="true">{ids.map((id, j) => <span key={id} data-source-id={id} style={{ width: `${value === 0 ? 0 : 100 * head.V[j][feature] * head.weights[last][j] / value}%` }} />)}</span></span>)}</div></div>
          <figcaption>{ko ? '학교에 자리에 모은 첫 head의 내용입니다. 다음 토큰 확률은 이 뒤의 계산을 거쳐 따로 만듭니다.' : 'This is content gathered by the first head at “went”. Next-token probabilities are computed separately after the remaining operations.'}</figcaption>
        </figure>
  );
}
