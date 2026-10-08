/**
 * Manifest for `line-fit-playground` (VISION.md §9.3; lesson 1.3). Imported
 * at build time by `manifests.ts` (no React here) so `Widget.astro` can
 * validate `<Widget name="line-fit-playground" …>` props.
 */
import { z } from 'zod';

import type { WidgetManifest } from '../types';
import { DATASETS } from './data';
import { renderFallback } from './fallback';

/** Slider ranges; the least-squares and least-absolute-deviation fits lie inside them. */
export const THETA0_RANGE = { min: -1500, max: 600, step: 1 } as const;
export const THETA1_RANGE = { min: -20, max: 80, step: 0.1 } as const;

export const params = z.strictObject({
  /** The 20 patients of the Lecture 2 companion (x = 30·bmi + 25, y = disease progression). */
  dataset: z.enum(DATASETS).default('diabetes-bmi-20'),
  /** Intercept θ₀ of f_θ(x) = θ₀ + θ₁x. */
  theta0: z.number().min(THETA0_RANGE.min).max(THETA0_RANGE.max).default(-500),
  /** Slope θ₁. */
  theta1: z.number().min(THETA1_RANGE.min).max(THETA1_RANGE.max).default(25),
  /** Draw each residual as a vertical segment from the point to the line. */
  showResiduals: z.boolean().default(true),
  /** Draw each squared residual as a square on its segment (area ∝ r²). */
  showSquares: z.boolean().default(false),
  /** The loss in the headline readout; 'mae' also offers the least-absolute-deviations fit. */
  loss: z.enum(['mse', 'mae']).default('mse'),
});

export type Params = z.output<typeof params>;

export const manifest = {
  name: 'line-fit-playground',
  title: 'Fitting a line to 20 patients',
  challenge:
    'Move θ₀ and θ₁ to make the MSE as small as you can, then snap to OLS. How close did you get, and what happened to R² on the way?',
  usedIn: ['1.3'],
  height: 520,
  params,
  fallback: renderFallback,
} satisfies WidgetManifest<typeof params>;
