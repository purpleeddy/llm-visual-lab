/**
 * The left-hand menu — the whole path through learning about LLMs.
 *
 * This wiki starts from one paper and widens out into what came after it.
 * The order here is that path; only the first entry can be read today.
 *
 * The entries that follow come from the expansion directions in section 6 of
 * `docs/plan.md`. They have no document yet, so they are **not links**: the
 * plan's rule is never to present a document that does not exist as if it did.
 */

import type { Locale } from './i18n/routing';

export interface CourseItem {
  /** Document id. The article is the home page, so the first entry is empty. */
  id?: string;
  title: Record<Locale, string>;
  status: 'ready' | 'planned';
}

export interface CourseGroup {
  title: Record<Locale, string>;
  /** Set once on a group that is not written yet. A badge per item would repeat nine times. */
  planned?: boolean;
  items: CourseItem[];
}

export const COURSE: CourseGroup[] = [
  {
    title: { ko: '출발점', en: 'Where it starts' },
    items: [{ id: '', title: { ko: 'Attention Is All You Need', en: 'Attention Is All You Need' }, status: 'ready' }],
  },
  {
    title: { ko: '이어지는 길', en: 'Where it goes' },
    planned: true,
    items: [
      { title: { ko: '자기회귀 언어 모델', en: 'Autoregressive language models' }, status: 'planned' },
      { title: { ko: '규모와 일반화', en: 'Scale and generalisation' }, status: 'planned' },
      { title: { ko: '현대 decoder 블록', en: 'The modern decoder block' }, status: 'planned' },
      { title: { ko: '긴 문맥과 추론 효율', en: 'Long context and inference cost' }, status: 'planned' },
      { title: { ko: '희소 구조', en: 'Sparse structure' }, status: 'planned' },
      { title: { ko: '후학습과 추론 능력', en: 'Post-training and reasoning' }, status: 'planned' },
      { title: { ko: '멀티모달과 도구', en: 'Multimodal input and tools' }, status: 'planned' },
      { title: { ko: '새로운 시퀀스 구조', en: 'Other sequence structures' }, status: 'planned' },
      { title: { ko: '최신 모델 해부', en: 'Anatomy of a recent model' }, status: 'planned' },
    ],
  },
];

/** How many documents can actually be read. Not shown on screen; the tests use it. */
export const READY_COUNT = COURSE.flatMap((g) => g.items).filter((i) => i.status === 'ready').length;
