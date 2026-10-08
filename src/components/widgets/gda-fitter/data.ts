/**
 * The ADVERSE projection for `gda-fitter`: two continuous columns of the
 * generated cohort (`src/data/adverse.json`), standardized with the full
 * cohort's mean and standard deviation, labeled by the hyperkalemia event
 * `y`, and subsampled without replacement with a seed.
 *
 * The JSON is imported directly rather than through
 * `src/lib/datasets/index.ts`, which statically imports all three case
 * datasets (notes.json alone is ~1 MB): this keeps the widget's chunk to the
 * one file it needs. The envelope is the same `AdverseDataset` type.
 */
import adverseJson from '@/data/adverse.json';
import type { AdverseDataset, AdverseRow } from '@/lib/datasets/adverse';
import { createRng } from '@/lib/datasets/random';

import type { LabeledPoint } from './math';

export const ADVERSE_FEATURES = ['age', 'egfr', 'potassium'] as const;
export type AdverseFeature = (typeof ADVERSE_FEATURES)[number];

export const FEATURE_LABELS: Record<AdverseFeature, string> = {
  age: 'age (years)',
  egfr: 'eGFR (mL/min/1.73 m²)',
  potassium: 'potassium (mmol/L)',
};

const dataset = adverseJson as unknown as AdverseDataset;

export function adverseRows(): readonly AdverseRow[] {
  return dataset.rows;
}

export interface FeatureStats {
  mean: number;
  sd: number;
}

const statsCache = new Map<AdverseFeature, FeatureStats>();

/** Cohort mean and standard deviation of a feature (cached; the cohort is fixed). */
export function featureStats(feature: AdverseFeature): FeatureStats {
  const hit = statsCache.get(feature);
  if (hit) return hit;
  const rows = dataset.rows;
  let sum = 0;
  for (const r of rows) sum += r[feature];
  const mean = sum / rows.length;
  let ss = 0;
  for (const r of rows) ss += (r[feature] - mean) ** 2;
  const stats = { mean, sd: Math.sqrt(ss / rows.length) || 1 };
  statsCache.set(feature, stats);
  return stats;
}

/**
 * `n` distinct patients in a seeded order (partial Fisher–Yates, the same
 * scheme as `sampleRows` in `src/lib/datasets`), as standardized 2-D points
 * labeled by `y`. `id` is the patient's row index, so edits address a fixed
 * patient.
 */
export function adverseProjection(
  features: readonly [AdverseFeature, AdverseFeature],
  n: number,
  seed: number,
): LabeledPoint[] {
  const rows = dataset.rows;
  const take = Math.max(0, Math.min(Math.trunc(n), rows.length));
  const rng = createRng(seed);
  const order = Array.from({ length: rows.length }, (_, i) => i);
  const [fx, fy] = features;
  const sx = featureStats(fx);
  const sy = featureStats(fy);
  const out: LabeledPoint[] = [];
  for (let i = 0; i < take; i += 1) {
    const j = i + rng.int(0, rows.length - i);
    const oi = order[i] as number;
    const oj = order[j] as number;
    order[i] = oj;
    order[j] = oi;
    const row = rows[oj] as AdverseRow;
    out.push({
      id: oj,
      x: [(row[fx] - sx.mean) / sx.sd, (row[fy] - sy.mean) / sy.sd],
      y: row.y,
    });
  }
  return out;
}
