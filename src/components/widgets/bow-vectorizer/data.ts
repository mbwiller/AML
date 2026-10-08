/**
 * NOTES access for `bow-vectorizer`: the seeded training reports the
 * vocabulary is fitted on and the held-out report that fills the textbox.
 *
 * The 6,000 reports are not imported from `src/data/notes.json` (about
 * 320 KB gzipped, which would put this widget far over its budget). They are
 * regenerated on first use with the case's own generator,
 * `generate()` from `src/lib/datasets/notes.ts` (about 10 ms), which is
 * exactly what `pnpm gen:datasets` wrote to the JSON and what
 * `pnpm check:datasets` verifies; `math.test.ts` checks the rows agree with
 * the committed file. Text comes from the dataset's `noteText`, the same
 * rendering bow-nb-scorer and the case page use.
 */
import { generate, noteText, type NotesRow } from '@/lib/datasets/notes';
import { createRng } from '@/lib/datasets/random';

export { noteText };

/** Class names in index order: `CLASSES[y]`. */
export const CLASSES = ['non-serious', 'serious'] as const;

let rows: readonly NotesRow[] | null = null;

/** All NOTES rows, generated once. */
export function notesRows(): readonly NotesRow[] {
  rows ??= generate().rows;
  return rows;
}

const orders = new Map<number, number[]>();

/** A seeded permutation of the row indices (Fisher–Yates with the datasets' RNG). */
function seededOrder(seed: number): number[] {
  const hit = orders.get(seed);
  if (hit) return hit;
  const n = notesRows().length;
  const rng = createRng(seed);
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = 0; i < n - 1; i += 1) {
    const j = i + rng.int(0, n - i);
    const oi = order[i] as number;
    order[i] = order[j] as number;
    order[j] = oi;
  }
  if (orders.size > 4) orders.clear();
  orders.set(seed, order);
  return order;
}

/** The first `size` reports of the seeded order: the documents `fit` sees. */
export function trainingRows(size: number, seed: number): NotesRow[] {
  const all = notesRows();
  return seededOrder(seed)
    .slice(0, size)
    .map((i) => all[i] as NotesRow);
}

/** The `report`-th report from the end of the seeded order (never in a training set of ≤ 5,000). */
export function heldOutRow(seed: number, report: number): NotesRow {
  const all = notesRows();
  const order = seededOrder(seed);
  const k = ((report % order.length) + order.length) % order.length;
  return all[order[order.length - 1 - k] as number] as NotesRow;
}
