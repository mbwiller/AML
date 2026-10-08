/**
 * Manifest for `mse-bowl-gd` (VISION.md §9.3; lessons 1.4 and 2.4). Imported
 * at build time by `manifests.ts` (no React here) so `Widget.astro` can
 * validate `<Widget name="mse-bowl-gd" …>` props. The prop names and values
 * match lesson 2.4's embed exactly: `dataset="diabetes-bmi-20"`, `eta={0.1}`,
 * `init={[2, 1]}`, `standardize={false}`, `stopping="parameter-change"`,
 * `tolerance={0.00001}`, `showResiduals={true}`.
 */
import { z } from 'zod';

import type { WidgetManifest } from '../types';
import { DATASETS } from '../line-fit-playground/data';
import { renderFallback } from './fallback';
import { STOPPING_RULES } from './math';

/** Slider ranges for the controls; the schema accepts a little more for authored values. */
export const ETA_RANGE = { min: 0.01, max: 1.2, step: 0.01 } as const;
export const LOG_TOLERANCE_RANGE = { min: -10, max: -1, step: 0.5 } as const;
export const INIT_RANGE = {
  x: { min: -5, max: 10, step: 0.1 },
  one: { min: -2, max: 3, step: 0.05 },
} as const;

export const params = z.strictObject({
  /** The Lecture 4 companion's 20 patients: x = scaled bmi, y = progression / 300, plus a ones column. */
  dataset: z.enum(DATASETS).default('diabetes-bmi-20'),
  /** Learning rate η (fixed step size). */
  eta: z.number().positive().max(2).default(0.1),
  /** θ⁽⁰⁾ = (θ_bmi, θ_one), in the coordinates being optimized (z-scored when `standardize`). */
  init: z.tuple([z.number().min(-20).max(20), z.number().min(-20).max(20)]).default([2, 1]),
  /** Replace bmi by its z-score (mean 0, sd 1 with 1/n); the bowl becomes round (κ = 1). */
  standardize: z.boolean().default(false),
  /** Which convergence criterion of def-2-4-4 ends the loop. */
  stopping: z.enum(STOPPING_RULES).default('parameter-change'),
  /** Its tolerance ε. */
  tolerance: z.number().positive().max(1).default(0.00001),
  /** Iteration cap, so a run that never meets the test still ends. */
  maxIterations: z.int().min(10).max(200_000).default(50_000),
  /** Show the data with the current line θ⁽ᵗ⁾ and its residuals beside the bowl. */
  showResiduals: z.boolean().default(true),
});

export type Params = z.output<typeof params>;

export const manifest = {
  name: 'mse-bowl-gd',
  title: 'Gradient descent on the least-squares bowl',
  challenge:
    'Press Play and watch where the path ends compared with the least-squares point. Then turn on standardization: how many iterations does the same rule need now?',
  usedIn: ['1.4', '2.4'],
  height: 840,
  params,
  fallback: renderFallback,
} satisfies WidgetManifest<typeof params>;
