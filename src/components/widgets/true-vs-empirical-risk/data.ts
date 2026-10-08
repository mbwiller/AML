/**
 * The generated VASCO trial's arms for `true-vs-empirical-risk`: each arm's
 * 50 outcomes (and ids) in id order. Reuses `linear-bias-probe/data.ts`, which
 * imports `vasco.json` directly so neither chunk carries the other cases.
 */
import type { VascoArm } from '@/lib/datasets/vasco';

import { vascoRows } from '../linear-bias-probe/data';

export interface TrialArm {
  ids: string[];
  ys: number[];
}

const cache = new Map<VascoArm, TrialArm>();

export function trialArm(arm: VascoArm): TrialArm {
  const hit = cache.get(arm);
  if (hit) return hit;
  const rows = vascoRows().filter((r) => r.arm === arm);
  const value = { ids: rows.map((r) => r.id), ys: rows.map((r) => r.delta_sbp) };
  cache.set(arm, value);
  return value;
}
