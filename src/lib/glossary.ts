/**
 * Pure helpers for the glossary page (framework-free, unit-tested).
 * Build-time only: it imports the Zod schemas. Client scripts import the
 * dependency-free pieces directly from src/lib/search-text.ts and
 * src/lib/popover.ts, which are re-exported here for tests and pages.
 * Astro-dependent queries live in src/lib/site.ts; the DOM controller in
 * src/components/shell/sticky-controller.ts.
 */
import { FIELDS, type Field, type GlossaryTerm, type Lesson } from '@/lib/content/schemas';
import { normalizeSearch } from '@/lib/search-text';

export { normalizeSearch } from '@/lib/search-text';
export { placePopover, type Placement, type Rect, type Size } from '@/lib/popover';

/** Display order on /glossary and in filter rows (STYLE_GUIDE §4.1 table order). */
export const FIELD_ORDER: readonly Field[] = FIELDS;

/** Labels from STYLE_GUIDE §4.1, sentence case. */
export const FIELD_LABELS: Record<Field, string> = {
  probability: 'Probability',
  statistics: 'Statistics',
  'linear-algebra': 'Linear algebra',
  calculus: 'Calculus and optimization',
  'information-theory': 'Information theory',
  ml: 'ML methods',
  evaluation: 'Metrics and evaluation',
};

export function isField(value: string | undefined): value is Field {
  return value !== undefined && (FIELDS as readonly string[]).includes(value);
}

export interface FieldGroup<T extends GlossaryTerm = GlossaryTerm> {
  field: Field;
  label: string;
  terms: T[];
}

/** Terms grouped in field order, alphabetical within a group; empty fields are omitted. */
export function groupByField<T extends GlossaryTerm>(terms: readonly T[]): FieldGroup<T>[] {
  const collator = new Intl.Collator('en', { sensitivity: 'base' });
  return FIELD_ORDER.map((field) => ({
    field,
    label: FIELD_LABELS[field],
    terms: terms.filter((t) => t.field === field).sort((a, b) => collator.compare(a.term, b.term)),
  })).filter((g) => g.terms.length > 0);
}

/** The searchable text of a term: term, aliases, and the id with hyphens as spaces. */
export function searchText(term: Pick<GlossaryTerm, 'id' | 'term' | 'aliases'>): string {
  return normalizeSearch([term.term, ...term.aliases, term.id.replace(/-/g, ' ')].join(' | '));
}

/** Substring match on term + aliases; an empty query matches everything. */
export function matchesQuery(
  term: Pick<GlossaryTerm, 'id' | 'term' | 'aliases'>,
  query: string,
): boolean {
  const q = normalizeSearch(query);
  return q === '' || searchText(term).includes(q);
}

export interface LessonLike {
  data: Pick<Lesson, 'unit' | 'slug' | 'title' | 'order' | 'prerequisites'>;
}

/** Lessons whose `prerequisites` include the term, in the order given (course order). */
export function usedBy<T extends LessonLike>(lessons: readonly T[], termId: string): T[] {
  return lessons.filter((l) => l.data.prerequisites.includes(termId));
}

/** Related ids that exist in the glossary, in the order written. */
export function knownRelated(related: readonly string[], known: ReadonlySet<string>): string[] {
  return related.filter((id) => known.has(id));
}
