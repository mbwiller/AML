/**
 * Text normalization shared by the glossary page's client-side filter and the
 * build-time search index. No imports: it ships to the browser.
 */

/** Lowercase, strip diacritics and typographic quotes, collapse whitespace. */
export function normalizeSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2018\u2019\u02bc]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}
