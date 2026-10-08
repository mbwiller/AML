/**
 * Manifest for `gda-fitter` (VISION.md §9.3; lessons 7.2 and 7.3). Imported
 * at build time by `manifests.ts` (no React here) so `Widget.astro` can
 * validate `<Widget name="gda-fitter" …>` props. The prop names match what
 * the lessons pass (`dataset`, `features`, `sharedCovariance`,
 * `showLogisticRegression`).
 */
import { z } from 'zod';

import type { WidgetManifest } from '../types';
import { ADVERSE_FEATURES } from './data';
import { renderFallback } from './fallback';

const feature = z.enum(ADVERSE_FEATURES);

export const params = z.strictObject({
  /** Two seeded Gaussians, or ADVERSE patients projected to two standardized features. */
  dataset: z.enum(['synthetic', 'adverse']).default('synthetic'),
  /** ADVERSE only: the x and y features. */
  features: z.tuple([feature, feature]).default(['age', 'egfr']),
  /** Points drawn (synthetic) or patients subsampled (ADVERSE). */
  n: z.int().min(50).max(400).default(200),
  /** Seed for the sampler, so the scatter is the same on every machine. */
  seed: z.int().default(7),
  /** Fit one pooled Σ for both classes; the boundary is then a line. */
  sharedCovariance: z.boolean().default(false),
  /** Overlay the logistic-regression boundary (gradient descent) as a dashed line. */
  showLogisticRegression: z.boolean().default(false),
  /** Synthetic only: distance between the class means. */
  separation: z.number().min(0.5).max(4).default(2),
  /** Synthetic only: P(y = 1). */
  prior: z.number().min(0.05).max(0.95).default(0.5),
  /** Synthetic only: orientation of class 1's covariance in degrees (class 0 is at −20°). */
  rotation: z.number().min(-90).max(90).default(40),
  /** Let the reader drag and remove points. */
  editPoints: z.boolean().default(false),
  /** Points the reader moved: [id, x, y]. */
  movedPoints: z.array(z.tuple([z.int(), z.number(), z.number()])).default([]),
  /** Ids of points the reader removed. */
  removedPoints: z.array(z.int()).default([]),
});

export type Params = z.output<typeof params>;

export const manifest = {
  name: 'gda-fitter',
  title: 'Gaussian discriminant analysis, fitted',
  challenge:
    'Turn shared covariance on and the boundary becomes a line. Turn it off and rotate class 1 until the boundary bends into a curve that closes around one class.',
  usedIn: ['7.2', '7.3'],
  height: 640,
  params,
  fallback: renderFallback,
} satisfies WidgetManifest<typeof params>;
