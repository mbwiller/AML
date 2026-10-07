/**
 * Astro content collections (docs/CONTENT_AUTHORING.md §1; VISION.md §12).
 *
 * Schemas live in `src/lib/content/schemas.ts` and are shared with
 * `pnpm validate:content`, which also resolves every cross-collection
 * reference. Astro's `reference()` is deliberately not used so that the two
 * tools cannot disagree. Changing this file needs the other developer's review.
 *
 * Collection names are consumed by pages: `units`, `lessons`, `glossary`,
 * `graphNodes`, `graphEdges`, `quizzes`, `flashcards`, `cases`, `homework`.
 */
import { defineCollection } from 'astro:content';
import { file, glob } from 'astro/loaders';

import { yamlListDirLoader, yamlListLoader } from '@/lib/content/loaders';
import {
  caseSchema,
  flashcardSchema,
  glossarySchema,
  graphEdgeId,
  graphEdgeSchema,
  graphNodeSchema,
  homeworkSchema,
  lessonSchema,
  quizItemSchema,
  unitSchema,
} from '@/lib/content/schemas';

/** `src/content/units.yaml`: the nine (and growing) units. Entry id = unit slug. */
const units = defineCollection({
  loader: file('src/content/units.yaml'),
  schema: unitSchema,
});

/**
 * `src/content/units/<unit>/<nn>-<slug>.mdx`. Entry id is Astro's default
 * (`<unit>/<nn>-<slug>`); use `data.unit` and `data.slug` for routing.
 */
const lessons = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './src/content/units' }),
  schema: lessonSchema,
});

/** `src/content/glossary/<id>.mdx`, one sticky note per file. Entry id = file name = `data.id`. */
const glossary = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/glossary' }),
  schema: glossarySchema,
});

/** `src/content/graph/nodes.yaml` (a list). Glossary terms are nodes too; merge at render time. */
const graphNodes = defineCollection({
  loader: yamlListLoader({ file: 'src/content/graph/nodes.yaml' }),
  schema: graphNodeSchema,
});

/** `src/content/graph/edges.yaml` (a list). Entry id = `${from}--${type}--${to}`. */
const graphEdges = defineCollection({
  loader: yamlListLoader({
    file: 'src/content/graph/edges.yaml',
    idOf: (item) => {
      const parsed = graphEdgeSchema.safeParse(item);
      return parsed.success ? graphEdgeId(parsed.data) : undefined;
    },
  }),
  schema: graphEdgeSchema,
});

/** `src/content/quizzes/<unit>.yaml`, each a list of items; one entry per item with `data.unit` from the file name. */
const quizzes = defineCollection({
  loader: yamlListDirLoader({ dir: 'src/content/quizzes' }),
  schema: quizItemSchema,
});

/** `src/content/flashcards/<unit>.yaml`, same shape as quizzes. */
const flashcards = defineCollection({
  loader: yamlListDirLoader({ dir: 'src/content/flashcards' }),
  schema: flashcardSchema,
});

/** `src/content/cases/<id>.mdx`: the eight clinical running examples. */
const cases = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/cases' }),
  schema: caseSchema,
});

/** `src/content/homework/<id>.mdx`: readiness gates and (post-deadline) walkthroughs. */
const homework = defineCollection({
  loader: glob({ pattern: '*.mdx', base: './src/content/homework' }),
  schema: homeworkSchema,
});

export const collections = {
  units,
  lessons,
  glossary,
  graphNodes,
  graphEdges,
  quizzes,
  flashcards,
  cases,
  homework,
};
