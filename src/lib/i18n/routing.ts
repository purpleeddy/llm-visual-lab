/**
 * Building URLs.
 *
 * GitHub Pages serves the site under `/llm-visual-lab/`.
 * Astro adds that base to the paths file-based routing produces, but not to
 * `href` strings we write ourselves.
 * Every internal link has to go through a function in this file.
 */

export const LOCALES = ['ko', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ko';

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

/** Prefixes import.meta.env.BASE_URL. Always ends in `/`. */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL ?? '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = path.replace(/^\/+/, '');
  if (cleanPath === '') return cleanBase;
  return cleanPath.endsWith('/') ? `${cleanBase}${cleanPath}` : `${cleanBase}${cleanPath}/`;
}

/**
 * Builds a URL from a document id.
 * A document id is a language-neutral identifier; the article is the home
 * page, so its id is the empty string.
 */
export function docHref(locale: Locale, docId: string): string {
  const id = docId.replace(/^\/+|\/+$/g, '');
  return withBase(id === '' ? locale : `${locale}/${id}`);
}

/** Splits a collection id (`ko/index`) into language and document id. A trailing `index` drops off, leaving `''`. */
export function splitEntryId(entryId: string): { locale: Locale; docId: string } {
  const [head, ...rest] = entryId.split('/');
  if (!isLocale(head)) {
    throw new Error(`document id does not start with a language code: ${entryId}`);
  }
  return { locale: head, docId: rest.join('/') };
}

/** Reads the language out of a URL path. Works with the base prefix in place. */
export function localeFromPathname(pathname: string): Locale {
  const base = (import.meta.env.BASE_URL ?? '/').replace(/\/+$/, '');
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;
  const seg = rest.replace(/^\/+/, '').split('/')[0];
  return isLocale(seg) ? seg : DEFAULT_LOCALE;
}

export const OTHER_LOCALE: Record<Locale, Locale> = { ko: 'en', en: 'ko' };

/**
 * Splits a collection id into language and document id.
 * Both `ko` and `ko/index` mean that language's first screen (docId = '').
 *
 * getStaticPaths runs in isolation, so this has to be imported from a module.
 * Defined inside a page's frontmatter it is not visible when that runs.
 */
export function parseEntryId(entryId: string): { locale: Locale; docId: string } {
  const parts = entryId.split('/').filter(Boolean);
  const head = parts[0];
  if (!isLocale(head)) {
    throw new Error(`document id does not begin with a language code: ${entryId}`);
  }
  const rest = parts.slice(1);
  if (rest.length > 0 && rest[rest.length - 1] === 'index') rest.pop();
  return { locale: head, docId: rest.join('/') };
}
