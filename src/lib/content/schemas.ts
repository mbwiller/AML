/**
 * Plain Zod schemas for every content collection (docs/CONTENT_AUTHORING.md §2, §5–§9).
 *
 * Shared by `src/content.config.ts` (Astro content layer) and
 * `src/lib/content/validate.ts` (the `pnpm validate:content` checks), so the
 * build and the validator can never disagree about a field.
 *
 * Cross-collection references are plain strings here. They are resolved by the
 * validator, not by Astro's `reference()`, so that one tool owns every id check
 * and reports them with file paths.
 */
import { z } from 'zod';

import { EDGE_TYPES, FIELDS, NODE_TYPES } from './vocab';

/** Closed vocabularies live in ./vocab.ts (Zod-free); re-exported for existing importers. */
export { EDGE_TYPES, FIELDS, NODE_TYPES } from './vocab';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** kebab-case: lowercase letters and digits, single hyphens between groups (STYLE_GUIDE §3). */
export const KEBAB_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const kebabId = z.string().regex(KEBAB_RE, 'must be kebab-case (a-z, 0-9, single hyphens)');

/** ISO calendar date `YYYY-MM-DD`; the value must also be a real date. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be an ISO date (YYYY-MM-DD)')
  .refine((s) => !Number.isNaN(Date.parse(`${s}T00:00:00Z`)), 'must be a real calendar date');

/**
 * Frontmatter dates: Astro's YAML parser turns an unquoted `2026-10-19` into a
 * Date while the validator's parser keeps the string, so accept both and
 * normalize to `YYYY-MM-DD`.
 */
export const frontmatterDate = z.union([
  isoDate,
  z.date().transform((d) => d.toISOString().slice(0, 10)),
]);

export const fieldEnum = z.enum(FIELDS);
export type Field = z.infer<typeof fieldEnum>;

export const LESSON_STATUSES = ['draft', 'review', 'published'] as const;
export const lessonStatusEnum = z.enum(LESSON_STATUSES);
export type LessonStatus = z.infer<typeof lessonStatusEnum>;

// ---------------------------------------------------------------------------
// Units (src/content/units.yaml)
// ---------------------------------------------------------------------------

export const unitSchema = z.object({
  id: kebabId,
  title: z.string().min(1),
  order: z.number().int().nonnegative(),
  summary: z.string().min(1),
  /** Lecture range as written on the course overview, e.g. "L8 pp.19–43; L9 pp.1–40". */
  lectures: z.string().min(1),
  /** Optional one-line narrative arc of the unit. */
  arc: z.string().optional(),
});
export type Unit = z.infer<typeof unitSchema>;

// ---------------------------------------------------------------------------
// Lessons (src/content/units/<unit>/<nn>-<slug>.mdx) — frontmatter (§2)
// ---------------------------------------------------------------------------

export const lectureRefSchema = z.object({
  lecture: z.number().int().positive(),
  /** PDF page numbers, e.g. "20-40" or "3-5, 12". */
  pages: z.string().min(1),
});

export const companionSchema = z.object({
  /** Path under `AML Course Material/`. */
  notebook: z.string().min(1),
  /** Cell range, e.g. "9-14" or "all". */
  cells: z.string().min(1),
});

export const lessonSchema = z.object({
  title: z.string().min(1),
  unit: kebabId,
  order: z.number().int().positive(),
  slug: kebabId,
  summary: z.string().min(1).max(240),
  lectures: z.array(lectureRefSchema).default([]),
  /** Graph node ids this lesson teaches. */
  concepts: z.array(kebabId).default([]),
  /** Node or glossary ids this lesson requires. */
  prerequisites: z.array(kebabId).default([]),
  homework: z.array(kebabId).default([]),
  cases: z.array(kebabId).default([]),
  companions: z.array(companionSchema).optional(),
  estimatedMinutes: z.number().int().positive(),
  status: lessonStatusEnum.default('draft'),
  authors: z.array(z.string().min(1)).default([]),
});
export type Lesson = z.infer<typeof lessonSchema>;

/** Canonical lesson id: `<unit>/<slug>`. */
export function lessonId(lesson: Pick<Lesson, 'unit' | 'slug'>): string {
  return `${lesson.unit}/${lesson.slug}`;
}

// ---------------------------------------------------------------------------
// Glossary (src/content/glossary/<id>.mdx) — frontmatter (§5)
// ---------------------------------------------------------------------------

export const glossarySchema = z.object({
  id: kebabId,
  term: z.string().min(1),
  aliases: z.array(z.string().min(1)).default([]),
  field: fieldEnum,
  /** Unit id where the term is first needed. */
  firstUsedIn: kebabId.optional(),
  related: z.array(kebabId).default([]),
});
export type GlossaryTerm = z.infer<typeof glossarySchema>;

// ---------------------------------------------------------------------------
// Concept graph (src/content/graph/nodes.yaml, edges.yaml) (§6)
// ---------------------------------------------------------------------------

export const nodeTypeEnum = z.enum(NODE_TYPES);

export const graphNodeSchema = z.object({
  id: kebabId,
  label: z.string().min(1),
  type: nodeTypeEnum,
  field: fieldEnum,
  unit: kebabId,
  /** Lesson slug that teaches this node (click-through target). */
  lesson: kebabId.optional(),
  summary: z.string().optional(),
  /** Derivation id (`der-…`) that establishes this node. */
  derivation: kebabId.optional(),
});
export type GraphNode = z.infer<typeof graphNodeSchema>;

export const edgeTypeEnum = z.enum(EDGE_TYPES);

export const graphEdgeSchema = z.object({
  from: kebabId,
  to: kebabId,
  type: edgeTypeEnum,
});
export type GraphEdge = z.infer<typeof graphEdgeSchema>;

/** Entry id used by the `graphEdges` collection. */
export function graphEdgeId(edge: GraphEdge): string {
  return `${edge.from}--${edge.type}--${edge.to}`;
}

// ---------------------------------------------------------------------------
// Quiz bank (src/content/quizzes/<unit>.yaml: a list of items) (§7)
// ---------------------------------------------------------------------------

export const QUIZ_TYPES = [
  'mc',
  'numeric',
  'which-step',
  'match',
  'order',
  'predict',
  'estimate',
  'code-trace',
] as const;
export const quizTypeEnum = z.enum(QUIZ_TYPES);
export type QuizType = z.infer<typeof quizTypeEnum>;

const quizCommon = {
  id: kebabId,
  /** Lesson slug, or `<unit>/<slug>` when the slug is not unique. */
  lesson: z.string().min(1),
  /** Node or glossary ids the item exercises. */
  concepts: z.array(kebabId).default([]),
  /** 1 easy · 2 core · 3 stretch */
  difficulty: z.number().int().min(1).max(3).default(2),
  /** "L9 p.27 poll" or "original". */
  source: z.string().min(1).default('original'),
  explanation: z.string().optional(),
  /** Confusable ids this item separates, e.g. [ridge, lasso]. */
  discriminates: z.array(kebabId).optional(),
  /**
   * Set by the loader / validator from the file name
   * (`src/content/quizzes/<unit>.yaml`), never written by hand.
   */
  unit: kebabId.optional(),
};

export const mcOptionSchema = z.object({
  text: z.string().min(1),
  correct: z.boolean().default(false),
  /** Misconception id tagging a distractor (optional: true/false items have none). */
  misconception: kebabId.optional(),
  explanation: z.string().optional(),
});
export type McOption = z.infer<typeof mcOptionSchema>;

export const mcItemSchema = z
  .object({
    ...quizCommon,
    type: z.literal('mc'),
    prompt: z.string().min(1),
    options: z.array(mcOptionSchema).min(2),
  })
  .superRefine((item, ctx) => {
    const correct = item.options.filter((o) => o.correct).length;
    if (correct !== 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['options'],
        message: `an mc item needs exactly one correct option (found ${correct})`,
      });
    }
  });

export const numericItemSchema = z
  .object({
    ...quizCommon,
    type: z.literal('numeric'),
    prompt: z.string().min(1),
    answer: z.number(),
    tolerance: z.number().nonnegative().default(0),
    /** Parameter name → candidate values, resampled per attempt. */
    seeded: z.record(z.string(), z.array(z.number()).min(1)).optional(),
    /** Expression in the seeded parameters that yields `answer`. */
    formula: z.string().min(1).optional(),
  })
  .superRefine((item, ctx) => {
    if (item.seeded && !item.formula) {
      ctx.addIssue({
        code: 'custom',
        path: ['formula'],
        message: 'a seeded numeric item needs a formula',
      });
    }
  });

export const whichStepItemSchema = z.object({
  ...quizCommon,
  type: z.literal('which-step'),
  prompt: z.string().optional(),
  /** Derivation id (`der-…`) found in a lesson. */
  derivation: kebabId,
  corrupt: z.object({
    /** 1-based step index within the derivation. */
    step: z.number().int().positive(),
    replaceTex: z.string().min(1),
    explanation: z.string().min(1),
  }),
});

/** Item types whose extra fields are not yet pinned down by the contract. */
const openItem = (type: Exclude<QuizType, 'mc' | 'numeric' | 'which-step'>) =>
  z.looseObject({
    ...quizCommon,
    type: z.literal(type),
    prompt: z.string().min(1),
  });

export const quizItemSchema = z.discriminatedUnion('type', [
  mcItemSchema,
  numericItemSchema,
  whichStepItemSchema,
  openItem('match'),
  openItem('order'),
  openItem('predict'),
  openItem('estimate'),
  openItem('code-trace'),
]);
export type QuizItem = z.infer<typeof quizItemSchema>;
export type McItem = z.infer<typeof mcItemSchema>;
export type NumericItem = z.infer<typeof numericItemSchema>;
export type WhichStepItem = z.infer<typeof whichStepItemSchema>;

/** A quiz file is a list of items. */
export const quizFileSchema = z.array(quizItemSchema);

// ---------------------------------------------------------------------------
// Flashcards (src/content/flashcards/<unit>.yaml: a list of cards) (§8)
// ---------------------------------------------------------------------------

export const FLASHCARD_TYPES = ['cloze', 'statement-formula', 'formula-when'] as const;
export const flashcardTypeEnum = z.enum(FLASHCARD_TYPES);

export const flashcardSchema = z.object({
  id: kebabId,
  lesson: z.string().min(1),
  concept: kebabId,
  type: flashcardTypeEnum,
  front: z.string().min(1),
  back: z.string().min(1),
  /** `der-6-3-3#2`: derivation id and 1-based step. */
  derivationStep: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*#\d+$/, 'must look like der-6-3-3#2')
    .optional(),
  /** Set by the loader / validator from the file name, never written by hand. */
  unit: kebabId.optional(),
});
export type Flashcard = z.infer<typeof flashcardSchema>;

export const flashcardFileSchema = z.array(flashcardSchema);

// ---------------------------------------------------------------------------
// Clinical cases (src/content/cases/<id>.mdx) — frontmatter (§9)
// ---------------------------------------------------------------------------

export const caseVariableSchema = z.union([
  z.string().min(1),
  z.object({
    name: z.string().min(1),
    symbol: z.string().optional(),
    description: z.string().optional(),
  }),
]);

export const caseSchema = z.object({
  id: kebabId,
  title: z.string().min(1),
  tagline: z.string().min(1),
  variables: z.array(caseVariableSchema).default([]),
  generativeModel: z.object({
    tex: z.string().min(1),
    parameters: z.record(z.string(), z.unknown()).default({}),
  }),
  seed: z.number().int(),
  /** Lesson ids (`<unit>/<slug>`) or slugs that use this case. */
  usedIn: z.array(z.string().min(1)).default([]),
});
export type Case = z.infer<typeof caseSchema>;

// ---------------------------------------------------------------------------
// Homework bridges (src/content/homework/<id>.mdx) — frontmatter (§9)
// ---------------------------------------------------------------------------

export const homeworkSchema = z.object({
  id: kebabId,
  title: z.string().min(1),
  due: frontmatterDate,
  live: z.boolean(),
  units: z.array(kebabId).default([]),
});
export type Homework = z.infer<typeof homeworkSchema>;
