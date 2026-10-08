/**
 * Seeded row sampling, kept free of any JSON import so browser code (widgets)
 * can use it without pulling every dataset into its chunk. Re-exported from
 * `index.ts`.
 */
import { createRng } from './random';
import type { Dataset } from './types';

/**
 * `k` distinct rows chosen uniformly without replacement, in a seeded order
 * (partial Fisher–Yates), so a lesson's sample is the same on every build.
 */
export function sampleRows<Row>(dataset: Dataset<Row>, k: number, seed: number): Row[] {
  const n = dataset.rows.length;
  const take = Math.max(0, Math.min(Math.trunc(k), n));
  const rng = createRng(seed);
  const order = Array.from({ length: n }, (_, i) => i);
  const out: Row[] = [];
  for (let i = 0; i < take; i++) {
    const j = i + rng.int(0, n - i);
    const oi = order[i] as number;
    const oj = order[j] as number;
    order[i] = oj;
    order[j] = oi;
    out.push(dataset.rows[oj] as Row);
  }
  return out;
}
