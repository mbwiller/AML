/**
 * Export and import of all progress as one JSON file (VISION.md §9.11): the
 * zero-backend way to move between laptop and phone. Loaded lazily by the
 * practice island (it carries Zod), so it costs nothing until used.
 *
 * Format (version 1):
 *
 * ```json
 * {
 *   "format": "aml-atlas-progress",
 *   "version": 1,
 *   "exportedAt": "2026-10-07T19:30:00.000Z",
 *   "practice": { "cards": […], "reviews": […], "attempts": […], "meta": […] },
 *   "local": { "aml-last-lesson": "{…}", "aml-derivation:der-6-3-2": "5" }
 * }
 * ```
 *
 * `practice` holds the store's four tables (src/lib/practice/store.ts);
 * `local` holds the raw localStorage strings the lesson pages own
 * (`aml-last-lesson`, every `aml-derivation:<id>`).
 *
 * Import validates with Zod and **merges** into what is there:
 * cards by latest review (`lastReview`, then `reps`, then `updatedAt`),
 * reviews and attempts as a union by id, meta by `updatedAt`,
 * `aml-last-lesson` by its `at`, and each `aml-derivation:*` by the larger
 * revealed count. Importing the same file twice changes nothing.
 */
import { z } from 'zod';

import { LAST_LESSON_KEY, parseLastLesson } from '@/lib/progress';

import { type ProgressData, type ProgressStore, type StoredCard } from './store';

export const EXPORT_FORMAT = 'aml-atlas-progress';
export const EXPORT_VERSION = 1;
const DERIVATION_PREFIX = 'aml-derivation:';

const phase = z.enum(['new', 'learning', 'review', 'relearning']);
const rating = z.enum(['again', 'hard', 'good', 'easy']);
const ms = z.number();

const cardSchema = z.object({
  id: z.string().min(1),
  phase,
  due: ms,
  stability: z.number().nonnegative(),
  difficulty: z.number(),
  scheduledDays: z.number().nonnegative(),
  learningSteps: z.number().int().nonnegative(),
  reps: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
  lastReview: ms.optional(),
  updatedAt: ms,
});

const reviewSchema = z.object({
  id: z.string().min(1),
  cardId: z.string().min(1),
  rating,
  at: ms,
  phase,
  elapsedMs: ms.nullable(),
  scheduledDays: z.number().nonnegative(),
});

const attemptSchema = z.object({
  id: z.string().min(1),
  itemId: z.string().min(1),
  unit: z.string(),
  concepts: z.array(z.string()),
  correct: z.boolean(),
  at: ms,
  misconception: z.string().optional(),
  quizSeed: z.number().optional(),
});

const metaSchema = z.object({ key: z.string().min(1), value: z.unknown(), updatedAt: ms });

export const exportSchema = z.object({
  format: z.literal(EXPORT_FORMAT),
  version: z.literal(EXPORT_VERSION),
  exportedAt: z.string(),
  practice: z.object({
    cards: z.array(cardSchema),
    reviews: z.array(reviewSchema),
    attempts: z.array(attemptSchema),
    meta: z.array(metaSchema),
  }),
  local: z.record(z.string(), z.string()).default({}),
});
export type ProgressExport = z.infer<typeof exportSchema>;

/** The localStorage keys an export carries. */
export function isTransferKey(key: string): boolean {
  return key === LAST_LESSON_KEY || key.startsWith(DERIVATION_PREFIX);
}

/** Every transfer key currently in `storage`. */
export function readLocalKeys(storage: Storage): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key === null || !isTransferKey(key)) continue;
    const value = storage.getItem(key);
    if (value !== null) out[key] = value;
  }
  return out;
}

export function buildExport(
  practice: ProgressData,
  local: Record<string, string>,
  now: number,
): ProgressExport {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date(now).toISOString(),
    practice,
    local: Object.fromEntries(Object.entries(local).filter(([k]) => isTransferKey(k))),
  };
}

export type ParseResult = { ok: true; value: ProgressExport } | { ok: false; error: string };

export function parseExport(json: string): ParseResult {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: 'The file is not JSON.' };
  }
  const parsed = exportSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.length ? ` at ${issue.path.join('.')}` : '';
    return {
      ok: false,
      error: `This is not an AML Atlas progress file (version ${EXPORT_VERSION})${where}: ${issue?.message ?? 'invalid'}.`,
    };
  }
  return { ok: true, value: parsed.data };
}

// ---------------------------------------------------------------------------
// Merge
// ---------------------------------------------------------------------------

/** True when `a` reflects a later review than `b`. */
function newerCard(a: StoredCard, b: StoredCard): boolean {
  return (
    ((a.lastReview ?? 0) - (b.lastReview ?? 0) || a.reps - b.reps || a.updatedAt - b.updatedAt) > 0
  );
}

function unionBy<T>(a: readonly T[], b: readonly T[], keyOf: (t: T) => string): T[] {
  const map = new Map<string, T>();
  for (const x of a) map.set(keyOf(x), x);
  for (const x of b) if (!map.has(keyOf(x))) map.set(keyOf(x), x);
  return [...map.values()];
}

export function mergeProgress(current: ProgressData, incoming: ProgressData): ProgressData {
  const cards = new Map(current.cards.map((c) => [c.id, c]));
  for (const c of incoming.cards) {
    const have = cards.get(c.id);
    if (!have || newerCard(c, have)) cards.set(c.id, c);
  }
  const meta = new Map(current.meta.map((m) => [m.key, m]));
  for (const m of incoming.meta) {
    const have = meta.get(m.key);
    if (!have || m.updatedAt > have.updatedAt) meta.set(m.key, m);
  }
  return {
    cards: [...cards.values()],
    reviews: unionBy(current.reviews, incoming.reviews, (r) => r.id).sort((a, b) => a.at - b.at),
    attempts: unionBy(current.attempts, incoming.attempts, (a) => a.id).sort((a, b) => a.at - b.at),
    meta: [...meta.values()],
  };
}

/** Merged values for the localStorage transfer keys (only keys whose value changes). */
export function mergeLocal(
  current: Record<string, string>,
  incoming: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (!isTransferKey(key)) continue;
    const have = current[key];
    if (have === undefined) {
      out[key] = value;
    } else if (key === LAST_LESSON_KEY) {
      const a = parseLastLesson(have);
      const b = parseLastLesson(value);
      if (b && (!a || b.at > a.at)) out[key] = value;
    } else {
      const a = Number(have);
      const b = Number(value);
      if (Number.isFinite(b) && (!Number.isFinite(a) || b > a)) out[key] = value;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Store-level operations
// ---------------------------------------------------------------------------

export async function exportProgress(
  store: ProgressStore,
  storage: Storage | null,
  now: number = Date.now(),
): Promise<string> {
  const data = await store.load();
  const local = storage ? readLocalKeys(storage) : {};
  return JSON.stringify(buildExport(data, local, now), null, 2);
}

export interface ImportSummary {
  cards: number;
  reviews: number;
  attempts: number;
  localKeys: number;
}

export async function importProgress(
  store: ProgressStore,
  storage: Storage | null,
  json: string,
): Promise<{ ok: true; summary: ImportSummary } | { ok: false; error: string }> {
  const parsed = parseExport(json);
  if (!parsed.ok) return parsed;
  const incoming = parsed.value;
  const merged = mergeProgress(await store.load(), incoming.practice);
  await store.replace(merged);
  let localKeys = 0;
  if (storage) {
    const current = readLocalKeys(storage);
    for (const [key, value] of Object.entries(mergeLocal(current, incoming.local))) {
      try {
        storage.setItem(key, value);
        localKeys++;
      } catch {
        /* storage full or blocked: the practice data is still imported */
      }
    }
  }
  return {
    ok: true,
    summary: {
      cards: incoming.practice.cards.length,
      reviews: incoming.practice.reviews.length,
      attempts: incoming.practice.attempts.length,
      localKeys,
    },
  };
}
