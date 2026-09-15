/**
 * The left-hand menu — the learning path.
 *
 * This wiki starts from one paper and widens out into what came after it. Only
 * documents that exist are listed here. A group with nothing in it yet is shown
 * as "in preparation" rather than filled with titles.
 *
 * It used to list nine follow-up topics marked as planned. They were lifted from
 * section 6 of `docs/plan.md`, which calls them recommended directions, not a
 * sequence, and none of them had a scope, an order or a date. Listing them as a
 * path promised something that did not exist, so they were removed.
 */

import type { Locale } from './i18n/routing';

export interface CourseItem {
  /** Document id. The article is the home page, so its id is the empty string. */
  id: string;
  title: Record<Locale, string>;
}

export interface CourseGroup {
  title: Record<Locale, string>;
  /** Readable documents only. An empty group renders as "in preparation". */
  items: CourseItem[];
}

export const COURSE: CourseGroup[] = [
  {
    title: { ko: '출발점', en: 'Where it starts' },
    items: [{ id: '', title: { ko: 'Attention Is All You Need', en: 'Attention Is All You Need' } }],
  },
  {
    title: { ko: '이어지는 길', en: 'Where it goes' },
    items: [],
  },
];

/** How many documents the menu links to. Not shown on screen; the tests use it. */
export const READY_COUNT = COURSE.flatMap((g) => g.items).length;
