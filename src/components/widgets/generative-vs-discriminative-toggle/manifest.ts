/**
 * Manifest for `generative-vs-discriminative-toggle` (VISION.md §9.3 P1;
 * lesson 6.1). Imported at build time by `manifests.ts` (no React here) so
 * `Widget.astro` can validate `<Widget name="generative-vs-discriminative-toggle" …>`
 * props. The prop names match what lesson 6.1 passes (`dataset`, `features`)
 * plus `y`, the label column.
 */
import { z } from 'zod';

import { ADVERSE_FEATURES } from '../gda-fitter/data';
import type { WidgetManifest } from '../types';
import { renderFallback } from './fallback';

const feature = z.enum(ADVERSE_FEATURES);

export const params = z.strictObject({
  /** The case dataset (ADVERSE only: two continuous features and a binary event). */
  dataset: z.enum(['adverse']).default('adverse').describe('case dataset (ADVERSE only, for now)'),
  /** The x and y features, standardized with the cohort's mean and standard deviation. */
  features: z
    .tuple([feature, feature])
    .refine(([a, b]) => a !== b, 'the two features must differ')
    .default(['age', 'egfr'])
    .describe('two ADVERSE features: age | egfr | potassium'),
  /** The label column (ADVERSE's 90-day hyperkalemia event). */
  y: z.enum(['y']).default('y').describe('label column (ADVERSE: y, the 90-day event)'),
  /** Which model is in front: p(x | y) p(y), or p(y | x). */
  model: z
    .enum(['generative', 'discriminative'])
    .default('generative')
    .describe('generative p(x|y)p(y) or discriminative p(y|x)'),
  /** π = p(y = 1) used by the generative model's Bayes rule. */
  prior: z
    .number()
    .min(0.01)
    .max(0.99)
    .default(0.06)
    .describe('prior p(y = 1) of the generative model'),
  /** One pooled Σ for both class-conditionals (a linear Bayes boundary). */
  sharedCovariance: z.boolean().default(true).describe('pooled Σ: linear Bayes boundary'),
  /** Draw the other model's boundary dashed for comparison. */
  showOther: z.boolean().default(true).describe("draw the other model's boundary dashed"),
  /** Patients subsampled from the cohort. */
  n: z.int().min(100).max(1000).default(600).describe('patients subsampled (seeded)'),
  /** Seed for the subsample. */
  seed: z.int().default(7).describe('seed of the subsample'),
});

export type Params = z.output<typeof params>;

export const manifest = {
  name: 'generative-vs-discriminative-toggle',
  title: 'Generative or discriminative: who listens to the prior',
  challenge:
    'Slide the prior p(y = 1) from 0.06 up to 0.5. Which way does the generative boundary move, and how many more patients does it flag? Switch to the discriminative model and slide again.',
  usedIn: ['6.1'],
  height: 700,
  params,
  fallback: renderFallback,
} satisfies WidgetManifest<typeof params>;
