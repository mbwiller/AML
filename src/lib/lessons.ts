/**
 * Pure helpers for lesson navigation and display (framework-free, unit-tested).
 */
import type { Lesson, Unit } from '@/lib/content/schemas';

export interface LessonRef {
  /** Collection entry id, e.g. `u6-generative-models-and-naive-bayes/03-naive-bayes`. */
  id: string;
  data: Lesson;
}

/** `u6-generative-models-and-naive-bayes` → 6. Returns null for ids that do not start with `u<n>-`. */
export function unitNumber(unitId: string): number | null {
  const m = /^u(\d+)-/.exec(unitId);
  return m?.[1] === undefined ? null : Number(m[1]);
}

/** "6.3" for order 3 in unit u6-…; falls back to the bare order when the unit has no number. */
export function lessonNumber(unitId: string, order: number): string {
  const u = unitNumber(unitId);
  return u === null ? String(order) : `${u}.${order}`;
}

export function lessonHref(unitId: string, slug: string): string {
  return `/units/${unitId}/${slug}`;
}

export function unitHref(unitId: string): string {
  return `/units/${unitId}`;
}

/** "L9 pp. 20–40; L10 p. 3" from the frontmatter `lectures` list. */
export function lectureProvenance(lectures: Lesson['lectures']): string {
  return lectures
    .map(({ lecture, pages }) => {
      const range = pages.replace(/\s*-\s*/g, '–');
      const multi = /[–,]/.test(range);
      return `L${lecture} ${multi ? 'pp.' : 'p.'} ${range}`;
    })
    .join('; ');
}

/** Draft lessons are hidden from navigation in production builds, visible in `pnpm dev`. */
export function isNavigable(lesson: Lesson, dev: boolean): boolean {
  return dev || lesson.status !== 'draft';
}

/** Lessons sorted by unit order, then lesson order. */
export function sortLessons<T extends LessonRef>(lessons: T[], units: Unit[]): T[] {
  const unitOrder = new Map(units.map((u) => [u.id, u.order]));
  return [...lessons].sort((a, b) => {
    const ua = unitOrder.get(a.data.unit) ?? Number.MAX_SAFE_INTEGER;
    const ub = unitOrder.get(b.data.unit) ?? Number.MAX_SAFE_INTEGER;
    return ua - ub || a.data.order - b.data.order;
  });
}

/** Previous and next lesson in course order, across unit boundaries. */
export function neighbors<T extends LessonRef>(
  sorted: T[],
  id: string,
): { prev: T | undefined; next: T | undefined } {
  const i = sorted.findIndex((l) => l.id === id);
  return { prev: i > 0 ? sorted[i - 1] : undefined, next: i >= 0 ? sorted[i + 1] : undefined };
}

export interface OutlineItem {
  depth: number;
  slug: string;
  text: string;
}

/** Keep h2/h3 only: the twelve anatomy sections and the definitions/derivations inside them. */
export function outlineFromHeadings(headings: OutlineItem[]): OutlineItem[] {
  return headings.filter((h) => h.depth === 2 || h.depth === 3);
}

/** Minutes → "45 min" / "1 h 05 min". */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')} min`;
}
