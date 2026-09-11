/**
 * The sections of the article.
 *
 * The whole piece is one page, and the contents rail is its list of sections.
 * Anchor ids are written out **explicitly** here rather than slugged from the
 * heading text, so that rewording a heading cannot silently break every link
 * pointing at it.
 */

import type { Locale } from './i18n/routing';

/** The document id of the article. It is the home page, so the id is empty. */
export const ARTICLE_ID = '';

export type SectionStatus = 'complete' | 'planned';

export interface SectionItem {
  /** The anchor id within the page */
  id: string;
  title: Record<Locale, string>;
  status: SectionStatus;
  /** For a planned section, the stage it is scheduled for */
  stage?: string;
}

export const SECTIONS: SectionItem[] = [
  {
    id: 'problem',
    title: { ko: '한 문장을 다른 말로 바꾸려면', en: 'Turning one sentence into another' },
    status: 'complete',
  },
  {
    id: 'big-picture',
    title: { ko: '전체 그림 먼저 보기', en: 'The whole picture first' },
    status: 'complete',
  },
  {
    id: 'numbers',
    title: { ko: '숫자 여러 개를 한 덩어리로', en: 'Handling many numbers at once' },
    status: 'complete',
  },
  {
    id: 'similarity',
    title: { ko: '얼마나 비슷한지 재기', en: 'Measuring how well two things match' },
    status: 'complete',
  },
  {
    id: 'proportion',
    title: { ko: '점수를 비율로 바꾸기', en: 'Turning scores into proportions' },
    status: 'complete',
  },
  {
    id: 'attention',
    title: { ko: '직접 계산해 보기', en: 'Computing it yourself' },
    status: 'complete',
  },
  {
    id: 'multi-head',
    title: { ko: '여러 개로 나눠서 보기', en: 'Splitting into several views' },
    status: 'complete',
  },
  {
    id: 'positions',
    title: { ko: '순서를 알려주는 법', en: 'Telling it the order' },
    status: 'complete',
  },
  {
    id: 'blocks',
    title: { ko: '나머지 부품들', en: 'The remaining parts' },
    status: 'complete',
  },
  {
    id: 'training',
    title: { ko: '어떻게 배우는가', en: 'How it learns' },
    status: 'complete',
  },
  {
    id: 'generation',
    title: { ko: '문장을 만들어 내기', en: 'Producing a sentence' },
    status: 'complete',
  },
  {
    id: 'results',
    title: { ko: '얼마나 잘했는지', en: 'How well it did' },
    status: 'complete',
  },
];

export function sectionById(id: string): SectionItem | undefined {
  return SECTIONS.find((s) => s.id === id);
}
