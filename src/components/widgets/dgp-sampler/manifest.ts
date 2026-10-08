/**
 * Manifest for `dgp-sampler` (VISION.md §9.3; lesson 2.1). Imported at build
 * time by `manifests.ts` (no React here) so `Widget.astro` can validate
 * `<Widget name="dgp-sampler" …>` props. The prop names match what lesson 2.1
 * passes (`alpha`, `beta`, `sigmaX`, `sigmaEps`, `n`, `showConditionalMean`).
 *
 * Homework safety (VISION.md R17): the defaults are the lesson's authored
 * values, not any homework's parameters.
 */
import { z } from 'zod';

import type { WidgetManifest } from '../types';
import { renderFallback } from './fallback';

/** Upper end of the n slider; the R² curve continues to `N_MAX` (math.ts). */
export const N_SLIDER_MAX = 1000;

export const params = z.strictObject({
  /** Intercept α of the true line E[Y | X = x] = α + βx. */
  alpha: z.number().min(-3).max(3).default(0),
  /** Slope β of the true line. */
  beta: z.number().min(-2).max(2).default(1),
  /** Standard deviation of X ~ N(0, σ_X²). */
  sigmaX: z.number().min(0.2).max(2).default(1),
  /** Noise standard deviation σ_ε; ε ~ N(0, σ_ε²) independent of X. */
  sigmaEps: z.number().min(0).max(3).default(1),
  /** Sample size: the scatter and the OLS fit use the first n draws. */
  n: z.int().min(3).max(N_SLIDER_MAX).default(20),
  /** Draw the true conditional mean line E[Y | X = x] = α + βx. */
  showConditionalMean: z.boolean().default(true),
  /** Seed for the sampler; "Draw again" increments it. */
  seed: z.int().default(1),
  /** What the small plot tracks against n: the sample R² or the training MSE. */
  curve: z.enum(['r2', 'mse']).default('r2'),
});

export type Params = z.output<typeof params>;

export const manifest = {
  name: 'dgp-sampler',
  title: 'Sampling from a linear data-generating distribution',
  challenge:
    'Draw again a few times at n = 20 and watch the OLS line move while the true line stays put. Then raise n: what does the sample R² settle near, and how does that number change with the slope, the spread of X, and the noise level?',
  usedIn: ['2.1'],
  height: 660,
  params,
  fallback: renderFallback,
} satisfies WidgetManifest<typeof params>;
