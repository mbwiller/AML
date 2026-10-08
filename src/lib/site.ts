/**
 * Build-time queries shared by pages (Astro-dependent; keep logic in src/lib/lessons.ts).
 */
import { getCollection } from 'astro:content';

import { isNavigable, lessonHref, lessonNumber, sortLessons } from '@/lib/lessons';
import type { LessonNeighbor, PrereqChip } from '@/layouts/Lesson.astro';

export async function getUnits() {
  const units = await getCollection('units');
  return units.map((u) => u.data).sort((a, b) => a.order - b.order);
}

/** All lessons in course order; drafts included in dev, excluded in production builds. */
export async function getCourseLessons() {
  const [units, lessons] = await Promise.all([getUnits(), getCollection('lessons')]);
  const visible = lessons.filter((l) => isNavigable(l.data, import.meta.env.DEV));
  return { units, lessons: sortLessons(visible, units) };
}

export function toNeighbor(
  l: { data: { unit: string; slug: string; title: string; order: number } } | undefined,
): LessonNeighbor | undefined {
  if (!l) return undefined;
  return {
    href: lessonHref(l.data.unit, l.data.slug),
    number: lessonNumber(l.data.unit, l.data.order),
    title: l.data.title,
  };
}

/**
 * One glossary entry by id, or undefined. Avoids `getEntry`, which logs a
 * build warning for unknown ids; those are expected while content runs ahead
 * of the glossary (the sticky then shows a "no entry yet" card).
 */
export async function glossaryEntry(id: string) {
  const glossary = await getCollection('glossary');
  return glossary.find((g) => g.data.id === id);
}

/**
 * Prerequisite chips. Glossary terms open the sticky card in place
 * (`sticky: true`; the link to /glossary#id is the no-JS fallback);
 * concept nodes link to the Atlas.
 */
export async function prereqChips(ids: string[]): Promise<PrereqChip[]> {
  const [glossary, nodes] = await Promise.all([
    getCollection('glossary'),
    getCollection('graphNodes'),
  ]);
  const terms = new Map(glossary.map((g) => [g.data.id, g.data]));
  const concepts = new Map(nodes.map((n) => [n.data.id, n.data]));
  return ids.map((id) => {
    const term = terms.get(id);
    if (term) {
      return { id, label: term.term, href: `/glossary#${id}`, field: term.field, sticky: true };
    }
    const node = concepts.get(id);
    return {
      id,
      label: node?.label ?? id.replace(/-/g, ' '),
      href: `/atlas?node=${id}`,
      field: node?.field,
    };
  });
}
