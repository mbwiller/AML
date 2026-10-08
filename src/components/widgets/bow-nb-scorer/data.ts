/**
 * NOTES access for `bow-nb-scorer`: the seeded training subsample, the
 * cached Bernoulli NB counts and models, and the seeded default report.
 * Shared by `fallback.ts` (build time, Node) and `Widget.tsx` (browser).
 *
 * The 6,000 reports are regenerated on first use with the case's own seeded
 * generator (about 10 ms) instead of importing `src/data/notes.json`, which
 * would put ~300 KB gzipped into the widget chunk (STYLE_GUIDE §7 budget is
 * 150 KB). `check:datasets` guarantees the generator and the JSON agree.
 */
import { generate, noteText, spec, type NotesRow } from '@/lib/datasets/notes';
import { VOCABULARY, VOCABULARY_SIZE, WORD_INDEX } from '@/lib/datasets/notes-vocabulary';
import { sampleRows } from '@/lib/datasets/sample';

import { countBernoulliNB, modelFromCounts, type BernoulliNB, type NBCounts } from './math';

export { VOCABULARY, VOCABULARY_SIZE, WORD_INDEX, noteText };

/** Class names in index order: `CLASSES[y]`. */
export const CLASSES = ['non-serious', 'serious'] as const;

let generated: ReturnType<typeof generate> | undefined;

/** The NOTES dataset, generated once on first use. */
function notes(): ReturnType<typeof generate> {
  generated ??= generate();
  return generated;
}

/** Number of reports in NOTES (6,000). */
export const NOTES_SIZE: number = spec.n;

/** The generative Bernoulli presence probabilities and priors, for the tests and README. */
export function generativeParameters(): { phi: number[]; psi: number[][] } {
  const p = notes().generativeModel.parameters as { phi: number[]; psi: number[][] };
  return { phi: p.phi, psi: p.psi };
}

/** All rows, for the full-data fit in the tests. */
export function allRows(): readonly NotesRow[] {
  return notes().rows;
}

/** Small LRU so flicking a slider back and forth does not refit. */
class Lru<V> {
  private readonly map = new Map<string, V>();

  constructor(private readonly limit: number) {}

  get(key: string, make: () => V): V {
    const hit = this.map.get(key);
    if (hit !== undefined) {
      this.map.delete(key);
      this.map.set(key, hit);
      return hit;
    }
    const value = make();
    this.map.set(key, value);
    if (this.map.size > this.limit) {
      const oldest = this.map.keys().next().value;
      if (oldest !== undefined) this.map.delete(oldest);
    }
    return value;
  }
}

const orders = new Lru<NotesRow[]>(4);
const counts = new Lru<NBCounts>(8);
const models = new Lru<BernoulliNB>(16);

/** The full seeded permutation of NOTES for a seed (partial Fisher–Yates prefixes agree). */
function seededOrder(seed: number): NotesRow[] {
  return orders.get(String(seed), () => sampleRows(notes(), NOTES_SIZE, seed));
}

/** The first `trainSize` rows of the seeded order: the training subsample. */
export function trainingRows(trainSize: number, seed: number): readonly NotesRow[] {
  return seededOrder(seed).slice(0, Math.max(0, Math.min(trainSize, NOTES_SIZE)));
}

export function countsFor(trainSize: number, seed: number): NBCounts {
  return counts.get(`${trainSize}:${seed}`, () =>
    countBernoulliNB(trainingRows(trainSize, seed), VOCABULARY_SIZE),
  );
}

export function modelFor(trainSize: number, seed: number, smoothing: boolean): BernoulliNB {
  return models.get(`${trainSize}:${seed}:${smoothing ? 1 : 0}`, () =>
    modelFromCounts(countsFor(trainSize, seed), smoothing),
  );
}

/**
 * The `report`-th default report for a seed, taken from the *end* of the
 * seeded order so it is outside the training subsample unless the subsample
 * is the whole dataset.
 */
export function reportRow(seed: number, report: number): NotesRow {
  const order = seededOrder(seed);
  const i = NOTES_SIZE - 1 - (((report % NOTES_SIZE) + NOTES_SIZE) % NOTES_SIZE);
  const row = order[i];
  if (!row) throw new Error(`bow-nb-scorer: no report at index ${i}`);
  return row;
}
