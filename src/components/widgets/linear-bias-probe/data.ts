/**
 * VASCO access for `linear-bias-probe` (and `true-vs-empirical-risk`): the
 * 300 generated trial patients as (dose, baseline, ΔSBP).
 *
 * `vasco.json` is imported directly rather than through
 * `src/lib/datasets/index.ts`, which statically imports every case dataset
 * (notes.json alone is ~1 MB): the widget chunk carries only this file.
 */
import vascoJson from '@/data/vasco.json';
import type { VascoDataset, VascoRow } from '@/lib/datasets/vasco';

import type { Patient } from './math';

const dataset = vascoJson as unknown as VascoDataset;

export function vascoRows(): readonly VascoRow[] {
  return dataset.rows;
}

let patients: Patient[] | null = null;

/** Every trial patient as (dose, baseline, y = delta_sbp), in id order. */
export function vascoPatients(): readonly Patient[] {
  patients ??= dataset.rows.map((r) => ({
    dose: r.dose,
    baseline: r.baseline_sbp,
    y: r.delta_sbp,
  }));
  return patients;
}
